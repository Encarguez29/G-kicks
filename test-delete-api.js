const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testDeleteAPI() {
  let connection = null;

  try {
    console.log('🔌 Testing database connection...');
    console.log('Database config:', {
      ...dbConfig,
      password: dbConfig.password ? '[HIDDEN]' : '[EMPTY]'
    });

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful');

    // Test JWT token creation
    console.log('🔑 Testing JWT token...');
    const testToken = jwt.sign(
      { 
        id: 1, 
        email: 'admin@test.com', 
        role: 'admin' 
      }, 
      JWT_SECRET
    );
    console.log('✅ JWT token created successfully');

    // Verify JWT token
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('✅ JWT token verified:', decoded);

    // Check if there are any archived orders to test with
    console.log('🔍 Checking for archived orders...');
    const [orders] = await connection.execute(
      'SELECT id, status FROM orders WHERE status IN ("cancelled", "refunded") LIMIT 5'
    );
    console.log('📦 Found archived orders:', orders.length);
    if (orders.length > 0) {
      console.log('Sample orders:', orders);
    }

    // Check if there are any soft-deleted products
    console.log('🔍 Checking for soft-deleted products...');
    const [products] = await connection.execute(
      'SELECT id, name, is_deleted FROM products WHERE is_deleted = 1 LIMIT 5'
    );
    console.log('🛍️ Found soft-deleted products:', products.length);
    if (products.length > 0) {
      console.log('Sample products:', products);
    }

    // Check admin users with deleted_at
    console.log('🔍 Checking for deleted admin users...');
    const [adminUsers] = await connection.execute(
      'SELECT id, email, deleted_at FROM admin_users WHERE deleted_at IS NOT NULL LIMIT 5'
    );
    console.log('👤 Found deleted admin users:', adminUsers.length);
    if (adminUsers.length > 0) {
      console.log('Sample admin users:', adminUsers);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Database connection refused. Make sure MySQL is running on port', dbConfig.port);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Access denied. Check your database credentials.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Database does not exist. Make sure the database "' + dbConfig.database + '" exists.');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

testDeleteAPI();