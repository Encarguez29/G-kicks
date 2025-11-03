const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
};

async function checkAndFixReturnedStatus() {
  let connection;
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check current status enum values
    console.log('\n📋 Checking current status enum values...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM orders LIKE 'status'"
    );
    
    if (columns.length > 0) {
      const statusColumn = columns[0];
      console.log('Current status column type:', statusColumn.Type);
      
      // Check if 'returned' is already in the enum
      if (statusColumn.Type.includes('returned')) {
        console.log('✅ "returned" status already exists in the enum');
      } else {
        console.log('❌ "returned" status not found in enum, adding it...');
        
        // Add 'returned' to the enum
        await connection.execute(`
          ALTER TABLE orders 
          MODIFY COLUMN status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned') 
          DEFAULT 'pending'
          COMMENT 'Order status including returned for products sent back by customers'
        `);
        console.log('✅ Added "returned" status to orders table');
      }
    }

    // Check if returned_at column exists
    console.log('\n📋 Checking for returned_at column...');
    const [returnedAtColumns] = await connection.execute(
      "SHOW COLUMNS FROM orders LIKE 'returned_at'"
    );
    
    if (returnedAtColumns.length > 0) {
      console.log('✅ returned_at column already exists');
    } else {
      console.log('❌ returned_at column not found, adding it...');
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN returned_at TIMESTAMP NULL 
        COMMENT 'When the order was marked as returned by admin/staff'
        AFTER delivered_at
      `);
      console.log('✅ Added returned_at column to orders table');
    }

    // Check and create indexes
    console.log('\n📋 Checking indexes...');
    const [indexes] = await connection.execute(
      "SHOW INDEX FROM orders WHERE Key_name = 'idx_orders_returned_status'"
    );
    
    if (indexes.length > 0) {
      console.log('✅ idx_orders_returned_status index already exists');
    } else {
      console.log('❌ idx_orders_returned_status index not found, creating it...');
      await connection.execute(
        "CREATE INDEX idx_orders_returned_status ON orders(status, returned_at)"
      );
      console.log('✅ Created idx_orders_returned_status index');
    }

    const [returnedAtIndexes] = await connection.execute(
      "SHOW INDEX FROM orders WHERE Key_name = 'idx_orders_returned_at'"
    );
    
    if (returnedAtIndexes.length > 0) {
      console.log('✅ idx_orders_returned_at index already exists');
    } else {
      console.log('❌ idx_orders_returned_at index not found, creating it...');
      await connection.execute(
        "CREATE INDEX idx_orders_returned_at ON orders(returned_at)"
      );
      console.log('✅ Created idx_orders_returned_at index');
    }

    // Test the return functionality by checking if we can query returned orders
    console.log('\n🧪 Testing returned status functionality...');
    const [returnedOrders] = await connection.execute(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'returned'"
    );
    console.log(`✅ Found ${returnedOrders[0].count} returned orders in database`);

    console.log('\n🎉 Database schema check and fix completed successfully!');
    console.log('The return button should now work properly.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkAndFixReturnedStatus();