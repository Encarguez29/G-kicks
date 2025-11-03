require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkDatabaseSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 Checking database schema...');

    // Check orders table structure
    console.log('\n📋 Orders table structure:');
    const [ordersColumns] = await connection.execute('DESCRIBE orders');
    ordersColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // Check order_items table structure
    console.log('\n📦 Order_items table structure:');
    const [orderItemsColumns] = await connection.execute('DESCRIBE order_items');
    orderItemsColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // Check if payment_reference column exists
    console.log('\n🔍 Checking payment_reference column:');
    const [paymentRefCheck] = await connection.execute(`
      SELECT COUNT(*) as cnt 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME='orders' 
      AND COLUMN_NAME='payment_reference'
    `);
    console.log(`  payment_reference column exists: ${paymentRefCheck[0].cnt > 0 ? 'YES' : 'NO'}`);

    await connection.end();
    console.log('\n✅ Database schema check completed');
  } catch (error) {
    console.error('❌ Database schema check failed:', error);
  }
}

checkDatabaseSchema();