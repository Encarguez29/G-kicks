const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixDuplicateUser() {
  console.log('🔧 Fixing duplicate user entry again...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    const email = 'gkicksstaff@gmail.com';
    
    // Check current state
    console.log('📊 Current state:');
    const [users] = await connection.execute(
      'SELECT id, email, is_admin, created_at FROM users WHERE email = ?',
      [email]
    );
    console.log('Users table:', users);
    
    const [adminUsers] = await connection.execute(
      'SELECT id, email, role, created_at FROM admin_users WHERE email = ?',
      [email]
    );
    console.log('Admin users table:', adminUsers);
    
    if (users.length > 0 && adminUsers.length > 0) {
      console.log('\n🗑️ Removing duplicate from users table...');
      const [result] = await connection.execute(
        'DELETE FROM users WHERE email = ?',
        [email]
      );
      console.log('✅ Deleted', result.affectedRows, 'row(s) from users table');
      
      // Verify deletion
      const [remainingUsers] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE email = ?',
        [email]
      );
      console.log('Remaining users with this email:', remainingUsers[0].count);
      
      console.log('\n✅ Staff user should now authenticate properly with "staff" role');
    } else {
      console.log('\n✅ No duplicate found - user only exists in admin_users table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixDuplicateUser();