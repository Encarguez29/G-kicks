const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'gkicks',
    ssl: false,
  };

  try {
    console.log('🔍 Testing database connection...');
    console.log('Config:', dbConfig);
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);
    
    // Check if orders table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "orders"');
    console.log('📋 Orders table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Check orders table structure
      const [columns] = await connection.execute('DESCRIBE orders');
      console.log('📋 Orders table structure:', columns);
    }
    
    await connection.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
  }
}

testDatabaseConnection();