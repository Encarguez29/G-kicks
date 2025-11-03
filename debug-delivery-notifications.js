const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function debugDeliveryNotifications() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });

    console.log('✅ Connected to MySQL database');

    // Check if delivery_notifications table exists
    console.log('\n🔍 Checking delivery_notifications table...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'delivery_notifications'"
    );
    
    if (tables.length === 0) {
      console.log('❌ delivery_notifications table does not exist!');
      return;
    }
    
    console.log('✅ delivery_notifications table exists');

    // Check table structure
    console.log('\n📋 Table structure:');
    const [structure] = await connection.execute(
      "DESCRIBE delivery_notifications"
    );
    
    structure.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''} ${column.Default !== null ? `DEFAULT ${column.Default}` : ''}`);
    });

    // Check for foreign key constraints
    console.log('\n🔗 Foreign key constraints:');
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'gkicks' 
        AND TABLE_NAME = 'delivery_notifications' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (constraints.length === 0) {
      console.log('  No foreign key constraints found');
    } else {
      constraints.forEach(constraint => {
        console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
      });
    }

    // Check data in the table
    console.log('\n📊 Data in delivery_notifications:');
    const [data] = await connection.execute(
      "SELECT COUNT(*) as count FROM delivery_notifications"
    );
    console.log(`  Total records: ${data[0].count}`);

    if (data[0].count > 0) {
      console.log('\n📝 Sample records:');
      const [samples] = await connection.execute(
        "SELECT * FROM delivery_notifications ORDER BY created_at DESC LIMIT 5"
      );
      samples.forEach((record, index) => {
        console.log(`  Record ${index + 1}:`, record);
      });
    }

    // Check related orders table
    console.log('\n🛒 Checking orders table for delivery tracking fields...');
    const [orderStructure] = await connection.execute(
      "DESCRIBE orders"
    );
    
    const deliveryFields = orderStructure.filter(column => 
      ['shipped_at', 'delivered_at', 'tracking_number'].includes(column.Field)
    );
    
    if (deliveryFields.length === 0) {
      console.log('❌ No delivery tracking fields found in orders table');
    } else {
      console.log('✅ Delivery tracking fields in orders:');
      deliveryFields.forEach(field => {
        console.log(`  ${field.Field}: ${field.Type}`);
      });
    }

    // Test the query that the API uses
    console.log('\n🧪 Testing API query...');
    try {
      const [apiTest] = await connection.execute(`
        SELECT 
          dn.id,
          dn.order_id,
          dn.notification_type,
          dn.title,
          dn.message,
          dn.created_at,
          dn.is_read,
          o.order_number,
          COALESCE(CONCAT(u.first_name, ' ', u.last_name), o.customer_email, 'Unknown Customer') as customer_name
        FROM delivery_notifications dn
        JOIN orders o ON dn.order_id = o.id
        LEFT JOIN users u ON dn.user_id = u.id
        WHERE dn.notification_type IN ('delivered', 'delivery_confirmation')
        ORDER BY dn.created_at DESC
        LIMIT 5
      `);
      
      console.log(`✅ API query successful, returned ${apiTest.length} records`);
      if (apiTest.length > 0) {
        console.log('Sample result:', apiTest[0]);
      }
    } catch (queryError) {
      console.log('❌ API query failed:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

debugDeliveryNotifications();