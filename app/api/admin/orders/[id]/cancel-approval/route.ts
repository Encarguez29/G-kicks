import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication'

interface JWTPayload {
  userId: number
  email: string
  role: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from Authorization header (frontend sends Bearer token)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    // Verify JWT token and check admin/staff role
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userEmail = decoded.email || decoded.userEmail
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      )
    }

    // Check if user is admin or staff (more flexible than just admin)
    const adminCheck = await executeQuery(
      'SELECT email, role FROM admin_users WHERE email = ?',
      [userEmail]
    ) as any[]

    const legacyAdminCheck = await executeQuery(
      'SELECT email, is_admin FROM users WHERE email = ? AND is_admin = 1',
      [userEmail]
    ) as any[]

    const isStaffUser = userEmail === 'gkicksstaff@gmail.com'
    const isLegacyAdmin = legacyAdminCheck.length > 0
    const isAdminUser = adminCheck.length > 0

    if (!isAdminUser && !isLegacyAdmin && !isStaffUser) {
      return NextResponse.json(
        { error: 'Admin or staff access required' },
        { status: 403 }
      )
    }

    const { id: orderId } = await params
    const orderIdNum = Number(orderId)
    if (Number.isNaN(orderIdNum)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    // Get request body
    const body = await request.json()
    const { action, adminNote } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Check if the order exists and is pending cancellation
    const orderQuery = `
      SELECT id, user_id, status, cancellation_reason, cancellation_requested_at
      FROM orders 
      WHERE id = ?
    `
    const orderRows = await executeQuery(orderQuery, [orderIdNum])
    const orders = orderRows as any[]

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orders[0]

    if (order.status !== 'pending_cancellation') {
      return NextResponse.json(
        { error: 'Order is not pending cancellation approval' },
        { status: 400 }
      )
    }

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')

    if (action === 'approve') {
      // Approve cancellation - cancel the order and restore stock
      
      // Get order items to restore stock
      const orderItemsQuery = `
        SELECT product_id, quantity, size, color 
        FROM order_items 
        WHERE order_id = ?
      `
      const orderItems = await executeQuery(orderItemsQuery, [orderIdNum]) as any[]

      // Restore stock for each order item
      for (const item of orderItems) {
        try {
          // Get current product data
          const productResult = await executeQuery(
            'SELECT variants, stock_quantity FROM products WHERE id = ?',
            [item.product_id]
          ) as any[]

          if (productResult.length === 0) {
            console.warn(`Product ${item.product_id} not found, skipping stock restoration`)
            continue
          }

          const product = productResult[0]
          let variants: Record<string, Record<string, number>>
          
          try {
            variants = product.variants ? JSON.parse(product.variants) : {}
          } catch (e) {
            console.warn(`Failed to parse variants for product ${item.product_id}:`, e)
            variants = {}
          }

          // Restore stock to variants
          if (!variants[item.color]) variants[item.color] = {}
          const currentStock = variants[item.color][item.size] || 0
          const restoredStock = currentStock + item.quantity
          variants[item.color][item.size] = restoredStock

          // Calculate new total stock
          let totalStock = 0
          Object.values(variants).forEach((sizeStocks) => {
            const stocks = sizeStocks as Record<string, number>
            totalStock += Object.values(stocks).reduce((sum, qty) => sum + qty, 0)
          })

          // Update database with restored stock
          await executeQuery(
            'UPDATE products SET variants = ?, stock_quantity = ?, updated_at = ? WHERE id = ?',
            [JSON.stringify(variants), totalStock, currentTimestamp, item.product_id]
          )

          console.log(`✅ Restored stock for product ${item.product_id}: ${item.color} ${item.size} +${item.quantity} (now ${restoredStock})`)
        } catch (error) {
          console.error(`❌ Failed to restore stock for product ${item.product_id}:`, error)
          // Continue with other items even if one fails
        }
      }

      // Update order status to cancelled
      const updateQuery = `
        UPDATE orders 
        SET status = 'cancelled', 
            admin_note = ?,
            updated_at = ? 
        WHERE id = ? AND status = 'pending_cancellation'
      `
      await executeQuery(updateQuery, [
        adminNote || 'Cancellation approved by admin',
        currentTimestamp,
        orderIdNum
      ])

      return NextResponse.json(
        { 
          message: 'Cancellation approved successfully. Order has been cancelled and stock restored.',
          orderId: orderId,
          status: 'cancelled',
          action: 'approved',
          stockRestored: orderItems.length
        },
        { status: 200 }
      )

    } else {
      // Reject cancellation - revert to previous status (assuming it was 'processing' or 'pending')
      // We'll set it back to 'processing' as a safe default
      const updateQuery = `
        UPDATE orders 
        SET status = 'processing', 
            admin_note = ?,
            cancellation_requested_at = NULL,
            cancellation_reason = NULL,
            updated_at = ? 
        WHERE id = ? AND status = 'pending_cancellation'
      `
      await executeQuery(updateQuery, [
        adminNote || 'Cancellation request rejected by admin',
        currentTimestamp,
        orderIdNum
      ])

      return NextResponse.json(
        { 
          message: 'Cancellation request rejected. Order status restored to processing.',
          orderId: orderId,
          status: 'processing',
          action: 'rejected'
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('❌ Cancel approval error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const message = (error as any)?.message || 'Failed to process cancellation approval'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}