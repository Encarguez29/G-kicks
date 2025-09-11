// Check staff users in database
const mysql = require('mysql2/promise');

async function checkStaffUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    console.log('=== Checking Staff Users ===');
    
    const [users] = await connection.execute(
      'SELECT id, email, role, is_active FROM admin_users WHERE role = "staff" OR email LIKE "%staff%"'
    );
    
    console.log('Staff users found:');
    console.table(users);
    
    // Also check all admin users
    const [allUsers] = await connection.execute(
      'SELECT id, email, role, is_active FROM admin_users LIMIT 10'
    );
    
    console.log('\nAll admin users:');
    console.table(allUsers);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStaffUsers();