const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';

async function generateValidJWTTokens() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Database connected successfully');
    console.log('🔑 JWT Secret:', JWT_SECRET.substring(0, 20) + '...');
    
    // Get regular users
    console.log('\n📋 Fetching regular users...');
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, email_verified FROM users WHERE email_verified = 1 LIMIT 5'
    );
    
    // Get admin users
    console.log('📋 Fetching admin users...');
    const [adminUsers] = await connection.execute(
      'SELECT id, email, username, role, is_active FROM admin_users WHERE is_active = 1 LIMIT 5'
    );
    
    console.log('\n🎫 VALID JWT TOKENS FOR SYSTEM USERS:\n');
    console.log('=' .repeat(80));
    
    // Generate tokens for regular users
    if (users.length > 0) {
      console.log('\n👤 CUSTOMER TOKENS:');
      console.log('-'.repeat(50));
      
      users.forEach((user, index) => {
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: 'user'
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        console.log(`\n${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Verified: ${user.email_verified ? 'Yes' : 'No'}`);
        console.log(`   Token: ${token}`);
        console.log(`   \n   🌐 Test in browser:`);
        console.log(`   localStorage.setItem('auth_token', '${token}');`);
      });
    } else {
      console.log('\n❌ No verified customer users found');
    }
    
    // Generate tokens for admin users
    if (adminUsers.length > 0) {
      console.log('\n\n👑 ADMIN/STAFF TOKENS:');
      console.log('-'.repeat(50));
      
      adminUsers.forEach((admin, index) => {
        const token = jwt.sign(
          {
            userId: admin.id,
            email: admin.email,
            username: admin.username,
            role: admin.role
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        console.log(`\n${index + 1}. Admin ID: ${admin.id}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
        console.log(`   Token: ${token}`);
        console.log(`   \n   🌐 Test in browser:`);
        console.log(`   localStorage.setItem('auth_token', '${token}');`);
      });
    } else {
      console.log('\n❌ No active admin users found');
    }
    
    // Generate a test token for user ID 27 (from our previous tests)
    console.log('\n\n🧪 TEST TOKEN FOR USER ID 27:');
    console.log('-'.repeat(50));
    
    const [testUser] = await connection.execute(
      'SELECT id, email, first_name, last_name FROM users WHERE id = 27'
    );
    
    if (testUser.length > 0) {
      const user = testUser[0];
      const testToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log(`User ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log(`Token: ${testToken}`);
      console.log(`\n🌐 Test in browser:`);
      console.log(`localStorage.setItem('auth_token', '${testToken}');`);
      
      // Verify the token
      try {
        const decoded = jwt.verify(testToken, JWT_SECRET);
        console.log(`\n✅ Token verification successful:`);
        console.log(`   User ID: ${decoded.userId}`);
        console.log(`   Email: ${decoded.email}`);
        console.log(`   Role: ${decoded.role}`);
      } catch (verifyError) {
        console.log(`\n❌ Token verification failed:`, verifyError.message);
      }
    } else {
      console.log('❌ User ID 27 not found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 USAGE INSTRUCTIONS:');
    console.log('1. Copy any token above');
    console.log('2. Open browser developer tools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Paste the localStorage command');
    console.log('5. Refresh the page');
    console.log('6. Check if notifications appear in the bell icon');
    
    console.log('\n🔗 API Testing:');
    console.log('Use tokens with Authorization header: Bearer <token>');
    console.log('Customer notifications: GET /api/customer/delivery-notifications');
    console.log('Admin notifications: GET /api/admin/delivery-notifications');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

generateValidJWTTokens();