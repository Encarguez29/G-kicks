import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching orders from MySQL database...')
    
    // Check authentication using JWT token
    let token = request.cookies.get('auth-token')?.value
    
    // If no cookie token, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      console.log('❌ Orders API: No token provided')
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    // Verify token
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      console.log('❌ Orders API: Invalid token')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    // Check if user has admin/staff role
    const userEmail = decoded.email
    console.log('🔍 Orders API: Checking admin status for:', userEmail)
    
    try {
      const adminCheck = await executeQuery(
        'SELECT role FROM admin_users WHERE email = ? AND is_active = 1',
        [userEmail]
      )
      
      const isLegacyAdmin = userEmail === 'gkcksdmn@gmail.com'
      const hasAdminAccess = (adminCheck && Array.isArray(adminCheck) && adminCheck.length > 0) || isLegacyAdmin
      
      if (!hasAdminAccess) {
        console.log('❌ Orders API: User does not have admin access:', userEmail)
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        )
      }
      
      console.log('✅ Orders API: User has admin access:', userEmail)
    } catch (error) {
      console.error('❌ Orders API: Error checking admin status:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    
    // Fetch orders with available information
    const orders = await executeQuery(`
      SELECT 
        o.id,
        o.order_number,
        o.customer_email,
        o.total_amount as total,
        o.status,
        o.payment_status,
        o.payment_method,
        o.payment_screenshot,
        o.shipping_address,
        o.created_at,
        o.updated_at
      FROM orders o
      ORDER BY o.created_at DESC
    `) as any[]

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await executeQuery(
          `SELECT 
            oi.id,
            oi.quantity,
            oi.price,
            p.name,
            p.brand,
            p.image_url as image
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?`,
          [order.id]
        ) as any[]

        // Process items with proper number conversion
        const processedItems = items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))

        return {
          ...order,
          // Convert numeric fields to proper numbers
          total: Number(order.total || 0),
          // Parse shipping address if it's JSON, otherwise use as string
          shippingAddress: order.shipping_address ? 
            (order.shipping_address.startsWith('{') ? JSON.parse(order.shipping_address) : order.shipping_address) 
            : null,
          // Use customer information from orders table
          customerName: order.customer_email || 'Unknown Customer',
          customerEmail: order.customer_email || 'No email provided',
          // Map payment fields to match frontend interface
          paymentMethod: order.payment_method,
          // Add items
          items: processedItems
        }
      })
    )
    
    console.log(`✅ API: Successfully returned ${ordersWithItems.length} orders with complete details`)
    
    return NextResponse.json(ordersWithItems)
  } catch (error) {
    console.error('❌ API: Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication using JWT token
    let token = request.cookies.get('auth-token')?.value
    
    // If no cookie token, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    // Verify token
    try {
      jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId, status } = await request.json()
    
    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      )
    }

    // Update order status
    await executeQuery(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    )

    console.log(`✅ API: Updated order ${orderId} status to ${status}`)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}