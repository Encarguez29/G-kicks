const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

async function debugLogin() {
  console.log('🔍 Debugging login for gkicksstaff@gmail.com...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    const email = 'gkicksstaff@gmail.com';
    const password = 'gkicksstaff_123';
    
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    
    // Check users table first
    console.log('\n🔍 Checking users table...');
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    console.log('Users table result:', users.length > 0 ? 'Found' : 'Not found');
    if (users.length > 0) {
      console.log('User data:', users[0]);
    }
    
    // Check admin_users table
    console.log('\n🔍 Checking admin_users table...');
    const [adminUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );
    console.log('Admin users table result:', adminUsers.length > 0 ? 'Found' : 'Not found');
    if (adminUsers.length > 0) {
      console.log('Admin user data:', adminUsers[0]);
      
      // Test password verification
      console.log('\n🔐 Testing password verification...');
      console.log('Password hash from DB:', adminUsers[0].password_hash);
      const isValidPassword = await bcrypt.compare(password, adminUsers[0].password_hash);
      console.log('Password valid:', isValidPassword);
      
      if (isValidPassword) {
        console.log('\n🎫 Testing JWT token generation...');
        try {
          const token = jwt.sign(
            {
              userId: adminUsers[0].id,
              email: adminUsers[0].email,
              role: adminUsers[0].role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
          console.log('✅ JWT token generated successfully');
          console.log('Token length:', token.length);
          
          // Verify the token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('✅ JWT token verified successfully');
          console.log('Decoded payload:', decoded);
        } catch (jwtError) {
          console.error('❌ JWT Error:', jwtError.message);
        }
      }
    }
    
    console.log('\n🔧 Environment check...');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
  } finally {
    await connection.end();
  }
}

debugLogin();