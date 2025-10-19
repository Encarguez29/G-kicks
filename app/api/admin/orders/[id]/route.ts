import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

interface Order extends RowDataPacket {
  id: string
  customer_email: string
  customer_phone: string
  shipping_address: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function PATCH(
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

    const { status } = await request.json()
    const { id: orderId } = await params

    if (!status || !['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update order status
    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If order is marked as delivered, automatically mark notification as viewed
    if (status === 'delivered') {
      try {
        // Get session to get admin user ID
        const session = await getServerSession(authOptions)
        if (session?.user && (session.user as any).id) {
          await db.execute(
            'INSERT IGNORE INTO notification_views (admin_user_id, order_id) VALUES (?, ?)',
            [(session.user as any).id, orderId]
          )
          console.log(`✅ Automatically marked notification as viewed for delivered order ${orderId}`)
        }
      } catch (viewError) {
        console.error('Error marking notification as viewed:', viewError)
        // Don't fail the order update if notification marking fails
      }
    }

    // Fetch updated order with all necessary fields
    const [orders] = await db.execute<Order[]>(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    )

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orders[0]
    
    // Fetch order items
    const [orderItems] = await db.execute(
      'SELECT oi.*, p.name as product_name, p.image_url FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    ) as any[]
    
    // Format the response to match the expected Order interface
    const formattedOrder = {
      id: order.id,
      customerName: order.customer_email,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress: order.shipping_address ? JSON.parse(order.shipping_address) : null,
      total: order.total_amount,
      paymentMethod: order.payment_method || '',
      payment_screenshot: order.payment_screenshot,
      trackingNumber: order.tracking_number,
      status: order.status,
      orderDate: order.created_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: orderItems.map((item: any) => ({
        name: item.product_name || item.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        image: item.image_url
      }))
    }

    return NextResponse.json(formattedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for JWT token in Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')
    let token = null
    let userEmail = null
    let isAuthenticated = false
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
      token = cookies['auth-token']
    }
    
    // Verify JWT token if present
    if (token) {
      try {
        const jwt = require('jsonwebtoken')
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
        const decoded = jwt.verify(token, JWT_SECRET) as any
        
        userEmail = decoded.email
        isAuthenticated = true
        
        // Check if user has admin or staff permissions
        if (decoded.role !== 'admin' && decoded.role !== 'staff') {
          // Also check for specific authorized emails
          const authorizedEmails = ['gkcksdmn@gmail.com', 'gkicksstaff@gmail.com']
          if (!authorizedEmails.includes(userEmail)) {
            return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
          }
        }
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError)
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    }
    
    // Fallback to session check if no valid JWT token
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
      }
      
      userEmail = session.user.email
      
      // Check if user has admin or staff access
      const authorizedEmails = ['gkcksdmn@gmail.com', 'gkicksstaff@gmail.com']
      if (!authorizedEmails.includes(userEmail)) {
        return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
      }
      
      isAuthenticated = true
    }
    
    console.log('🔐 Archive request authorized for user:', userEmail)

    const { id: orderId } = await params

    console.log('🗑️ API: Archiving order:', orderId)

    // Archive the order by setting status to 'cancelled' instead of permanently deleting
    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', orderId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('✅ API: Order archived successfully:', orderId)

    return NextResponse.json({
      success: true,
      message: 'Order archived successfully'
    })
  } catch (error) {
    console.error('❌ API: Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}