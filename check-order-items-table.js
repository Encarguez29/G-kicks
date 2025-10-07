const mysql = require('mysql2/promise');

async function checkOrderItemsTable() {
  const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'gkicks',
    ssl: false,
  };

  try {
    console.log('🔍 Checking order_items table structure...');
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Check order_items table structure
    const [columns] = await connection.execute('DESCRIBE order_items');
    console.log('📋 Order_items table structure:');
    console.table(columns);
    
    await connection.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
  }
}

checkOrderItemsTable();