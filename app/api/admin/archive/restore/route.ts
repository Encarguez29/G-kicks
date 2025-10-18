import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
}

const JWT_SECRET = process.env.JWT_SECRET || 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication'

async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    return connection
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to database')
  }
}

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null

  try {
    console.log('🔄 Restore API: Starting restore request')
    
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      console.log('❌ Restore API: No authentication token provided')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: any
    try {
      console.log('🔍 Restore API: Verifying JWT token...')
      console.log('🔍 Restore API: JWT_SECRET preview:', JWT_SECRET.substring(0, 30) + '...')
      console.log('🔍 Restore API: Token preview:', token.substring(0, 50) + '...')
      decoded = jwt.verify(token, JWT_SECRET)
      console.log('✅ Restore API: JWT token verified for user:', decoded.email)
    } catch (error) {
      console.log('❌ Restore API: Invalid JWT token:', (error as Error).message)
      console.log('❌ Restore API: JWT verification error details:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    connection = await getConnection()
    console.log('✅ Restore API: Database connection established')

    // Enhanced authentication check
    const userEmail = decoded.email
    console.log('🔍 Restore API: Checking authorization for user:', userEmail)

    // Check admin_users table
    const [adminCheck] = await connection.execute(
      'SELECT email, role FROM admin_users WHERE email = ?',
      [userEmail]
    ) as any[]

    // Check legacy admin in users table
    const [legacyAdminCheck] = await connection.execute(
      'SELECT email, is_admin FROM users WHERE email = ? AND is_admin = 1',
      [userEmail]
    ) as any[]

    // Check if user is staff
    const isStaffUser = userEmail === 'gkicksstaff@gmail.com'
    const isLegacyAdmin = legacyAdminCheck.length > 0
    const isAdminUser = adminCheck.length > 0

    console.log('🔍 Restore API: Authorization check results:', {
      isStaffUser,
      isLegacyAdmin,
      isAdminUser,
      adminRole: adminCheck.length > 0 ? adminCheck[0].role : null
    })

    if (!isAdminUser && !isLegacyAdmin && !isStaffUser) {
      console.log('❌ Restore API: User not authorized for restore operations')
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin or staff role required.' },
        { status: 403 }
      )
    }

    const userRole = isAdminUser ? adminCheck[0].role : (isLegacyAdmin ? 'admin' : 'staff')
    console.log('✅ Restore API: Access granted for role:', userRole)

    const { id, type } = await request.json()
    console.log('📋 Restore API: Request details:', { id, type })

    if (!id || !type) {
      console.log('❌ Restore API: Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id and type' },
        { status: 400 }
      )
    }

    connection = await getConnection()

    let query = ''
    let params: any[] = []

    console.log('🔧 Restore API: Preparing restore query for type:', type)

    switch (type) {
      case 'product':
        // Restore product by setting is_deleted = 0
        query = `
          UPDATE products 
          SET is_deleted = 0, updated_at = NOW() 
          WHERE id = ? AND is_deleted = 1
        `
        params = [id]
        console.log('📦 Restore API: Product restore query prepared')
        break

      case 'order':
        // Restore order by changing status from cancelled/refunded to pending
        query = `
          UPDATE orders 
          SET status = 'pending', updated_at = NOW() 
          WHERE id = ? AND status IN ('cancelled', 'refunded')
        `
        params = [id]
        console.log('📋 Restore API: Order restore query prepared')
        break

      case 'user':
        // Restore user by setting is_active = 1
        query = `
          UPDATE users 
          SET is_active = 1, updated_at = NOW() 
          WHERE id = ? AND is_active = 0
        `
        params = [id]
        console.log('👤 Restore API: User restore query prepared')
        break

      case 'carousel':
        // Restore carousel slide by setting is_archived = 0
        query = `
          UPDATE carousel_slides 
          SET is_archived = 0, updated_at = NOW() 
          WHERE id = ? AND is_archived = 1
        `
        params = [id]
        console.log('🎠 Restore API: Carousel restore query prepared')
        break

      case 'message':
        // Restore support conversation by reopening it
        query = `
          UPDATE support_conversations 
          SET status = 'open', updated_at = NOW() 
          WHERE id = ? AND status = 'closed'
        `
        params = [id]
        console.log('💬 Restore API: Message restore (support conversation) query prepared')
        break

      default:
        console.log('❌ Restore API: Invalid type provided:', type)
        return NextResponse.json(
          { success: false, error: 'Invalid type. Must be product, order, user, carousel, or message' },
          { status: 400 }
        )
    }

    console.log('🚀 Restore API: Executing restore query...')
    const [result] = await connection.execute(query, params) as any[]
    console.log('📊 Restore API: Query result:', { affectedRows: result.affectedRows })

    if (result.affectedRows === 0) {
      console.log('❌ Restore API: No rows affected - item not found or already restored')
      return NextResponse.json(
        { success: false, error: 'Item not found or already restored' },
        { status: 404 }
      )
    }

    console.log('✅ Restore API: Item restored successfully')
    return NextResponse.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully`,
      restored: {
        id,
        type,
        restoredAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Restore API: Error during restore operation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to restore item',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 Restore API: Database connection closed')
    }
  }
}