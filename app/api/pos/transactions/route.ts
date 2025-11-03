import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeNonPreparedQuery } from '@/lib/database/mysql'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { generateNextOrderId } from '@/lib/order-utils'

interface POSTransactionItem {
  productId: string
  name: string
  brand: string
  price: number
  color: string
  size: string
  quantity: number
  image: string
}

interface CreateTransactionRequest {
  items: POSTransactionItem[]
  total: number
  paymentMethod: string
  customerName?: string
  paymentReference?: string
  cashReceived?: number
  changeGiven?: number
  discount?: number
  tax?: number
}

// GET - Fetch POS transactions
export async function GET(request: NextRequest) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let userRole = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        userRole = decoded.role
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to JWT in auth-token cookie
    if (!isAuthenticated) {
      const cookieToken = request.cookies.get('auth-token')?.value
      if (cookieToken) {
        try {
          const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET || 'fallback-secret') as any
          userEmail = decoded.email
          userRole = decoded.role
          isAuthenticated = true
        } catch (error) {
          console.error('Cookie JWT verification failed:', error)
        }
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (date) {
      whereClause += ' AND DATE(t.created_at) = ?'
      params.push(date)
    }

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    // Get transactions with items
    const transactionsQuery = `
      SELECT 
        t.*,
        CONCAT(u.first_name, ' ', u.last_name) as cashier_name,
        COUNT(ti.id) as item_count,
        SUM(ti.quantity) as total_quantity
      FROM pos_transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `

    const transactions = await executeQuery(transactionsQuery, [...params, limit, offset])

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM pos_transactions t
      ${whereClause}
    `
    const countResult = await executeQuery(countQuery, params) as any[]
    const total = countResult[0]?.total || 0

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('❌ API: Error fetching POS transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

// POST - Create new POS transaction
export async function POST(request: NextRequest) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let userRole = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        userRole = decoded.role
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to JWT in auth-token cookie
    if (!isAuthenticated) {
      const cookieToken = request.cookies.get('auth-token')?.value
      if (cookieToken) {
        try {
          const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET || 'fallback-secret') as any
          userEmail = decoded.email
          userRole = decoded.role
          isAuthenticated = true
        } catch (error) {
          console.error('Cookie JWT verification failed:', error)
        }
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateTransactionRequest = await request.json()
    const { items, total, paymentMethod, customerName, paymentReference, cashReceived, changeGiven } = body

    const paymentMethodNormalized = typeof paymentMethod === 'string' ? paymentMethod.toUpperCase() : paymentMethod

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (!total || total <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 })
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 400 })
    }

    // Get user ID from database using email
    let userId = 1 // Default fallback
    try {
      const userResult = await executeQuery(
        'SELECT id FROM users WHERE email = ?',
        [userEmail]
      )
      if (Array.isArray(userResult) && userResult.length > 0) {
        userId = (userResult[0] as any).id
      }
    } catch (error) {
      console.error('Error fetching user ID:', error)
    }

    // Generate unified order ID for both POS transaction and main order
    const orderNumber = await generateNextOrderId()
    const transactionId = `POS-${orderNumber}`
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Compute discount and total (server-side safety) - No VAT
    const discountAmountInput = typeof body?.discount === 'number' ? body.discount : 0
    const discountAmount = Math.max(0, Math.min(discountAmountInput, subtotal))
    const taxAmount = 0 // No VAT
    const totalAmountComputed = Number((subtotal - discountAmount).toFixed(2))

    // Start transaction
    await executeNonPreparedQuery('START TRANSACTION')

    try {
      // Insert transaction
      const insertTransactionQuery = `
        INSERT INTO pos_transactions (
          transaction_id, user_id, customer_name,
          subtotal, total_amount, payment_method,
          cash_received, change_given, receipt_number, transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const currentDate = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      const transactionResult = await executeQuery(insertTransactionQuery, [
        transactionId,
        userId,
        customerName || null,
        subtotal,
        totalAmountComputed,
        paymentMethodNormalized,
        cashReceived || null,
        changeGiven || null,
        receiptNumber,
        currentDate
      ])

      const dbTransactionId = (transactionResult as any).insertId

      // Insert transaction items
      for (const item of items) {
        const insertItemQuery = `
          INSERT INTO pos_transaction_items (
            transaction_id, product_id, product_name, brand,
            size, color, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        await executeQuery(insertItemQuery, [
          dbTransactionId,
          item.productId,
          item.name,
          item.brand,
          item.size,
          item.color,
          item.quantity,
          item.price,
          item.price * item.quantity
        ])

        // Update variant stock in product_variants table
        const updateVariantStockQuery = `
          UPDATE product_variants 
          SET stock_quantity = stock_quantity - ?
          WHERE product_id = ? AND size = ? AND color = ? AND stock_quantity >= ?
        `
        
        const variantStockResult = await executeQuery(updateVariantStockQuery, [
          item.quantity,
          item.productId,
          item.size,
          item.color,
          item.quantity
        ])

        // Also update the variants JSON field in products table
        const getProductQuery = 'SELECT variants FROM products WHERE id = ?'
        const productResult = await executeQuery(getProductQuery, [item.productId])
        
        if (Array.isArray(productResult) && productResult.length > 0) {
          let variants = {}
          try {
            variants = (productResult[0] as any).variants ? JSON.parse((productResult[0] as any).variants) : {}
          } catch (e) {
            console.warn('Failed to parse variants JSON for product', item.productId)
            variants = {}
          }
          
          // Update variant stock in JSON
          if (variants.hasOwnProperty(item.color) && typeof variants[item.color as keyof typeof variants] === 'object' && variants[item.color as keyof typeof variants]?.[item.size as keyof typeof variants[keyof typeof variants]] !== undefined) {
            const colorVariant = variants[item.color as keyof typeof variants] as Record<string, number>;
            colorVariant[item.size] = Math.max(0, colorVariant[item.size] - item.quantity);
          }
          
          // Calculate total stock from all variants
          let totalStock = 0
          Object.values(variants).forEach((sizeStocks: any) => {
            totalStock += Object.values(sizeStocks).reduce((sum: number, qty: any) => sum + (typeof qty === 'number' ? qty : 0), 0)
          })
          
          // Update products table with new variants and total stock
          const updateProductQuery = `
            UPDATE products 
            SET variants = ?, stock_quantity = ?
            WHERE id = ?
          `
          
          await executeQuery(updateProductQuery, [
            JSON.stringify(variants),
            totalStock,
            item.productId
          ])
        }

        // Check if stock was successfully deducted
        if ((variantStockResult as any).affectedRows === 0) {
          // If variant table update failed, check if we can still deduct from main stock
          const fallbackStockQuery = `
            UPDATE products 
            SET stock_quantity = stock_quantity - ?
            WHERE id = ? AND stock_quantity >= ?
          `
          
          const fallbackResult = await executeQuery(fallbackStockQuery, [
            item.quantity,
            item.productId,
            item.quantity
          ])
          
          if ((fallbackResult as any).affectedRows === 0) {
            throw new Error(`Insufficient stock for product: ${item.name} (${item.color} ${item.size})`)
          }
        }
      }

      // Update daily sales
      const updateDailySalesQuery = `
        INSERT INTO pos_daily_sales (
          sale_date, admin_user_id, total_transactions, total_items_sold,
          gross_sales, net_sales, cash_sales, card_sales, digital_wallet_sales
        ) VALUES (
          ?, ?, 1, ?, ?, ?, 
          CASE WHEN ? = 'CASH' THEN ? ELSE 0 END,
          CASE WHEN ? = 'CARD' THEN ? ELSE 0 END,
          CASE WHEN ? IN ('GCASH', 'MAYA') THEN ? ELSE 0 END
        )
        ON DUPLICATE KEY UPDATE
          total_transactions = total_transactions + 1,
          total_items_sold = total_items_sold + ?,
          gross_sales = gross_sales + ?,
          net_sales = net_sales + ?,
          cash_sales = cash_sales + CASE WHEN ? = 'CASH' THEN ? ELSE 0 END,
          card_sales = card_sales + CASE WHEN ? = 'CARD' THEN ? ELSE 0 END,
          digital_wallet_sales = digital_wallet_sales + CASE WHEN ? IN ('GCASH', 'MAYA') THEN ? ELSE 0 END,
          updated_at = ?
      `

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ') // Format: YYYY-MM-DD HH:MM:SS

      await executeQuery(updateDailySalesQuery, [
        currentDate, // sale_date
        userId, totalItems, subtotal, totalAmountComputed,
        paymentMethodNormalized, totalAmountComputed,
        paymentMethodNormalized, totalAmountComputed,
        paymentMethodNormalized, totalAmountComputed,
        totalItems, subtotal, totalAmountComputed,
        paymentMethodNormalized, totalAmountComputed,
        paymentMethodNormalized, totalAmountComputed,
        paymentMethodNormalized, totalAmountComputed,
        currentTimestamp // updated_at
      ])

      // Create corresponding entry in main orders table for synchronization
      const insertOrderQuery = `
        INSERT INTO orders (
          user_id, order_number, customer_email, order_source,
          subtotal, tax_amount, total_amount, payment_method,
          payment_status, status, notes, created_at, delivered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'delivered', ?, ?, ?)
      `

      const orderNotes = JSON.stringify({
        source: 'POS',
        pos_transaction_id: transactionId,
        receipt_number: receiptNumber,
        admin_user_id: userId,
        payment_reference: paymentReference || null
      })

      // Use POS system user ID (47) for orders table foreign key constraint
      const POS_SYSTEM_USER_ID = 47;
      
      const orderResult = await executeQuery(insertOrderQuery, [
        POS_SYSTEM_USER_ID, // Use POS system user ID for orders table foreign key
        orderNumber,
        customerName || 'POS Customer',
        'walk-in', // This is a walk-in order from the POS system
        subtotal,
        0, // tax_amount - no VAT for POS transactions
        totalAmountComputed,
        paymentMethodNormalized,
        orderNotes,
        currentTimestamp, // created_at
        currentTimestamp  // delivered_at
      ])

      const orderId = (orderResult as any).insertId

      // Create order items for the main orders table
      for (const item of items) {
        const insertOrderItemQuery = `
          INSERT INTO order_items (
            order_id, product_id, product_name,
            size, color, quantity, price
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `

        await executeQuery(insertOrderItemQuery, [
          orderId,
          item.productId,
          item.name,
          item.size,
          item.color,
          item.quantity,
          item.price
        ])
      }

      await executeNonPreparedQuery('COMMIT')

      return NextResponse.json({
        success: true,
        transactionId,
        receiptNumber,
        message: 'Transaction completed successfully'
      })

    } catch (error) {
      await executeNonPreparedQuery('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('❌ API: Error creating POS transaction:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    )
  }
}