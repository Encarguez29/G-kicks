import { executeQuery } from '@/lib/database/mysql'

/**
 * Service to automatically mark orders as delivered after 7 days
 */
export class AutoDeliveryService {
  /**
   * Check for orders that were shipped more than 7 days ago but not yet delivered
   * and automatically mark them as delivered
   */
  static async checkAndMarkDeliveredOrders(): Promise<{
    processedCount: number
    processedOrders: string[]
    errors: string[]
  }> {
    try {
      console.log('🔍 AutoDeliveryService: Checking for orders to automatically mark as delivered...')
      
      // Find orders that were shipped more than 7 days ago but not delivered
      const query = `
        SELECT 
          id, 
          order_number, 
          shipped_at, 
          status,
          customer_email
        FROM orders 
        WHERE 
          status = 'shipped' 
          AND shipped_at IS NOT NULL 
          AND shipped_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND (delivered_at IS NULL OR status != 'delivered')
        ORDER BY shipped_at ASC
      `
      
      const orders = await executeQuery(query) as any[]
      
      if (!orders || orders.length === 0) {
        console.log('✅ AutoDeliveryService: No orders found for automatic delivery marking')
        return { processedCount: 0, processedOrders: [], errors: [] }
      }
      
      console.log(`📦 AutoDeliveryService: Found ${orders.length} orders to mark as delivered`)
      
      const processedOrders: string[] = []
      const errors: string[] = []
      
      // Process each order
      for (const order of orders) {
        try {
          console.log(`🔄 AutoDeliveryService: Processing order ${order.order_number} (shipped on ${order.shipped_at})`)
          
          // Update order status to delivered and set delivered_at timestamp
          const updateQuery = `
            UPDATE orders 
            SET 
              status = 'delivered',
              delivered_at = NOW(),
              updated_at = NOW()
            WHERE id = ? AND status = 'shipped'
          `
          
          const result = await executeQuery(updateQuery, [order.id]) as any
          
          if (result.affectedRows === 1) {
            console.log(`✅ AutoDeliveryService: Successfully marked order ${order.order_number} as delivered`)
            processedOrders.push(order.order_number)
            
            // Log the automatic delivery (could also send notification here)
            await this.logAutoDelivery(order.id, order.order_number, order.customer_email)
          } else {
            console.log(`⚠️ AutoDeliveryService: Order ${order.order_number} was already updated or not found`)
          }
          
        } catch (error) {
          const errorMsg = `Failed to process order ${order.order_number}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`❌ AutoDeliveryService: ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
      
      console.log(`✅ AutoDeliveryService: Completed. Processed ${processedOrders.length} orders, ${errors.length} errors`)
      
      return {
        processedCount: processedOrders.length,
        processedOrders,
        errors
      }
      
    } catch (error) {
      console.error('❌ AutoDeliveryService: Error checking for orders:', error)
      return {
        processedCount: 0,
        processedOrders: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
  
  /**
   * Log automatic delivery for auditing purposes
   */
  private static async logAutoDelivery(orderId: number, orderNumber: string, customerEmail: string): Promise<void> {
    try {
      const logQuery = `
        INSERT INTO auto_delivery_logs (
          order_id, 
          order_number, 
          customer_email, 
          processed_at
        ) VALUES (?, ?, ?, NOW())
      `
      
      await executeQuery(logQuery, [orderId, orderNumber, customerEmail])
      console.log(`📝 AutoDeliveryService: Logged automatic delivery for order ${orderNumber}`)
      
    } catch (error) {
      console.error('❌ AutoDeliveryService: Failed to log auto delivery:', error)
      // Don't fail the main process if logging fails
    }
  }
  
  /**
   * Get statistics about automatic delivery processing
   */
  static async getStats(): Promise<{
    totalProcessed: number
    lastProcessed: string | null
    errorCount: number
  }> {
    try {
      // Check if auto_delivery_logs table exists
      const tableCheck = await executeQuery(
        "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='auto_delivery_logs'"
      ) as any[]
      
      if (Number(tableCheck[0]?.cnt || 0) === 0) {
        return { totalProcessed: 0, lastProcessed: null, errorCount: 0 }
      }
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_processed,
          MAX(processed_at) as last_processed
        FROM auto_delivery_logs
      `
      
      const stats = await executeQuery(statsQuery) as any[]
      
      return {
        totalProcessed: Number(stats[0]?.total_processed || 0),
        lastProcessed: stats[0]?.last_processed || null,
        errorCount: 0 // Would need error logging table for proper error counting
      }
      
    } catch (error) {
      console.error('❌ AutoDeliveryService: Error getting stats:', error)
      return { totalProcessed: 0, lastProcessed: null, errorCount: 0 }
    }
  }
}

// Create the auto_delivery_logs table if it doesn't exist
export async function setupAutoDeliveryLogsTable(): Promise<void> {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS auto_delivery_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        order_number VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        INDEX idx_order_number (order_number),
        INDEX idx_processed_at (processed_at),
        INDEX idx_customer_email (customer_email)
      )
    `
    
    await executeQuery(createTableQuery)
    console.log('✅ AutoDeliveryService: auto_delivery_logs table ready')
    
  } catch (error) {
    console.error('❌ AutoDeliveryService: Failed to create auto_delivery_logs table:', error)
  }
}