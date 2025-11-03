const mysql = require('mysql2/promise');

async function debugCancellationTiming() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🕐 Analyzing POS order cancellation timing...\n');

    // Get detailed timing of all cancelled orders by user 47
    console.log('=== CANCELLED ORDERS BY POS SYSTEM USER (ID: 47) ===');
    const [cancelledOrders] = await connection.execute(`
      SELECT 
        id, 
        order_number, 
        status, 
        customer_email,
        created_at, 
        updated_at,
        delivered_at,
        TIMESTAMPDIFF(SECOND, created_at, updated_at) as seconds_to_cancel,
        TIMESTAMPDIFF(MINUTE, created_at, updated_at) as minutes_to_cancel
      FROM orders 
      WHERE user_id = 47 
      AND status = 'cancelled'
      ORDER BY updated_at DESC
    `);

    if (cancelledOrders.length > 0) {
      console.log('Cancelled POS Orders:');
      for (const order of cancelledOrders) {
        console.log(`\nOrder ${order.order_number}:`);
        console.log(`  Created: ${order.created_at}`);
        console.log(`  Cancelled: ${order.updated_at}`);
        console.log(`  Time to cancel: ${order.minutes_to_cancel} minutes (${order.seconds_to_cancel} seconds)`);
        console.log(`  Customer: ${order.customer_email}`);
        console.log(`  Delivered at: ${order.delivered_at}`);
      }
    } else {
      console.log('  No cancelled orders found for POS system user');
    }

    // Check if there are any orders that were delivered but then cancelled
    console.log('\n=== DELIVERED ORDERS THAT WERE LATER CANCELLED ===');
    const [deliveredThenCancelled] = await connection.execute(`
      SELECT 
        id, 
        order_number, 
        status, 
        customer_email,
        created_at, 
        updated_at,
        delivered_at,
        TIMESTAMPDIFF(MINUTE, delivered_at, updated_at) as minutes_after_delivery
      FROM orders 
      WHERE status = 'cancelled'
      AND delivered_at IS NOT NULL
      AND delivered_at < updated_at
      ORDER BY updated_at DESC
    `);

    if (deliveredThenCancelled.length > 0) {
      console.log('Orders cancelled after delivery:');
      for (const order of deliveredThenCancelled) {
        console.log(`\nOrder ${order.order_number}:`);
        console.log(`  Delivered: ${order.delivered_at}`);
        console.log(`  Cancelled: ${order.updated_at}`);
        console.log(`  Minutes after delivery: ${order.minutes_after_delivery}`);
        console.log(`  Customer: ${order.customer_email}`);
      }
    } else {
      console.log('  No orders were cancelled after being delivered');
    }

    // Check for any patterns in the timing
    console.log('\n=== TIMING PATTERNS ===');
    const [timingPatterns] = await connection.execute(`
      SELECT 
        DATE(updated_at) as cancel_date,
        HOUR(updated_at) as cancel_hour,
        COUNT(*) as cancellation_count
      FROM orders 
      WHERE status = 'cancelled'
      AND updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(updated_at), HOUR(updated_at)
      ORDER BY cancel_date DESC, cancel_hour DESC
    `);

    if (timingPatterns.length > 0) {
      console.log('Cancellation patterns by date and hour:');
      for (const pattern of timingPatterns) {
        console.log(`  ${pattern.cancel_date} at ${pattern.cancel_hour}:00 - ${pattern.cancellation_count} cancellations`);
      }
    } else {
      console.log('  No recent cancellation patterns found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugCancellationTiming();