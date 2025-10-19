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
    
    if (!token || token.trim() === '') {
      console.log('🚫 ORDERS: Empty token provided')
      return null
    }
    
    // Check if JWT_SECRET is available
    if (!JWT_SECRET) {
      console.error('❌ ORDERS: JWT_SECRET is not configured')
      return null
    }
    
    console.log('🔍 ORDERS: Token received:', token.substring(0, 50) + '...')
    console.log('🔍 ORDERS: Token length:', token.length)
    console.log('🔍 ORDERS: Token parts:', token.split('.').length)
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    console.log('✅ ORDERS: Token verified successfully for user:', decoded.userId)
    return { id: decoded.userId, email: decoded.email }
  } catch (error) {
    console.error('❌ ORDERS: Token verification failed:', error)
    console.error('❌ ORDERS: Token that failed:', authHeader?.substring(7, 57) + '...')
    console.error('❌ ORDERS: JWT_SECRET exists:', !!JWT_SECRET)
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

    const prColumnCheck = await executeQuery(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='payment_reference'"
    ) as any[]
    const hasPaymentReferenceColumn = Number(prColumnCheck[0]?.cnt || 0) > 0
    const prSelect = hasPaymentReferenceColumn ? 'payment_reference' : 'notes'

    // Fetch orders with proper field mapping
    const selectQuery = `SELECT 
        id,
        order_number,
        customer_email,
        status,
        payment_status,
        payment_method,
        payment_screenshot,
        ${prSelect} as payment_reference,
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
      ORDER BY created_at DESC`
    const orders = await executeQuery(selectQuery, [user.id]) as any[]

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

        const paymentReference = hasPaymentReferenceColumn
          ? (order.payment_reference || null)
          : (() => {
              try {
                const obj = order.payment_reference ? JSON.parse(order.payment_reference) : null
                return obj?.payment_reference || null
              } catch {
                const match = String(order.payment_reference || '').match(/payment_reference\s*:\s*([A-Za-z0-9]+)/i)
                return match?.[1] || null
              }
            })()

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
          payment_reference: paymentReference,
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
      console.error('❌ API: Unauthorized access attempt - no valid token')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to create an order' },
        { status: 401 }
      )
    }

    console.log('✅ API: Authenticated user:', user.id, user.email)

    const body = await request.json()
    const {
      items,
      total,
      customer_email,
      shipping_address,
      payment_method,
      payment_screenshot,
      payment_reference,
      status = 'pending'
    } = body

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ API: Missing or invalid items')
      return NextResponse.json(
        { error: 'Order items are required' },
        { status: 400 }
      )
    }

    if (!total || !customer_email) {
      console.error('❌ API: Missing total or customer_email')
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

    // Calculate order totals from items (not from frontend total to avoid double taxation)
    const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
    const taxAmount = subtotal * 0.12 // 12% VAT

    // Compute shipping to match cart rules (bag size + region surcharge)
    const totalQuantity = items.reduce((sum, item) => sum + ((item.quantity || 0)), 0)
    let baseShipping = 0
    if (totalQuantity <= 3) {
      baseShipping = 70
    } else if (totalQuantity <= 6) {
      baseShipping = 160
    } else {
      // For quantities > 6, use Large bag rate (up to 10)
      baseShipping = 190
    }
    const isVisMin = (shipping_address?.shipping_region || '').toLowerCase() === 'visayas/mindanao'
    const regionSurcharge = isVisMin ? 25 : 0
    const shippingAmount = baseShipping + regionSurcharge

    const discountAmount = 0
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount

    // Detect payment_reference column availability
    const prColumnCheck = await executeQuery(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='payment_reference'"
    ) as any[]
    const hasPaymentReferenceColumn = Number(prColumnCheck[0]?.cnt || 0) > 0

    // Create the order
    let insertQuery = ''
    let insertValues: any[] = []
    if (hasPaymentReferenceColumn) {
      insertQuery = `INSERT INTO orders (
         user_id, customer_email, order_number, status, subtotal, tax_amount,
         shipping_amount, discount_amount, total_amount,
         shipping_address, payment_method, payment_screenshot, payment_reference
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      insertValues = [
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
        payment_screenshot || null,
        payment_reference || null
      ]
    } else {
      insertQuery = `INSERT INTO orders (
         user_id, customer_email, order_number, status, subtotal, tax_amount,
         shipping_amount, discount_amount, total_amount,
         shipping_address, payment_method, payment_screenshot, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      insertValues = [
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
        payment_screenshot || null,
        payment_reference ? JSON.stringify({ payment_reference }) : null
      ]
    }
    const result = await executeQuery(insertQuery, insertValues) as any

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
      items: orderItems,
      payment_reference: hasPaymentReferenceColumn
        ? (order.payment_reference || null)
        : (() => {
            try {
              const obj = order.notes ? JSON.parse(order.notes) : null
              return obj?.payment_reference || null
            } catch {
              const match = String(order.notes || '').match(/payment_reference\s*:\s*([A-Za-z0-9]+)/i)
              return match?.[1] || null
            }
          })()
    }

    // Send order receipt email
    try {
      const emailData = {
        orderNumber: order.order_number,
        customerEmail: customer_email,
        customerName: (shipping_address?.fullName || 'Valued Customer'),
        items: items.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color
        })),
        // Use computed values so Tax/Shipping display correctly
        subtotal: subtotal,
        tax: taxAmount,
        shipping: shippingAmount,
        total: totalAmount,
        // Normalize shipping address keys coming from cart/profile
        shippingAddress: {
          fullName: shipping_address?.fullName || '',
          street: shipping_address?.street || shipping_address?.address || '',
          city: shipping_address?.city || '',
          province: shipping_address?.province || shipping_address?.state || '',
          zipCode: shipping_address?.zipCode || shipping_address?.postalCode || '',
          country: shipping_address?.country || 'Philippines',
          shipping_region: shipping_address?.shipping_region || 'Luzon',
          phone: shipping_address?.phone || ''
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
        total: totalAmount,
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

      const staffSent = await sendStaffNotification(staffNotificationData)
      if (staffSent) {
        console.log('✅ API: Staff notification email sent successfully')
      } else {
        console.log('⚠️ API: Failed to send staff notification email')
      }
    } catch (staffError) {
      console.error('❌ API: Error sending staff notification email:', staffError)
    }

    // Return created order payload
    return NextResponse.json(parsedOrder)
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