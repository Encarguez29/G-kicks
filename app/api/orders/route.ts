import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { executeQuery } from '../../../lib/database/mysql'
import { sendOrderReceipt, sendStaffNotification } from '@/lib/email-service'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚫 ORDERS: No valid authorization header found')
      return null
    }

    const token = authHeader.substring(7)
    console.log('🔍 ORDERS: Token received:', token.substring(0, 50) + '...')
    console.log('🔍 ORDERS: Token length:', token.length)
    console.log('🔍 ORDERS: Token parts:', token.split('.').length)
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    console.log('✅ ORDERS: Token verified successfully for user:', decoded.userId)
    return { id: decoded.userId, email: decoded.email }
  } catch (error) {
    console.error('❌ ORDERS: Token verification failed:', error)
    console.error('❌ ORDERS: Token that failed:', authHeader?.substring(7, 57) + '...')
    return null
  }
}

// GET - Fetch user orders
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔍 API: Fetching orders for user:', user.id)
    
    // Fetch orders with proper field mapping
    const orders = await executeQuery(
      `SELECT 
        id,
        order_number,
        customer_email,
        status,
        payment_status,
        payment_method,
        payment_screenshot,
        subtotal,
        tax_amount,
        shipping_amount,
        discount_amount,
        total_amount as total,
        shipping_address,
        created_at,
        updated_at
      FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC`,
      [user.id]
    ) as any[]

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await executeQuery(
          `SELECT 
            oi.id,
            oi.quantity,
            oi.price,
            oi.size,
            oi.color,
            COALESCE(oi.product_name, p.name) as name,
            p.brand,
            p.image_url
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?`,
          [order.id]
        ) as any[]

        // Convert numeric fields to proper numbers
        const processedItems = items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))

        return {
          ...order,
          // Convert numeric fields to proper numbers
          subtotal: Number(order.subtotal),
          tax_amount: Number(order.tax_amount),
          shipping_amount: Number(order.shipping_amount),
          discount_amount: Number(order.discount_amount),
          total: Number(order.total),
          shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
          // Map payment fields to match frontend interface
          paymentMethod: order.payment_method,
          items: processedItems
        }
      })
    )

    console.log(`✅ API: Successfully fetched ${ordersWithItems.length} orders`)
    return NextResponse.json(ordersWithItems)

  } catch (error) {
    console.error('❌ API: Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      items,
      total,
      customer_email,
      shipping_address,
      payment_method,
      payment_screenshot,
      status = 'pending'
    } = body

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order items are required' },
        { status: 400 }
      )
    }

    if (!total || !customer_email) {
      return NextResponse.json(
        { error: 'Total amount and customer email are required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Creating new order for:', customer_email, 'User ID:', user.id)

    // Validate stock availability for all items before creating order
    for (const item of items) {
      const productResult = await executeQuery(
        'SELECT variants, stock_quantity FROM products WHERE id = ?',
        [item.product_id]
      ) as any[]

      if (!Array.isArray(productResult) || productResult.length === 0) {
        return NextResponse.json(
          { error: `Product not found: ${item.product_name}` },
          { status: 400 }
        )
      }

      const product = productResult[0] as any
      let variants: Record<string, Record<string, number>>
      
      try {
        variants = product.variants ? JSON.parse(product.variants) : {}
      } catch (e) {
        variants = {}
      }

      const availableStock = variants[item.color]?.[item.size] || 0
      
      if (availableStock < item.quantity) {
        return NextResponse.json(
          { 
            error: 'Insufficient stock', 
            message: `Only ${availableStock} items available for ${item.product_name} (${item.color}, ${item.size})`,
            product: item.product_name,
            color: item.color,
            size: item.size,
            availableStock,
            requestedQuantity: item.quantity
          },
          { status: 400 }
        )
      }
    }

    // Process stock reduction for all items
    for (const item of items) {
      const stockResponse = await fetch(`${request.nextUrl.origin}/api/products/stock?id=${item.product_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('authorization') || ''
        },
        body: JSON.stringify({
          color: item.color,
          size: item.size,
          quantity: item.quantity
        })
      })

      if (!stockResponse.ok) {
        const stockError = await stockResponse.json()
        return NextResponse.json(
          { 
            error: 'Stock update failed', 
            message: stockError.message || `Failed to update stock for ${item.product_name}`,
            product: item.product_name
          },
          { status: 400 }
        )
      }
    }

    // Generate order number
    const orderNumber = `GK${Date.now()}`

    // Calculate order totals
    const subtotal = Number(total) || 0
    const taxAmount = subtotal * 0.12 // 12% VAT
    const shippingAmount = subtotal > 2000 ? 0 : 150 // Free shipping over ₱2000
    const discountAmount = 0
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount

    // Create the order
    const result = await executeQuery(
      `INSERT INTO orders (
         user_id, customer_email, order_number, status, subtotal, tax_amount, 
         shipping_amount, discount_amount, total_amount,
         shipping_address, payment_method, payment_screenshot
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        customer_email,
        orderNumber,
        status || 'pending',
        subtotal,
        taxAmount,
        shippingAmount,
        discountAmount,
        totalAmount,
        JSON.stringify(shipping_address || {}),
        payment_method || null,
        payment_screenshot || null
      ]
    ) as any

    const orderId = (result as any).insertId

    // Insert order items
    for (const item of items) {
      // Get product SKU from database
      const productResult = await executeQuery(
        'SELECT sku FROM products WHERE id = ?',
        [item.product_id]
      ) as any[]
      
      const productSku = productResult[0]?.sku || `SKU-${item.product_id}`
      
      await executeQuery(
        `INSERT INTO order_items (
           order_id, product_id, product_name, product_sku, quantity, size, color, unit_price, total_price, price, total
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.product_name || 'Unknown Product',
          productSku,
          item.quantity,
          item.size || null,
          item.color || null,
          item.price,
          item.price * item.quantity,
          item.price,
          item.price * item.quantity
        ]
      )
    }

    // Fetch the created order with items
    const newOrder = await executeQuery(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    ) as any[]

    const orderItems = await executeQuery(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    ) as any[]

    const order = newOrder[0] as any
    // Parse JSON fields and add items
    const parsedOrder = {
      ...order,
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
      items: orderItems
    }

    // Send order receipt email
    try {
      const emailData = {
        orderNumber: order.order_number,
        customerEmail: customer_email,
        customerName: shipping_address?.fullName || 'Valued Customer',
        items: items.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color
        })),
        subtotal: total,
        tax: 0, // Add tax calculation if needed
        shipping: 0, // Add shipping calculation if needed
        total: total,
        shippingAddress: {
          fullName: shipping_address?.fullName || '',
          address: shipping_address?.address || '',
          city: shipping_address?.city || '',
          state: shipping_address?.state || '',
          postalCode: shipping_address?.postalCode || '',
          country: shipping_address?.country || 'Philippines'
        },
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      const emailSent = await sendOrderReceipt(emailData)
      if (emailSent) {
        console.log('✅ API: Order receipt email sent successfully to:', customer_email)
      } else {
        console.log('⚠️ API: Failed to send order receipt email, but order was created successfully')
      }
    } catch (emailError) {
      console.error('❌ API: Error sending order receipt email:', emailError)
      // Don't fail the order creation if email fails
    }

    // Send staff notification email
    try {
      const staffNotificationData = {
        orderNumber: orderNumber,
        customerName: customer_email || 'Guest Customer',
        customerEmail: customer_email || 'No email provided',
        total: total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color
        }))
      }

      const staffNotificationSent = await sendStaffNotification(staffNotificationData)
      if (staffNotificationSent) {
        console.log('✅ API: Staff notification email sent successfully to: gkicksstaff@gmail.com')
      } else {
        console.log('⚠️ API: Failed to send staff notification email, but order was created successfully')
      }
    } catch (staffEmailError) {
      console.error('❌ API: Error sending staff notification email:', staffEmailError)
      // Don't fail the order creation if staff email fails
    }

    console.log('✅ API: Successfully created order:', orderNumber)
    return NextResponse.json(parsedOrder, { status: 201 })

  } catch (error) {
    console.error('❌ API: Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update order status
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, tracking_number } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Updating order status:', id, 'to:', status)

    const result = await executeQuery(
      `UPDATE orders 
       SET status = ?, tracking_number = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [status, tracking_number || null, id, user.id]
    ) as any

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      )
    }

    // Fetch the updated order
    const updatedOrder = await executeQuery(
      `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
      [id, user.id]
    ) as any[]

    const order = Array.isArray(updatedOrder) && updatedOrder.length > 0 ? updatedOrder[0] as any : null;
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    const parsedOrder = {
      ...order,
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
      items: order.items ? JSON.parse(order.items) : []
    }

    console.log('✅ API: Successfully updated order status')
    return NextResponse.json(parsedOrder)

  } catch (error) {
    console.error('❌ API: Error updating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}