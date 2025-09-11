const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixDuplicateStaffUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gkicks'
  });

  try {
    console.log('=== Fixing Duplicate Staff User Issue ===');
    
    // First, confirm the user exists in both tables
    console.log('\n1. Checking current state...');
    
    const [usersRows] = await connection.execute(
      'SELECT id, email, is_admin FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    const [adminRows] = await connection.execute(
      'SELECT id, email, role FROM admin_users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    console.log('Users table entry:', usersRows[0] || 'Not found');
    console.log('Admin_users table entry:', adminRows[0] || 'Not found');
    
    if (usersRows.length > 0 && adminRows.length > 0) {
      console.log('\n2. Removing duplicate entry from users table...');
      
      const [result] = await connection.execute(
        'DELETE FROM users WHERE email = ?',
        ['gkicksstaff@gmail.com']
      );
      
      console.log(`✅ Removed ${result.affectedRows} row(s) from users table`);
      console.log('\n✅ Staff user should now authenticate properly with role "staff"');
    } else {
      console.log('\n❌ Expected duplicate not found. No changes made.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixDuplicateStaffUser();