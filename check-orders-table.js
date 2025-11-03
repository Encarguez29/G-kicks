const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkOrdersTable() {
  let connection;
  
  try {
    console.log('🔍 Checking orders table structure...');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });

    // Check table structure
    const [columns] = await connection.execute('DESCRIBE orders');
    console.log('\n📋 Orders table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Check for required columns
    const requiredColumns = ['id', 'order_number', 'customer_email', 'total_amount', 'status', 'created_at'];
    const existingColumns = columns.map(col => col.Field);
    
    console.log('\n🔍 Checking required columns:');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`${exists ? '✅' : '❌'} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    // Get sample data
    const [sample] = await connection.execute('SELECT * FROM orders LIMIT 3');
    console.log('\n📊 Sample orders:');
    sample.forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        id: order.id,
        order_number: order.order_number,
        customer_email: order.customer_email,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at
      });
    });

    // Check orders with specific statuses
    const [statusCount] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE status IN ('pending', 'confirmed', 'processing') 
      GROUP BY status
    `);
    
    console.log('\n📈 Orders by status (actionable):');
    statusCount.forEach(row => {
      console.log(`- ${row.status}: ${row.count} orders`);
    });

  } catch (error) {
    console.error('❌ Error checking orders table:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkOrdersTable();