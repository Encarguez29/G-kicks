const mysql = require('mysql2/promise');

async function debugPOSUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🔍 Investigating POS order user assignments...\n');

    // Check POS orders and their user assignments
    console.log('=== POS ORDERS USER ANALYSIS ===');
    const [posOrders] = await connection.execute(`
      SELECT 
        id, 
        order_number, 
        user_id, 
        customer_email,
        status, 
        delivered_at, 
        created_at, 
        updated_at
      FROM orders 
      WHERE order_number LIKE 'GK%' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    if (posOrders.length > 0) {
      console.log('POS Orders:');
      for (const order of posOrders) {
        console.log(`\nOrder ${order.order_number}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  User ID: ${order.user_id}`);
        console.log(`  Customer Email: ${order.customer_email}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Created: ${order.created_at}`);
        console.log(`  Updated: ${order.updated_at}`);
        console.log(`  Delivered: ${order.delivered_at}`);

        // Check if this user exists and get their details
        const [userDetails] = await connection.execute(`
          SELECT id, email, created_at FROM users WHERE id = ?
        `, [order.user_id]);

        if (userDetails.length > 0) {
          const user = userDetails[0];
          console.log(`  User Details: ${user.email} (created: ${user.created_at})`);
        } else {
          console.log(`  ⚠️  User ID ${order.user_id} not found in users table!`);
        }
      }
    } else {
      console.log('  No POS orders found');
    }

    // Check if user ID 47 exists (POS system user)
    console.log('\n=== POS SYSTEM USER CHECK ===');
    const [posSystemUser] = await connection.execute(`
      SELECT id, email, created_at FROM users WHERE id = 47
    `);

    if (posSystemUser.length > 0) {
      const user = posSystemUser[0];
      console.log(`POS System User: ${user.email} (ID: ${user.id}, created: ${user.created_at})`);
    } else {
      console.log('⚠️  POS system user (ID: 47) not found!');
    }

    // Check recent user activity that might be cancelling orders
    console.log('\n=== RECENT USER ACTIVITY ===');
    const [recentUsers] = await connection.execute(`
      SELECT DISTINCT user_id, customer_email, updated_at
      FROM orders 
      WHERE updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND status = 'cancelled'
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    if (recentUsers.length > 0) {
      console.log('Recent order cancellations:');
      for (const activity of recentUsers) {
        console.log(`  User ${activity.user_id} (${activity.customer_email}) - ${activity.updated_at}`);
      }
    } else {
      console.log('  No recent cancellations found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugPOSUsers();