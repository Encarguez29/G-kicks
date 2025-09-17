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

export async function POST(request: NextRequest) {
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

    let query = ''
    let params: any[] = []

    switch (type) {
      case 'product':
        // Restore product by setting is_deleted = 0
        query = `
          UPDATE products 
          SET is_deleted = 0, updated_at = NOW() 
          WHERE id = ? AND is_deleted = 1
        `
        params = [id]
        break

      case 'order':
        // Restore order by changing status from cancelled/refunded to pending
        query = `
          UPDATE orders 
          SET status = 'pending', updated_at = NOW() 
          WHERE id = ? AND status IN ('cancelled', 'refunded')
        `
        params = [id]
        break

      case 'user':
        // Restore user by setting is_active = 1
        query = `
          UPDATE users 
          SET is_active = 1, updated_at = NOW() 
          WHERE id = ? AND is_active = 0
        `
        params = [id]
        break

      case 'carousel':
        // Restore carousel slide by setting is_archived = 0
        query = `
          UPDATE carousel_slides 
          SET is_archived = 0, updated_at = NOW() 
          WHERE id = ? AND is_archived = 1
        `
        params = [id]
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type. Must be product, order, user, or carousel' },
          { status: 400 }
        )
    }

    const [result] = await connection.execute(query, params) as any[]

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found or already restored' },
        { status: 404 }
      )
    }

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
    console.error('Error restoring item:', error)
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
    }
  }
}