import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Checking orders and POS data...')
    
    // Check total orders by status
    const ordersResult = await executeQuery(
      'SELECT COUNT(*) as total_orders, status FROM orders GROUP BY status'
    )
    console.log('Orders by status:', ordersResult)
    
    // Check recent orders with order numbers
    const recentOrders = await executeQuery(
      'SELECT id, order_number, user_id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10'
    )
    console.log('Recent orders:', recentOrders)

    // Check max order number
    const maxOrderResult = await executeQuery(`
      SELECT MAX(CAST(SUBSTRING(order_number, 3) AS UNSIGNED)) as max_number 
      FROM orders 
      WHERE order_number LIKE 'GK%'
    `)
    console.log('Max order number:', maxOrderResult)
    
    // Check POS transactions
    const posResult = await executeQuery(
      'SELECT COUNT(*) as total_pos, status FROM pos_transactions GROUP BY status'
    )
    console.log('POS transactions by status:', posResult)
    
    // Check recent POS transactions
    const recentPos = await executeQuery(
      'SELECT id, customer_email, total_amount, status, created_at FROM pos_transactions ORDER BY created_at DESC LIMIT 5'
    )
    console.log('Recent POS transactions:', recentPos)
    
    // Test the analytics query for total orders (updated to include all order statuses)
    const analyticsTest = await executeQuery(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue
      FROM (
        SELECT total_amount
        FROM orders 
        WHERE status IN ('completed', 'delivered', 'processing', 'pending')
        UNION ALL
        SELECT total_amount
        FROM pos_transactions 
        WHERE status = 'completed'
      ) combined_data
    `)
    console.log('Analytics test (combined data):', analyticsTest)
    
    return NextResponse.json({
      success: true,
      maxOrderResult,
      recentOrders,
      data: {
        orders: ordersResult,
        recentOrders,
        posTransactions: posResult,
        recentPos,
        analyticsTest
      }
    })
    
  } catch (error) {
    console.error('❌ DEBUG: Error checking data:', error)
    return NextResponse.json(
      { error: 'Failed to check data', details: error },
      { status: 500 }
    )
  }
}