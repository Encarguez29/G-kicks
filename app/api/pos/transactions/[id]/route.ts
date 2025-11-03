import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// GET - Fetch specific transaction details with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const resolvedParams = await params
    
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

    const transactionId = resolvedParams.id

    // Get transaction details
    const transactionQuery = `
      SELECT 
        t.*,
        CONCAT(u.first_name, ' ', u.last_name) as cashier_name
      FROM pos_transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `

    const transactionResult = await executeQuery(transactionQuery, [transactionId]) as any[]
    
    if (!transactionResult || transactionResult.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const transaction = transactionResult[0]

    // Get transaction items
    const itemsQuery = `
      SELECT 
        ti.*,
        p.image_url,
        p.gallery_images
      FROM pos_transaction_items ti
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = ?
      ORDER BY ti.id
    `

    const items = await executeQuery(itemsQuery, [transactionId]) as any[]

    // Format items with proper image handling
    const formattedItems = items.map(item => {
      let galleryImages = []
      try {
        galleryImages = item.gallery_images ? JSON.parse(item.gallery_images) : []
      } catch (error) {
        galleryImages = []
      }

      return {
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        brand: item.brand,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price),
        image: (galleryImages.length > 0 ? galleryImages[0] : item.image_url) || 
               `/images/${item.product_name?.toLowerCase().replace(/\s+/g, "-")}.png`
      }
    })

    // Calculate totals
    const itemCount = items.length
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0)

    const response = {
      transaction: {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        customerName: transaction.customer_name,
        customerPhone: transaction.customer_phone,
        customerEmail: transaction.customer_email,
        subtotal: parseFloat(transaction.subtotal),
        taxAmount: parseFloat(transaction.tax_amount || 0),
        discountAmount: parseFloat(transaction.discount_amount || 0),
        totalAmount: parseFloat(transaction.total_amount),
        paymentMethod: transaction.payment_method,
        paymentReference: transaction.payment_reference,
        cashReceived: transaction.cash_received ? parseFloat(transaction.cash_received) : null,
        changeGiven: transaction.change_given ? parseFloat(transaction.change_given) : null,
        status: transaction.status,
        receiptNumber: transaction.receipt_number,
        notes: transaction.notes,
        transactionDate: transaction.transaction_date,
        createdAt: transaction.created_at,
        cashierName: transaction.cashier_name
      },
      items: formattedItems,
      summary: {
        itemCount,
        totalQuantity,
        subtotal,
        calculatedTotal: subtotal
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ API: Error fetching transaction details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    )
  }
}