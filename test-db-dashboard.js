const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gkicks',
};

async function testDashboardQueries() {
  let connection = null;

  try {
    console.log('🔌 Connecting to MySQL database...');
    console.log('Config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      hasPassword: !!dbConfig.password
    });
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Test 1: Check if products table exists and has data
    console.log('\n📋 Testing products table...');
    try {
      const [products] = await connection.execute(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
          SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= 5 THEN 1 ELSE 0 END) as low_stock_products,
          SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_products,
          SUM(CASE WHEN stock_quantity > 5 THEN 1 ELSE 0 END) as in_stock_products
        FROM products
      `);
      console.log('✅ Products query successful:', products[0]);
    } catch (error) {
      console.error('❌ Products query failed:', error.message);
    }

    // Test 2: Check if orders table exists and has data
    console.log('\n📋 Testing orders table...');
    try {
      const [orders] = await connection.execute(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END) as completed_orders,
          COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'refunded') THEN total_amount END), 0) as total_revenue
        FROM orders
      `);
      console.log('✅ Orders query successful:', orders[0]);
    } catch (error) {
      console.error('❌ Orders query failed:', error.message);
    }

    // Test 3: Check if users table exists and has data
    console.log('\n📋 Testing users table...');
    try {
      const [users] = await connection.execute(`
        SELECT COUNT(*) as total_users
        FROM users
      `);
      console.log('✅ Users query successful:', users[0]);
    } catch (error) {
      console.error('❌ Users query failed:', error.message);
    }

    // Test 4: Check if pos_transactions table exists
    console.log('\n📋 Testing pos_transactions table...');
    try {
      const [pos] = await connection.execute(`
        SELECT COUNT(*) as total_pos_transactions
        FROM pos_transactions
        WHERE status = 'completed'
      `);
      console.log('✅ POS transactions query successful:', pos[0]);
    } catch (error) {
      console.error('❌ POS transactions query failed (table might not exist):', error.message);
    }

    // Test 5: Check admin authentication
    console.log('\n📋 Testing admin user authentication...');
    try {
      const [adminUsers] = await connection.execute(`
        SELECT id, email, is_admin 
        FROM users 
        WHERE email = 'gkcksdmn@gmail.com' AND is_admin = 1
      `);
      console.log('✅ Admin user check:', adminUsers.length > 0 ? 'Admin user found' : 'No admin user found');
      if (adminUsers.length > 0) {
        console.log('Admin user:', adminUsers[0]);
      }
    } catch (error) {
      console.error('❌ Admin user query failed:', error.message);
    }

    // Test 6: Check admin_users table
    console.log('\n📋 Testing admin_users table...');
    try {
      const [staffUsers] = await connection.execute(`
        SELECT id, email, role, is_active 
        FROM admin_users 
        WHERE email = 'gkcksdmn@gmail.com' AND is_active = 1
      `);
      console.log('✅ Staff admin user check:', staffUsers.length > 0 ? 'Staff admin user found' : 'No staff admin user found');
      if (staffUsers.length > 0) {
        console.log('Staff admin user:', staffUsers[0]);
      }
    } catch (error) {
      console.error('❌ Admin_users query failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Connection closed');
    }
  }
}

testDashboardQueries();