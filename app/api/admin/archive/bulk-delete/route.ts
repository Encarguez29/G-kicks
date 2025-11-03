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
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
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

    const { items } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid items array' },
        { status: 400 }
      )
    }

    connection = await getConnection()
    await connection.beginTransaction()

    let totalDeleted = 0
    const deletedItems: any[] = []

    try {
      for (const item of items) {
        const { id, type } = item

        if (!id || !type) {
          continue // Skip invalid items
        }

        let queries: string[] = []
        let params: any[] = []

        switch (type) {
          case 'product':
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
            // Permanently delete order and related data
            queries = [
              'DELETE FROM notification_views WHERE order_id = ?',
              'DELETE FROM order_items WHERE order_id = ?',
              'DELETE FROM orders WHERE id = ? AND status IN ("cancelled", "refunded")'
            ]
            params = [id, id, id]
            break

          case 'user':
            // Permanently delete admin user and related data
            queries = [
              'DELETE FROM pos_sessions WHERE admin_user_id = ?',
              'DELETE FROM pos_transactions WHERE admin_user_id = ?',
              'DELETE FROM pos_daily_sales WHERE admin_user_id = ?',
              'DELETE FROM admin_users WHERE id = ? AND deleted_at IS NOT NULL'
            ]
            params = [id, id, id, id]
            break

          case 'carousel':
            // Permanently delete carousel slide
            queries = [
              'DELETE FROM carousel_slides WHERE id = ?'
            ]
            params = [id]
            break

          case 'message':
            // Delete related messages first (foreign key constraint)
            queries = [
              'DELETE FROM support_messages WHERE conversation_id = ?',
              'DELETE FROM support_conversations WHERE id = ?'
            ]
            params = [id, id]
            break

          default:
            continue // Skip unknown types
        }

        // Execute deletion queries for this item
        let itemDeleted = false
        for (let i = 0; i < queries.length; i++) {
          const [result] = await connection.execute(queries[i], [params[i]]) as any[]
          if (i === queries.length - 1 && result.affectedRows > 0) {
            // Only count if the main table deletion was successful
            itemDeleted = true
          }
        }

        if (itemDeleted) {
          totalDeleted++
          deletedItems.push({
            id,
            type,
            deletedAt: new Date().toISOString()
          })
        }
      }

      if (totalDeleted === 0) {
        await connection.rollback()
        return NextResponse.json(
          { success: false, error: 'No items were deleted. Items may not exist or not be archived.' },
          { status: 404 }
        )
      }

      await connection.commit()

      return NextResponse.json({
        success: true,
        message: `${totalDeleted} item(s) permanently deleted`,
        deleted: deletedItems,
        totalDeleted
      })

    } catch (transactionError) {
      await connection.rollback()
      throw transactionError
    }

  } catch (error) {
    console.error('Error bulk deleting items:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to bulk delete items',
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