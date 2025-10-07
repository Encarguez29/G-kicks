import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/mysql';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: NextRequest) {
  try {
    // Accept JWT token (cookie or Authorization header), same as GET notifications route
    let token = request.cookies.get('auth-token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Resolve admin user id from admin_users or legacy users
    let adminUserId: number | null = null;
    const adminUserResult = await executeQuery(
      'SELECT id FROM admin_users WHERE email = ? AND is_active = 1',
      [decoded.email]
    ) as RowDataPacket[];

    if (adminUserResult.length > 0) {
      adminUserId = adminUserResult[0].id as number;
    } else {
      const legacyAdminResult = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND is_admin = 1',
        [decoded.email]
      ) as RowDataPacket[];
      if (legacyAdminResult.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Not an admin' },
          { status: 401 }
        );
      }
      adminUserId = legacyAdminResult[0].id as number;
    }

    const { orderIds } = await request.json();
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order IDs are required' },
        { status: 400 }
      );
    }

    console.log(`🔔 API: Marking ${orderIds.length} notifications as viewed for admin user ${adminUserId}`);

    // Insert viewed records for each order (using INSERT IGNORE to avoid duplicates)
    const values = orderIds.map((orderId: number) => `(${adminUserId}, ${orderId})`).join(', ');
    const insertSQL = `
      INSERT IGNORE INTO notification_views (admin_user_id, order_id)
      VALUES ${values}
    `;
    await executeQuery(insertSQL, []);

    console.log(`✅ API: Successfully marked ${orderIds.length} notifications as viewed`);
    return NextResponse.json({
      success: true,
      message: `Marked ${orderIds.length} notifications as viewed`
    });
  } catch (error) {
    console.error('❌ API: Error marking notifications as viewed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as viewed' },
      { status: 500 }
    );
  }
}