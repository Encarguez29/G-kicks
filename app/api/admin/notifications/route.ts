import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/mysql';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

interface OrderNotification {
  id: number;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔔 API: Fetching admin notifications...');
    
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
      console.log('❌ Notifications API: No token provided');
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
      console.log('❌ Notifications API: Invalid token');
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // First check admin_users table for staff/admin roles
    let adminUserId = null;
    const adminUserResult = await executeQuery(
      'SELECT id FROM admin_users WHERE email = ? AND is_active = 1',
      [decoded.email]
    ) as RowDataPacket[];
    
    if (adminUserResult.length > 0) {
      adminUserId = adminUserResult[0].id;
      console.log('✅ Notifications API: Admin access granted for:', decoded.email);
    } else {
      // Fallback: Check users table for legacy admin users
      const legacyAdminResult = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND is_admin = 1',
        [decoded.email]
      ) as RowDataPacket[];
      
      if (legacyAdminResult.length === 0) {
        console.log('❌ Notifications API: User is not an admin:', decoded.email);
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Not an admin' },
          { status: 401 }
        );
      }
      
      adminUserId = legacyAdminResult[0].id;
      console.log('✅ Notifications API: Admin access granted for:', decoded.email);
    }
    
    // Get count of unviewed orders for this admin with actionable statuses
    const newOrdersResult = await executeQuery(
      `SELECT COUNT(*) as count FROM orders o
       LEFT JOIN notification_views nv ON o.id = nv.order_id AND nv.admin_user_id = ?
       WHERE o.status IN ('pending', 'confirmed', 'processing')
       AND nv.order_id IS NULL`,
      [adminUserId]
    ) as RowDataPacket[];
    
    const newOrdersCount = newOrdersResult[0]?.count || 0;
    
    // Get recent orders for notification dropdown (only unviewed by this admin)
    const recentOrdersResult = await executeQuery(
      `SELECT 
         o.id,
         o.order_number,
         o.customer_email,
         o.total_amount,
         o.status,
         o.created_at
       FROM orders o
       LEFT JOIN notification_views nv ON o.id = nv.order_id AND nv.admin_user_id = ?
       WHERE o.status IN ('pending', 'confirmed', 'processing')
       AND nv.order_id IS NULL
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [adminUserId]
    ) as RowDataPacket[];
    
    const recentOrders: OrderNotification[] = recentOrdersResult.map(row => ({
      id: row.id,
      order_number: row.order_number,
      customer_name: row.customer_email || 'Unknown Customer',
      total_amount: parseFloat(row.total_amount),
      status: row.status,
      created_at: row.created_at
    }));
    
    console.log(`✅ API: Found ${newOrdersCount} new orders, ${recentOrders.length} recent orders`);
    
    return NextResponse.json({
      success: true,
      newOrdersCount,
      recentOrders
    });
    
  } catch (error) {
    console.error('❌ API: Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}