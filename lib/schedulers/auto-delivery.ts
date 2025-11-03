/**
 * Auto-Delivery Scheduler
 * 
 * This module handles the automatic delivery confirmation for orders
 * that have been shipped for more than 30 days without customer confirmation
 * and have no pending refund requests.
 * 
 * Usage:
 * 1. Can be called via API endpoint: /api/admin/auto-delivery
 * 2. Can be triggered by external cron jobs
 * 3. Can be run manually by admins
 */

import { executeQuery } from '@/lib/database/mysql'

export interface AutoDeliveryResult {
  success: boolean
  totalEligible: number
  processed: number
  errors: number
  results: Array<{
    orderId: number
    orderNumber: string
    daysSinceShipped: number
    status: 'success' | 'error'
    error?: string
  }>
}

export async function runAutoDeliveryProcess(): Promise<AutoDeliveryResult> {
  console.log('🚀 Starting auto-delivery process...')
  
  try {
    // Find orders eligible for auto-delivery
    const eligibleOrders = await findEligibleOrders()
    
    console.log(`📦 Found ${eligibleOrders.length} orders eligible for auto-delivery`)
    
    if (eligibleOrders.length === 0) {
      return {
        success: true,
        totalEligible: 0,
        processed: 0,
        errors: 0,
        results: []
      }
    }

    // Process each eligible order
    const results = []
    let processedCount = 0
    let errorCount = 0

    for (const order of eligibleOrders) {
      try {
        await processOrderAutoDelivery(order)
        
        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          daysSinceShipped: order.days_since_shipped,
          status: 'success' as const
        })
        
        processedCount++
        console.log(`✅ Auto-delivered order ${order.order_number} (${order.days_since_shipped} days since shipped)`)
        
      } catch (error) {
        errorCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          daysSinceShipped: order.days_since_shipped,
          status: 'error' as const,
          error: errorMessage
        })
        
        console.error(`❌ Failed to auto-deliver order ${order.order_number}:`, error)
      }
    }

    console.log(`✅ Auto-delivery process completed: ${processedCount} successful, ${errorCount} errors`)

    return {
      success: true,
      totalEligible: eligibleOrders.length,
      processed: processedCount,
      errors: errorCount,
      results
    }

  } catch (error) {
    console.error('❌ Auto-delivery process failed:', error)
    throw error
  }
}

async function findEligibleOrders() {
  const query = `
    SELECT 
      o.id,
      o.order_number,
      o.status,
      o.shipped_at,
      o.customer_email,
      o.user_id,
      DATEDIFF(NOW(), o.shipped_at) as days_since_shipped
    FROM orders o
    WHERE o.status = 'shipped'
      AND o.shipped_at IS NOT NULL
      AND DATEDIFF(NOW(), o.shipped_at) >= 30
      AND o.delivered_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM refund_requests rr 
        WHERE rr.order_id = o.id 
        AND rr.status IN ('pending', 'approved')
      )
    ORDER BY o.shipped_at ASC
  `
  
  return await executeQuery(query) as any[]
}

async function processOrderAutoDelivery(order: any) {
  // Start a transaction to ensure data consistency
  await executeQuery('START TRANSACTION')
  
  try {
    // Update order status to delivered
    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await executeQuery(
      'UPDATE orders SET status = ?, delivered_at = ?, updated_at = ? WHERE id = ?',
      ['delivered', currentTimestamp, currentTimestamp, order.id]
    )

    // Create a delivery notification for the customer
    if (order.user_id) {
      await executeQuery(`
        INSERT INTO delivery_notifications (
          user_id,
          order_id,
          notification_type,
          title,
          message,
          created_at,
          is_read
        ) VALUES (?, ?, ?, ?, ?, ?, 0)
      `, [
        order.user_id,
        order.id,
        'delivery_confirmation',
        'Order Automatically Confirmed as Delivered',
        `Your order ${order.order_number} has been automatically marked as delivered after 30 days. If you have any issues with your order, please contact our support team.`,
        currentTimestamp
      ])
    }

    // Log the auto-delivery action for audit purposes
    await executeQuery(`
      INSERT INTO order_status_history (
        order_id,
        old_status,
        new_status,
        changed_by,
        change_reason,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      order.id,
      'shipped',
      'delivered',
      'system',
      `Auto-delivery after ${order.days_since_shipped} days`,
      currentTimestamp
    ])

    // Commit the transaction
    await executeQuery('COMMIT')
    
  } catch (error) {
    // Rollback on error
    await executeQuery('ROLLBACK')
    throw error
  }
}

export async function getEligibleOrdersCount(): Promise<number> {
  const result = await executeQuery(`
    SELECT COUNT(*) as count
    FROM orders o
    WHERE o.status = 'shipped'
      AND o.shipped_at IS NOT NULL
      AND DATEDIFF(NOW(), o.shipped_at) >= 30
      AND o.delivered_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM refund_requests rr 
        WHERE rr.order_id = o.id 
        AND rr.status IN ('pending', 'approved')
      )
  `) as any[]
  
  return result[0]?.count || 0
}

export async function getEligibleOrders() {
  return await findEligibleOrders()
}