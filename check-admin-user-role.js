const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAdminUserRole() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gkicks'
  });

  try {
    console.log('=== Checking admin_users table for gkicksstaff@gmail.com ===');
    
    const [rows] = await connection.execute(
      'SELECT id, email, role, is_active, created_at FROM admin_users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    if (rows.length === 0) {
      console.log('❌ No user found in admin_users table');
    } else {
      console.log('✅ User found in admin_users table:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAdminUserRole();