const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkUsersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gkicks'
  });

  try {
    console.log('=== Checking users table for gkicksstaff@gmail.com ===');
    
    const [rows] = await connection.execute(
      'SELECT id, email, is_admin, email_verified, created_at FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    if (rows.length === 0) {
      console.log('✅ No user found in users table (good - should check admin_users)');
    } else {
      console.log('❌ User found in users table (this is the problem!):');
      console.log(JSON.stringify(rows[0], null, 2));
      console.log('\n🔍 This explains why role is "user" - the login is finding the user in the users table first!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsersTable();