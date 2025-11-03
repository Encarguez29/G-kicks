const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function testAdminPassword() {
  let connection = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');

    // Get admin user password hash from admin_users table
    console.log('\n🔍 Checking admin_users table password...');
    const [adminUsers] = await connection.execute(
      'SELECT id, email, password, password_hash FROM admin_users WHERE email = "gkcksdmn@gmail.com"'
    );
    
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log('Admin user found in admin_users table:', {
        id: adminUser.id,
        email: adminUser.email,
        hasPassword: !!adminUser.password,
        hasPasswordHash: !!adminUser.password_hash
      });
      
      // Test common passwords
      const testPasswords = ['admin123', 'password', 'admin', 'gkicks123', '123456'];
      const passwordField = adminUser.password_hash || adminUser.password;
      
      if (passwordField) {
        console.log('\n🧪 Testing common passwords...');
        for (const testPassword of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPassword, passwordField);
            console.log(`Password "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
            if (isMatch) {
              console.log(`🎉 Found working password: "${testPassword}"`);
              break;
            }
          } catch (error) {
            console.log(`Password "${testPassword}": ❌ Error testing - ${error.message}`);
          }
        }
      }
    }

    // Also check regular users table
    console.log('\n🔍 Checking users table password...');
    const [regularUsers] = await connection.execute(
      'SELECT id, email, password_hash FROM users WHERE email = "gkcksdmn@gmail.com"'
    );
    
    if (regularUsers.length > 0) {
      const regularUser = regularUsers[0];
      console.log('Admin user found in users table:', {
        id: regularUser.id,
        email: regularUser.email,
        hasPasswordHash: !!regularUser.password_hash
      });
      
      // Test common passwords
      const testPasswords = ['admin123', 'password', 'admin', 'gkicks123', '123456'];
      
      if (regularUser.password_hash) {
        console.log('\n🧪 Testing common passwords for users table...');
        for (const testPassword of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPassword, regularUser.password_hash);
            console.log(`Password "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
            if (isMatch) {
              console.log(`🎉 Found working password: "${testPassword}"`);
              break;
            }
          } catch (error) {
            console.log(`Password "${testPassword}": ❌ Error testing - ${error.message}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testAdminPassword();