const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function addOrderSourceColumn() {
  let connection;
  
  try {
    console.log('🚀 Starting order source column migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });

    console.log('✅ Connected to database');

    // Check if order_source column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'order_source'
    `);

    if (columns.length > 0) {
      console.log('ℹ️  order_source column already exists, skipping migration');
      return;
    }

    // Read and execute the SQL migration file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'add-order-source-column.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // Split SQL statements by semicolon and filter out empty statements and comments
    const statements = sqlContent
      .split(';')
      .map(stmt => {
        // Remove comments and trim
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Handle specific errors gracefully
        if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
          console.log(`   ⚠️  Index already exists, skipping statement ${i + 1}`);
        } else if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column name')) {
          console.log(`   ⚠️  Column already exists, skipping statement ${i + 1}`);
        } else {
          console.error(`   ❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Verify the column was added
    console.log('\n🔍 Verifying order_source column...');
    const [newColumns] = await connection.execute('DESCRIBE orders');
    const orderSourceColumn = newColumns.find(col => col.Field === 'order_source');
    
    if (orderSourceColumn) {
      console.log('✅ order_source column added successfully:');
      console.log(`   Type: ${orderSourceColumn.Type}`);
      console.log(`   Default: ${orderSourceColumn.Default}`);
      console.log(`   Null: ${orderSourceColumn.Null}`);
    } else {
      throw new Error('order_source column was not found after migration');
    }

    // Check sample data
    const [sampleOrders] = await connection.execute('SELECT id, order_number, order_source FROM orders LIMIT 3');
    console.log('\n📊 Sample orders with order_source:');
    sampleOrders.forEach((order, index) => {
      console.log(`   Order ${index + 1}: ID=${order.id}, Number=${order.order_number}, Source=${order.order_source}`);
    });

    console.log('\n🎉 Order source column migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
addOrderSourceColumn();