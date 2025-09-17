const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testRestoreFunctionality() {
  let connection;
  
  try {
    console.log('🔍 Testing Restore Functionality...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Check for archived items
    console.log('\n📦 Checking for archived items...');
    
    // Check archived products
    const [archivedProducts] = await connection.execute(`
      SELECT id, name, is_deleted 
      FROM products 
      WHERE is_deleted = 1 
      LIMIT 5
    `);
    console.log(`📦 Found ${archivedProducts.length} archived products`);
    
    // Check archived orders
    const [archivedOrders] = await connection.execute(`
      SELECT id, status 
      FROM orders 
      WHERE status IN ('cancelled', 'refunded') 
      LIMIT 5
    `);
    console.log(`📦 Found ${archivedOrders.length} archived orders`);
    
    // Check archived users
    const [archivedUsers] = await connection.execute(`
      SELECT id, email, is_active 
      FROM users 
      WHERE is_active = 0 
      LIMIT 5
    `);
    console.log(`📦 Found ${archivedUsers.length} archived users`);
    
    // Check archived carousel slides
    const [archivedSlides] = await connection.execute(`
      SELECT id, title, is_archived 
      FROM carousel_slides 
      WHERE is_archived = 1 
      LIMIT 5
    `);
    console.log(`📦 Found ${archivedSlides.length} archived carousel slides`);
    
    // Test JWT token generation for staff user
    console.log('\n🔑 Testing JWT token generation...');
    const staffToken = jwt.sign(
      { 
        email: 'gkicksstaff@gmail.com',
        role: 'staff',
        userId: 1
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('✅ Staff JWT token generated successfully');
    
    // Test token verification
    try {
      const decoded = jwt.verify(staffToken, JWT_SECRET);
      console.log('✅ JWT token verification successful');
      console.log('📋 Token payload:', {
        email: decoded.email,
        role: decoded.role,
        userId: decoded.userId
      });
    } catch (error) {
      console.log('❌ JWT token verification failed:', error.message);
    }
    
    // Test restore API endpoint simulation
    console.log('\n🧪 Testing restore logic simulation...');
    
    if (archivedProducts.length > 0) {
      const testProduct = archivedProducts[0];
      console.log(`🧪 Testing product restore for ID: ${testProduct.id}`);
      
      // Simulate restore query
      const [restoreResult] = await connection.execute(`
        UPDATE products 
        SET is_deleted = 0, updated_at = NOW() 
        WHERE id = ? AND is_deleted = 1
      `, [testProduct.id]);
      
      if (restoreResult.affectedRows > 0) {
        console.log('✅ Product restore query successful');
        
        // Revert the change for testing purposes
        await connection.execute(`
          UPDATE products 
          SET is_deleted = 1 
          WHERE id = ?
        `, [testProduct.id]);
        console.log('🔄 Reverted test change');
      } else {
        console.log('❌ Product restore query failed - no rows affected');
      }
    }
    
    // Test authentication requirements
    console.log('\n🔐 Testing authentication requirements...');
    
    // Check admin_users table
    const [adminUsers] = await connection.execute(`
      SELECT email, role 
      FROM admin_users 
      WHERE email IN ('gkcksdmn@gmail.com', 'gkicksstaff@gmail.com')
    `);
    console.log(`👥 Found ${adminUsers.length} admin users:`, adminUsers);
    
    // Check users table for legacy admin
    const [legacyAdmin] = await connection.execute(`
      SELECT email, role 
      FROM users 
      WHERE email = 'gkcksdmn@gmail.com'
    `);
    console.log(`👤 Legacy admin check:`, legacyAdmin.length > 0 ? legacyAdmin[0] : 'Not found');
    
    console.log('\n✅ Restore functionality test completed');
    
  } catch (error) {
    console.error('❌ Error during restore functionality test:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testRestoreFunctionality().catch(console.error);