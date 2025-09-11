const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

async function fixStaffPassword() {
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
    
    // Hash the correct password
    const correctPassword = 'gkicksstaff_123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(correctPassword, saltRounds);
    
    console.log('🔐 Updating password for gkicksstaff@gmail.com...');
    
    // Update password in users table
    const [usersResult] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'gkicksstaff@gmail.com']
    );
    
    console.log(`✅ Updated password in users table (${usersResult.affectedRows} rows affected)`);
    
    // Update password in admin_users table
    const [adminResult] = await connection.execute(
      'UPDATE admin_users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'gkicksstaff@gmail.com']
    );
    
    console.log(`✅ Updated password in admin_users table (${adminResult.affectedRows} rows affected)`);
    
    // Verify the password works
    console.log('\n🔍 Verifying password...');
    const [verifyUsers] = await connection.execute(
      'SELECT password_hash FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    if (verifyUsers.length > 0) {
      const isValid = await bcrypt.compare(correctPassword, verifyUsers[0].password_hash);
      console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    }
    
    console.log('\n🎉 Staff password has been updated successfully!');
    console.log('📱 gkicksstaff@gmail.com can now login with password: gkicksstaff_123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed.');
    }
  }
}

fixStaffPassword();