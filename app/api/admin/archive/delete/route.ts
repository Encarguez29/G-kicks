import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

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

export async function DELETE(request: NextRequest) {
  let connection: mysql.Connection | null = null

  try {
    const { id, type } = await request.json()

    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id and type' },
        { status: 400 }
      )
    }

    connection = await getConnection()

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
          'DELETE FROM order_items WHERE order_id = ?',
          'DELETE FROM orders WHERE id = ? AND status IN ("cancelled", "refunded")'
        ]
        params = [id, id]
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

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type. Must be product, order, or user' },
          { status: 400 }
        )
    }

    // Execute all deletion queries in a transaction
    await connection.beginTransaction()

    try {
      let totalAffectedRows = 0

      for (let i = 0; i < queries.length; i++) {
        const [result] = await connection.execute(queries[i], [params[i]]) as any[]
        if (i === queries.length - 1) {
          // Only count affected rows from the main table deletion
          totalAffectedRows = result.affectedRows
        }
      }

      if (totalAffectedRows === 0) {
        await connection.rollback()
        return NextResponse.json(
          { success: false, error: 'Item not found or not archived' },
          { status: 404 }
        )
      }

      await connection.commit()

      return NextResponse.json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted`,
        deleted: {
          id,
          type,
          deletedAt: new Date().toISOString()
        }
      })

    } catch (transactionError) {
      await connection.rollback()
      throw transactionError
    }

  } catch (error) {
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
    }
  }
}