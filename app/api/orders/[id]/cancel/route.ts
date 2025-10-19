import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

interface JWTPayload {
  userId: number
  email: string
  role: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    if (!decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    const userIdNum = Number(decoded.userId)
    if (Number.isNaN(userIdNum)) {
      return NextResponse.json(
        { error: 'Invalid user identifier' },
        { status: 401 }
      )
    }

    const { id: orderId } = params
    const orderIdNum = Number(orderId)
    if (Number.isNaN(orderIdNum)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    // First, check if the order exists and belongs to the user
    const orderQuery = `
      SELECT id, user_id, status 
      FROM orders 
      WHERE id = ? AND user_id = ?
    `
    const orderRows = await executeQuery(orderQuery, [orderIdNum, userIdNum])
    const orders = orderRows as any[]

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      )
    }

    const order = orders[0]

    // Check if order can be cancelled (only pending or processing orders)
    if (order.status !== 'pending' && order.status !== 'processing') {
      return NextResponse.json(
        { error: 'Order cannot be cancelled. Only pending or processing orders can be cancelled.' },
        { status: 400 }
      )
    }

    // Update order status to cancelled
    const updateQuery = `
      UPDATE orders 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ? AND status IN ('pending', 'processing')
    `
    const updateResult = await executeQuery(updateQuery, [orderIdNum, userIdNum]) as any

    if (updateResult && typeof updateResult.affectedRows === 'number' && updateResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Order cannot be cancelled or not found' },
        { status: 400 }
      )
    }

    // Remove duplicate update call
    // Update already executed above; no second call needed

    return NextResponse.json(
      { 
        message: 'Order cancelled successfully',
        orderId: orderId,
        status: 'cancelled'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Cancel order error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Surface error detail to help debug
    const message = (error as any)?.message || 'Failed to cancel order'
    return NextResponse.json(
      { error: message, message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params })
}