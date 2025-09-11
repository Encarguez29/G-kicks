const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkGkicksStaffStatus() {
  let connection;
  
  try {
    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gkicks'
    };

    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check user gkicksstaff@gmail.com in users table
    const [users] = await connection.execute(
      'SELECT id, email, password_hash, email_verified, is_admin, created_at FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    console.log('\n👤 User Status for gkicksstaff@gmail.com:');
    if (users.length === 0) {
      console.log('❌ User not found in users table');
    } else {
      const user = users[0];
      console.log(`✅ User found:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Has Password: ${user.password_hash ? 'YES' : 'NO (NULL)'}`);
      console.log(`   Email Verified: ${user.email_verified ? 'YES' : 'NO'}`);
      console.log(`   Is Admin: ${user.is_admin ? 'YES' : 'NO'}`);
      console.log(`   Created: ${user.created_at}`);
    }
    
    // Check admin_users table
    const [adminUsers] = await connection.execute(
      'SELECT id, email, role, is_active, permissions, created_at FROM admin_users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    console.log('\n🔐 Admin Status for gkicksstaff@gmail.com:');
    if (adminUsers.length === 0) {
      console.log('❌ User not found in admin_users table');
    } else {
      const adminUser = adminUsers[0];
      console.log(`✅ Admin user found:`);
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Is Active: ${adminUser.is_active ? 'YES' : 'NO'}`);
      console.log(`   Permissions: ${adminUser.permissions}`);
      console.log(`   Created: ${adminUser.created_at}`);
    }
    
    // Check if user exists in either table
    if (users.length === 0 && adminUsers.length === 0) {
      console.log('\n❌ ISSUE FOUND: gkicksstaff@gmail.com does not exist in either users or admin_users table!');
      console.log('\n🔧 SOLUTIONS:');
      console.log('1. Create the user in admin_users table with staff role');
      console.log('2. Or create the user in users table and set appropriate permissions');
      console.log('3. The user needs to exist in the database to access admin features');
    } else if (adminUsers.length === 0 && users.length > 0) {
      console.log('\n⚠️  WARNING: User exists in users table but not in admin_users table');
      console.log('   This might cause issues with staff permissions');
    }
    
    console.log('\n🔍 Authentication Methods Available:');
    console.log('1. Google OAuth (NextAuth) - Recommended for users without password');
    console.log('2. Email/Password - Requires password_hash to be set');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed.');
    }
  }
}

checkGkicksStaffStatus();