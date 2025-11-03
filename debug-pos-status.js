const mysql = require('mysql2/promise');

async function debugPOSStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🔍 Investigating POS order status changes...\n');

    // Check recent POS orders in the orders table
    console.log('=== POS ORDERS IN ORDERS TABLE ===');
    const [posOrdersInOrdersTable] = await connection.execute(`
      SELECT id, order_number, status, delivered_at, created_at, updated_at, user_id
      FROM orders 
      WHERE order_number LIKE 'GK%' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    if (posOrdersInOrdersTable.length > 0) {
      posOrdersInOrdersTable.forEach(order => {
        console.log(`Order ${order.order_number}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  User ID: ${order.user_id}`);
        console.log(`  Created: ${order.created_at}`);
        console.log(`  Updated: ${order.updated_at}`);
        console.log(`  Delivered: ${order.delivered_at}`);
        console.log('');
      });
    } else {
      console.log('  No POS orders found in orders table');
    }

    // Check POS transactions table
    console.log('=== POS TRANSACTIONS TABLE ===');
    const [posTransactions] = await connection.execute(`
      SELECT id, transaction_id, status, total_amount, transaction_date, created_at, updated_at
      FROM pos_transactions 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    if (posTransactions.length > 0) {
      posTransactions.forEach(transaction => {
        console.log(`Transaction ${transaction.transaction_id}:`);
        console.log(`  ID: ${transaction.id}`);
        console.log(`  Status: ${transaction.status}`);
        console.log(`  Amount: ${transaction.total_amount}`);
        console.log(`  Transaction Date: ${transaction.transaction_date}`);
        console.log(`  Created: ${transaction.created_at}`);
        console.log(`  Updated: ${transaction.updated_at}`);
        console.log('');
      });
    } else {
      console.log('  No POS transactions found');
    }

    // Check for any triggers or procedures that might be changing status
    console.log('=== DATABASE TRIGGERS ===');
    const [triggers] = await connection.execute(`
      SHOW TRIGGERS FROM gkicks WHERE \`Table\` IN ('orders', 'pos_transactions')
    `);

    if (triggers.length > 0) {
      console.log('Found triggers:');
      triggers.forEach(trigger => {
        console.log(`  ${trigger.Trigger}: ${trigger.Event} on ${trigger.Table}`);
      });
    } else {
      console.log('  No triggers found on orders or pos_transactions tables');
    }

    // Check for any events (scheduled tasks)
    console.log('\n=== DATABASE EVENTS ===');
    const [events] = await connection.execute(`
      SHOW EVENTS FROM gkicks
    `);

    if (events.length > 0) {
      console.log('Found events:');
      events.forEach(event => {
        console.log(`  ${event.Name}: ${event.Status} - ${event.Execute_at || event.Interval_value + ' ' + event.Interval_field}`);
      });
    } else {
      console.log('  No scheduled events found');
    }

    // Check the user_id 47 (POS system user)
    console.log('\n=== POS SYSTEM USER ===');
    const [posUser] = await connection.execute(`
      SELECT id, email, role FROM users WHERE id = 47
    `);

    if (posUser.length > 0) {
      console.log(`POS System User: ${posUser[0].email} (Role: ${posUser[0].role})`);
    } else {
      console.log('  POS system user (ID: 47) not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugPOSStatus();