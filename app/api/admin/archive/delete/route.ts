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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    return connection
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to database')
  }
}

export async function DELETE(request: NextRequest) {
  let connection: mysql.Connection | null = null

  try {
    console.log('🗑️ Delete API: Starting delete request')
    
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    console.log('🔑 Delete API: Token found:', !!token)

    if (!token) {
      console.log('❌ Delete API: No token provided')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      console.log('✅ Delete API: Token verified for user:', decoded.email)
    } catch (error) {
      console.log('❌ Delete API: Token verification failed:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user has admin or staff privileges
    const isAdmin = decoded.role === 'admin' || decoded.role === 'legacy_admin'
    const isStaff = decoded.email === 'gkicksstaff@gmail.com'
    
    if (!isAdmin && !isStaff) {
      return NextResponse.json(
        { success: false, error: 'Insufficient privileges' },
        { status: 403 }
      )
    }

    const { id, type } = await request.json()
    console.log('📝 Delete API: Request data - ID:', id, 'Type:', type)

    if (!id || !type) {
      console.log('❌ Delete API: Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id and type' },
        { status: 400 }
      )
    }

    connection = await getConnection()
    console.log('🔌 Delete API: Database connection established')

    let queries: string[] = []
    let params: any[] = []

    switch (type) {
      case 'product':
        console.log('🛍️ Delete API: Deleting product with ID:', id)
        // Permanently delete product and related data
        queries = [
          'DELETE FROM cart_items WHERE product_id = ?',
          'DELETE FROM wishlist_items WHERE product_id = ?',
          'DELETE FROM product_variants WHERE product_id = ?',
          'DELETE FROM product_views WHERE product_id = ?',
          'DELETE FROM products WHERE id = ? AND is_deleted = 1'
        ]
        params = [id, id, id, id, id]
        break

      case 'order':
        console.log('📦 Delete API: Deleting order with ID:', id)
        // Permanently delete order and related data
        queries = [
          'DELETE FROM notification_views WHERE order_id = ?',
          'DELETE FROM order_items WHERE order_id = ?',
          'DELETE FROM orders WHERE id = ? AND status IN ("cancelled", "refunded")'
        ]
        params = [id, id, id]
        break

      case 'user':
        console.log('👤 Delete API: Deleting user with ID:', id)
        // Permanently delete admin user and related data
        queries = [
          'DELETE FROM pos_sessions WHERE admin_user_id = ?',
          'DELETE FROM pos_transactions WHERE admin_user_id = ?',
          'DELETE FROM pos_daily_sales WHERE admin_user_id = ?',
          'DELETE FROM admin_users WHERE id = ? AND is_active = 0'
        ]
        params = [id, id, id, id]
        break

      case 'message':
        console.log('💬 Delete API: Deleting message with ID:', id)
        // Delete related messages first (foreign key constraint)
        queries = [
          'DELETE FROM support_messages WHERE conversation_id = ?',
          'DELETE FROM support_conversations WHERE id = ?'
        ]
        params = [id, id]
        break

      case 'carousel':
        console.log('🎠 Delete API: Deleting carousel with ID:', id)
        // Permanently delete carousel slide
        queries = [
          'DELETE FROM carousel_slides WHERE id = ?'
        ]
        params = [id]
        break

      default:
        console.log('❌ Delete API: Invalid type:', type)
        return NextResponse.json(
          { success: false, error: 'Invalid type. Must be product, order, user, message, or carousel' },
          { status: 400 }
        )
    }

    // Execute all deletion queries in a transaction
    await connection.beginTransaction()
    console.log('🔄 Delete API: Transaction started')

    let totalAffectedRows = 0
    for (let i = 0; i < queries.length; i++) {
      console.log(`🔍 Delete API: Executing query ${i + 1}/${queries.length}:`, queries[i])
      const [result] = await connection.execute(queries[i], [params[i]]) as any[]
      if (i === queries.length - 1) {
        // Only count affected rows from the main table deletion
        totalAffectedRows = result.affectedRows
        console.log(`✅ Delete API: Main query affected ${totalAffectedRows} rows`)
      } else {
        console.log(`✅ Delete API: Query ${i + 1} affected ${result.affectedRows} rows`)
      }
    }

    if (totalAffectedRows === 0) {
      await connection.rollback()
      console.log('❌ Delete API: No rows affected, rolling back transaction')
      return NextResponse.json(
        { success: false, error: 'Item not found or not archived' },
        { status: 404 }
      )
    }

    await connection.commit()
    console.log('✅ Delete API: Transaction committed successfully')
    console.log('📊 Delete API: Total affected rows:', totalAffectedRows)

    return NextResponse.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted`,
      deleted: {
        id,
        type,
        deletedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.log('❌ Delete API: General error:', error)
    if (connection) {
      try {
        await connection.rollback()
        console.log('🔄 Delete API: Transaction rolled back due to error')
      } catch (rollbackError) {
        console.log('❌ Delete API: Rollback failed:', rollbackError)
      }
    }
    console.error('Error permanently deleting item:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to permanently delete item',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 Delete API: Database connection closed')
    }
  }
}