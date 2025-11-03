import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { executeQuery } from '@/lib/database/mysql'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

interface Order extends RowDataPacket {
  id: string
  order_number: string
  customer_email: string
  customer_phone: string
  shipping_address: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
  user_id: string
  created_at: string
  updated_at: string
  delivered_at: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        userEmail = session.user.email
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin/staff role
    const adminCheck = await executeQuery(
      'SELECT role FROM admin_users WHERE email = ? AND is_active = 1',
      [userEmail]
    ) as any[]

    const isLegacyAdmin = userEmail === 'gkcksdmn@gmail.com'
    const hasAdminAccess = (adminCheck && Array.isArray(adminCheck) && adminCheck.length > 0) || isLegacyAdmin

    if (!hasAdminAccess) {
      console.log('❌ Return API: User does not have admin access:', userEmail)
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id: orderId } = await params
    const { reason } = await request.json()

    // Get order details and verify it's delivered
    const orderResult = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    ) as any[]

    if (!orderResult || orderResult.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orderResult[0] as Order

    // Validate that order is delivered before allowing return
    if (order.status !== 'delivered') {
      return NextResponse.json({ 
        error: 'Only delivered orders can be marked as returned',
        currentStatus: order.status 
      }, { status: 400 })
    }

    // Update order status to returned
    const updateResult = await executeQuery(
      'UPDATE orders SET status = ?, returned_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['returned', orderId]
    ) as any

    if (!updateResult || updateResult.affectedRows === 0) {
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
    }

    // Log the return action
    await executeQuery(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, change_reason, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [orderId, 'delivered', 'returned', userEmail, reason || 'Product returned by customer']
    )

    // Get updated order details for notification
    const updatedOrderResult = await executeQuery(
      'SELECT o.*, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?',
      [orderId]
    ) as any[]

    if (updatedOrderResult && updatedOrderResult.length > 0) {
      const orderDetail = updatedOrderResult[0]

      // Create notification for customer
      await executeQuery(
        `INSERT INTO delivery_notifications (order_id, user_id, notification_type, title, message, email_sent) 
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [
          orderId,
          orderDetail.user_id,
          'returned',
          'Order Return Confirmed',
          `Your return for order #${orderDetail.order_number} has been confirmed and processed. Thank you for your understanding.`
        ]
      )

      // Send email notification to customer
      try {
        const { sendOrderStatusUpdateEmail } = await import('@/lib/email-service')
        const success = await sendOrderStatusUpdateEmail(
          orderDetail.user_email || orderDetail.customer_email,
          orderDetail.order_number,
          'returned'
        )
        if (success) {
          await executeQuery(
            'UPDATE delivery_notifications SET email_sent = TRUE, email_sent_at = NOW() WHERE order_id = ? AND notification_type = ?',
            [orderId, 'returned']
          )
        }
      } catch (emailError) {
        console.error('Failed to send return confirmation email:', emailError)
      }
    }

    console.log(`✅ Order ${order.order_number} marked as returned by ${userEmail}`)
    
    return NextResponse.json({ 
      success: true,
      message: `Order ${order.order_number} has been marked as returned`,
      orderId: orderId,
      orderNumber: order.order_number,
      returnedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error processing return confirmation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}