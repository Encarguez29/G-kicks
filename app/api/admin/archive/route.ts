import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
}

async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    return connection
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to database')
  }
}

export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null

  try {
    console.log('🔍 Archive API: Fetching archived items...')
    
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
      console.log('❌ Archive API: No token provided')
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
      console.log('❌ Archive API: Invalid token')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    // Check if user has admin/staff role
    const userEmail = decoded.email
    console.log('🔍 Archive API: Checking admin status for:', userEmail)
    
    connection = await getConnection()
    
    const [adminCheck] = await connection.execute(
      'SELECT role FROM admin_users WHERE email = ? AND is_active = 1',
      [userEmail]
    ) as any[]
    
    const isLegacyAdmin = userEmail === 'gkcksdmn@gmail.com'
    const isStaffUser = userEmail === 'gkicksstaff@gmail.com'
    
    if (adminCheck.length === 0 && !isLegacyAdmin && !isStaffUser) {
      console.log('❌ Archive API: User not found in admin_users or not authorized')
      return NextResponse.json(
        { error: 'Access denied. Admin or staff role required.' },
        { status: 403 }
      )
    }
    
    const userRole = adminCheck.length > 0 ? adminCheck[0].role : (isLegacyAdmin ? 'admin' : 'staff')
    console.log('✅ Archive API: Access granted for role:', userRole)

    // Get archived products (soft deleted)
    const [archivedProducts] = await connection.execute(`
      SELECT 
        id,
        name,
        'product' as type,
        updated_at as archived_at,
        'System' as archived_by,
        'Product deleted' as reason,
        JSON_OBJECT(
          'brand', brand,
          'price', price,
          'sku', sku,
          'stock_quantity', stock_quantity
        ) as details
      FROM products 
      WHERE is_deleted = 1
      ORDER BY updated_at DESC
    `)

    // Get archived orders (if they have a deleted status or flag)
    const [archivedOrders] = await connection.execute(`
      SELECT 
        id,
        CONCAT('Order #', id) as name,
        'order' as type,
        updated_at as archived_at,
        'System' as archived_by,
        CASE 
          WHEN status = 'cancelled' THEN 'Order cancelled'
          ELSE 'Order archived'
        END as reason,
        JSON_OBJECT(
          'total_amount', total_amount,
          'status', status,
          'customer_email', customer_email
        ) as details
      FROM orders 
      WHERE status IN ('cancelled', 'refunded')
      ORDER BY updated_at DESC
    `)

    // Get archived users (inactive users from users table)
    const [archivedUsers] = await connection.execute(`
      SELECT 
        id,
        CONCAT(first_name, ' ', last_name, ' (', email, ')') as name,
        'user' as type,
        updated_at as archived_at,
        'System' as archived_by,
        'User account archived' as reason,
        JSON_OBJECT(
          'email', email,
          'first_name', first_name,
          'last_name', last_name,
          'phone', phone,
          'is_admin', is_admin
        ) as details
      FROM users 
      WHERE is_active = 0
      ORDER BY updated_at DESC
    `)

    // Get archived carousel slides
    const [archivedCarousels] = await connection.execute(`
      SELECT 
        id,
        title as name,
        'carousel' as type,
        updated_at as archived_at,
        'System' as archived_by,
        'Carousel slide archived' as reason,
        JSON_OBJECT(
          'title', title,
          'subtitle', subtitle,
          'cta_text', ctaText,
          'image_url', image
        ) as details
      FROM carousel_slides 
      WHERE is_archived = 1
      ORDER BY updated_at DESC
    `)

    // Get archived support conversations (status = 'closed')
    const [archivedMessages] = await connection.execute(`
      SELECT 
        id,
        CONCAT('Conversation #', id, ' - ', COALESCE(subject, 'Support Request')) as name,
        'message' as type,
        updated_at as archived_at,
        'System' as archived_by,
        'Conversation closed' as reason,
        JSON_OBJECT(
          'user_email', user_email,
          'user_name', COALESCE(user_name, ''),
          'subject', COALESCE(subject, 'Support Request'),
          'status', status,
          'last_message_at', last_message_at
        ) as details
      FROM support_conversations
      WHERE status = 'closed'
      ORDER BY updated_at DESC
    `)

    // Combine all archived items
    const allArchivedItems = [
      ...(archivedProducts as any[]),
      ...(archivedOrders as any[]),
      ...(archivedUsers as any[]),
      ...(archivedCarousels as any[]),
      ...(archivedMessages as any[])
    ]

    // Sort by archived_at date (most recent first)
    allArchivedItems.sort((a, b) => {
      const dateA = new Date(a.archived_at).getTime()
      const dateB = new Date(b.archived_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      items: allArchivedItems,
      total: allArchivedItems.length,
      breakdown: {
        products: (archivedProducts as any[]).length,
        orders: (archivedOrders as any[]).length,
        users: (archivedUsers as any[]).length,
        carousel: (archivedCarousels as any[]).length,
        messages: (archivedMessages as any[]).length
      }
    })

  } catch (error) {
    console.error('Error fetching archived items:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch archived items',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}