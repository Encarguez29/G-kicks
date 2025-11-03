import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ResultSetHeader } from 'mysql2'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId = null
    let isAuthenticated = false

    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, JWT_SECRET) as any
        userId = decoded.userId
        isAuthenticated = true
        console.log('✅ Delivered API: JWT authentication successful for user:', userId)
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userId = (session.user as any).id
        isAuthenticated = true
        console.log('✅ Delivered API: Session authentication successful for user:', userId)
      }
    }

    if (!isAuthenticated || !userId) {
      console.log('❌ Delivered API: No valid authentication found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const orderId = resolvedParams.id

    // Verify order belongs to user and is in shipped status
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = "shipped"',
      [orderId, userId]
    ) as any[]

    if (orders.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found or not eligible for delivery confirmation' 
      }, { status: 404 })
    }

    const order = orders[0]

    // Update order status to delivered
    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.execute(
      'UPDATE orders SET status = "delivered", delivered_at = ?, updated_at = ? WHERE id = ?',
      [currentTimestamp, currentTimestamp, orderId]
    )

    // Record delivery confirmation
    await db.execute(
      `INSERT INTO delivery_confirmations (order_id, user_id, confirmed_at, confirmation_method, ip_address, user_agent) 
       VALUES (?, ?, ?, 'customer_portal', ?, ?)`,
      [
        orderId,
        userId,
        currentTimestamp,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    // Create notification for admin/staff
    await db.execute(
      `INSERT INTO delivery_notifications (order_id, user_id, notification_type, title, message, email_sent) 
       VALUES (?, ?, 'delivered', ?, ?, FALSE)`,
      [
        orderId,
        userId,
        'Order Delivered',
        `Order #${order.order_number} has been confirmed as delivered by the customer.`
      ]
    )

    // Send email notification to admin/staff
    try {
      const { sendDeliveryConfirmationEmail } = await import('@/lib/email-service')
      
      // Get admin emails (you might want to configure this differently)
      const adminEmail = process.env.ADMIN_EMAIL || 'kurab1983@gmail.com'
      
      // Get customer name for the email
      const [userDetails] = await db.execute(
        'SELECT name FROM users WHERE id = ?',
        [userId]
      ) as any[]
      
      const customerName = userDetails.length > 0 ? userDetails[0].name : 'Customer'
      
      const success = await sendDeliveryConfirmationEmail(
        adminEmail,
        order.order_number,
        customerName
      )
      
      if (success) {
        const emailTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
        await db.execute(
          'UPDATE delivery_notifications SET email_sent = TRUE, email_sent_at = ? WHERE order_id = ? AND notification_type = "delivered"',
          [emailTimestamp, orderId]
        )
      }
    } catch (emailError) {
      console.error('Failed to send delivery confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      message: 'Order marked as delivered successfully. Admin and staff have been notified via email.' 
    })

  } catch (error) {
    console.error('Error marking order as delivered:', error)
    return NextResponse.json({ 
      error: 'Failed to mark order as delivered' 
    }, { status: 500 })
  }
}