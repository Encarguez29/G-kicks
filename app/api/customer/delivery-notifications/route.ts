import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface DecodedToken {
  userId: number
  email: string
  role: string
}

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: DecodedToken
    try {
      decoded = jwt.verify(token, JWT_SECRET) as DecodedToken
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    // Fetch delivery notifications for the customer
    const notifications = await executeQuery(`
      SELECT 
        dn.id,
        dn.order_id,
        o.order_number,
        dn.notification_type,
        dn.title,
        dn.message,
        dn.created_at,
        dn.is_read,
        o.status as order_status,
        o.total_amount,
        o.shipped_at
      FROM delivery_notifications dn
      JOIN orders o ON dn.order_id = o.id
      WHERE o.user_id = ?
      ORDER BY dn.created_at DESC
      LIMIT 50
    `, [userId])

    // Count unread notifications
    const unreadResult = await executeQuery(`
      SELECT COUNT(*) as count
      FROM delivery_notifications dn
      JOIN orders o ON dn.order_id = o.id
      WHERE o.user_id = ? AND dn.is_read = false
    `, [userId])

    const unreadCount = unreadResult[0]?.count || 0

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    })

  } catch (error) {
    console.error('Error fetching customer delivery notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: DecodedToken
    try {
      decoded = jwt.verify(token, JWT_SECRET) as DecodedToken
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decoded.userId
    const { notificationIds } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification IDs' },
        { status: 400 }
      )
    }

    // Mark notifications as read (only for notifications belonging to the user's orders)
    const placeholders = notificationIds.map(() => '?').join(',')
    await executeQuery(`
      UPDATE delivery_notifications dn
      JOIN orders o ON dn.order_id = o.id
      SET dn.is_read = true
      WHERE dn.id IN (${placeholders}) AND o.user_id = ?
    `, [...notificationIds, userId])

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    })

  } catch (error) {
    console.error('Error marking customer delivery notifications as read:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}