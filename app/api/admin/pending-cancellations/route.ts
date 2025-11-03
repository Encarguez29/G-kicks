import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

interface JWTPayload {
  userId: number
  email: string
  role: string
}

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('auth-token')?.value || null
    const authHeader = request.headers.get('authorization')
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    // Verify JWT token and check admin role
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    if (!decoded.userId || decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all pending cancellation requests
    const pendingCancellationsQuery = `
      SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.status,
        o.cancellation_reason,
        o.cancellation_requested_at,
        o.created_at,
        o.updated_at,
        u.email as customer_email,
        u.first_name,
        u.last_name,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'pending_cancellation'
      GROUP BY o.id, o.user_id, o.total_amount, o.status, o.cancellation_reason, 
               o.cancellation_requested_at, o.created_at, o.updated_at, 
               u.email, u.first_name, u.last_name
      ORDER BY o.cancellation_requested_at DESC
    `
    
    const pendingCancellations = await executeQuery(pendingCancellationsQuery, []) as any[]

    // Get order items for each pending cancellation for more details
    const cancellationsWithItems = await Promise.all(
      pendingCancellations.map(async (order) => {
        const itemsQuery = `
          SELECT 
            oi.product_id,
            oi.quantity,
            oi.price,
            oi.size,
            oi.color,
            p.name as product_name,
            p.image_url
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `
        const items = await executeQuery(itemsQuery, [order.id]) as any[]
        
        return {
          ...order,
          items: items
        }
      })
    )

    return NextResponse.json(
      {
        pendingCancellations: cancellationsWithItems,
        count: cancellationsWithItems.length
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Get pending cancellations error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const message = (error as any)?.message || 'Failed to fetch pending cancellations'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}