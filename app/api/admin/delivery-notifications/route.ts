import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/mysql';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

interface DeliveryNotification {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  notification_type: 'shipped' | 'delivered' | 'delivery_confirmation';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚚 API: Fetching delivery notifications...');
    
    // Check authentication using JWT token
    let token = request.cookies.get('auth-token')?.value;
    
    // If no cookie token, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      console.log('❌ Delivery Notifications API: No token provided');
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.log('❌ Delivery Notifications API: Invalid token');
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Check admin access
    let adminUserId = null;
    const adminUserResult = await executeQuery(
      'SELECT id FROM admin_users WHERE email = ? AND is_active = 1',
      [decoded.email]
    ) as RowDataPacket[];
    
    if (adminUserResult.length > 0) {
      adminUserId = adminUserResult[0].id;
      console.log('✅ Delivery Notifications API: Admin access granted for:', decoded.email);
    } else {
      // Fallback: Check users table for legacy admin users
      const legacyAdminResult = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND is_admin = 1',
        [decoded.email]
      ) as RowDataPacket[];
      
      if (legacyAdminResult.length === 0) {
        console.log('❌ Delivery Notifications API: User is not an admin:', decoded.email);
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Not an admin' },
          { status: 401 }
        );
      }
      
      adminUserId = legacyAdminResult[0].id;
      console.log('✅ Delivery Notifications API: Admin access granted for:', decoded.email);
    }
    
    // Get delivery notifications with order details
    const deliveryNotificationsResult = await executeQuery(
      `SELECT 
         dn.id,
         dn.order_id,
         dn.notification_type,
         dn.title,
         dn.message,
         dn.created_at,
         dn.is_read,
         o.order_number,
         COALESCE(CONCAT(u.first_name, ' ', u.last_name), o.customer_email, 'Unknown Customer') as customer_name
       FROM delivery_notifications dn
       JOIN orders o ON dn.order_id = o.id
       LEFT JOIN users u ON dn.user_id = u.id
       ORDER BY dn.created_at DESC
       LIMIT 50`,
      []
    ) as RowDataPacket[];
    
    const deliveryNotifications: DeliveryNotification[] = deliveryNotificationsResult.map(row => ({
      id: row.id,
      order_id: row.order_id,
      order_number: row.order_number,
      customer_name: row.customer_name,
      notification_type: row.notification_type,
      title: row.title,
      message: row.message,
      created_at: row.created_at,
      is_read: Boolean(row.is_read)
    }));
    
    // Count unread delivery notifications
    const unreadCountResult = await executeQuery(
      `SELECT COUNT(*) as count FROM delivery_notifications 
       WHERE is_read = FALSE`,
      []
    ) as RowDataPacket[];
    
    const unreadCount = unreadCountResult[0]?.count || 0;
    
    console.log(`✅ API: Found ${unreadCount} unread delivery notifications, ${deliveryNotifications.length} total`);
    
    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: deliveryNotifications
    });
    
  } catch (error) {
    console.error('❌ API: Error fetching delivery notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delivery notifications' },
      { status: 500 }
    );
  }
}

// Mark delivery notifications as read
export async function PATCH(request: NextRequest) {
  try {
    console.log('📖 API: Marking delivery notifications as read...');
    
    // Check authentication
    let token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const { notificationIds } = await request.json();

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification IDs' },
        { status: 400 }
      );
    }

    // Mark notifications as read
    if (notificationIds.length > 0) {
      const placeholders = notificationIds.map(() => '?').join(',');
      await executeQuery(
        `UPDATE delivery_notifications 
         SET is_read = TRUE, read_at = NOW() 
         WHERE id IN (${placeholders})`,
        notificationIds
      );
    }
    
    console.log(`✅ API: Marked ${notificationIds.length} delivery notifications as read`);
    
    return NextResponse.json({
      success: true,
      message: `Marked ${notificationIds.length} notifications as read`
    });
    
  } catch (error) {
    console.error('❌ API: Error marking delivery notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}