const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    console.log('✅ Database connected successfully');
    
    // Test if we can query archived orders using the correct schema
    const [orders] = await connection.execute(`
      SELECT id, status 
      FROM orders 
      WHERE status IN ('cancelled', 'refunded') 
      LIMIT 5
    `);
    console.log('📦 Found archived orders:', orders.length);
    console.log('Orders:', orders);
    
    // Test a simple delete operation
    if (orders.length > 0) {
      const testOrderId = orders[0].id;
      console.log('🧪 Testing delete query for order ID:', testOrderId);
      
      // This is what the delete API tries to do
      const [result] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE id = ? AND status IN ('cancelled', 'refunded')
      `, [testOrderId]);
      
      console.log('✅ Delete query test result:', result[0].count > 0 ? 'Order found and can be deleted' : 'Order not found or not deletable');
    }
    
    await connection.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();