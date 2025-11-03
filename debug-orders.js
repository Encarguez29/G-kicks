const mysql = require('mysql2/promise');

async function debugOrders() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🔍 Debugging order issues...\n');
    
    // Check all recent orders
    console.log('📋 All recent orders:');
    const [allOrders] = await connection.execute(`
      SELECT id, order_number, status, user_id, total_amount, notes, created_at, delivered_at
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    allOrders.forEach(order => {
      console.log(`  ID: ${order.id}, Order#: ${order.order_number}, Status: ${order.status}`);
      console.log(`      User: ${order.user_id}, Total: ₱${order.total_amount}, Notes: ${order.notes || 'N/A'}`);
      console.log(`      Created: ${order.created_at}, Delivered: ${order.delivered_at || 'N/A'}`);
      console.log('');
    });
    
    // Check specifically for orders 2025001 and 2025002
    console.log('🔍 Checking specific order numbers:');
    const [specificOrders] = await connection.execute(`
      SELECT id, order_number, status, user_id, total_amount, notes, created_at, delivered_at
      FROM orders 
      WHERE order_number IN ('2025001', '2025002', 'GK1005', 'GK1006')
      ORDER BY created_at DESC
    `);
    
    if (specificOrders.length > 0) {
      specificOrders.forEach(order => {
        console.log(`  ID: ${order.id}, Order#: ${order.order_number}, Status: ${order.status}`);
        console.log(`      User: ${order.user_id}, Total: ₱${order.total_amount}, Notes: ${order.notes || 'N/A'}`);
        console.log(`      Created: ${order.created_at}, Delivered: ${order.delivered_at || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No orders found with those numbers');
    }
    
    // Check for POS orders specifically
    console.log('🛒 POS orders:');
    const [posOrders] = await connection.execute(`
      SELECT id, order_number, status, user_id, total_amount, notes, created_at, delivered_at
      FROM orders 
      WHERE notes LIKE '%POS%'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (posOrders.length > 0) {
      posOrders.forEach(order => {
        console.log(`  ID: ${order.id}, Order#: ${order.order_number}, Status: ${order.status}`);
        console.log(`      User: ${order.user_id}, Total: ₱${order.total_amount}, Notes: ${order.notes || 'N/A'}`);
        console.log(`      Created: ${order.created_at}, Delivered: ${order.delivered_at || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No POS orders found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

debugOrders();