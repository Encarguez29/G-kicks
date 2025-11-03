const { executeQuery } = require('./lib/database/mysql')

async function checkTables() {
  try {
    console.log('Checking required tables for auto-delivery...')
    
    // Check orders table
    const orders = await executeQuery("SHOW TABLES LIKE 'orders'")
    console.log('Orders table exists:', orders.length > 0)
    
    // Check delivery_notifications table
    const notifications = await executeQuery("SHOW TABLES LIKE 'delivery_notifications'")
    console.log('Delivery notifications table exists:', notifications.length > 0)
    
    // Check order_status_history table
    const history = await executeQuery("SHOW TABLES LIKE 'order_status_history'")
    console.log('Order status history table exists:', history.length > 0)
    
    // Check refund_requests table
    const refunds = await executeQuery("SHOW TABLES LIKE 'refund_requests'")
    console.log('Refund requests table exists:', refunds.length > 0)
    
    // Check orders table structure
    if (orders.length > 0) {
      const orderColumns = await executeQuery("DESCRIBE orders")
      console.log('\nOrders table columns:')
      orderColumns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`)
      })
    }
    
  } catch (error) {
    console.error('Error checking tables:', error)
  }
}

checkTables()