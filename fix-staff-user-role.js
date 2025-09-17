require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function fixStaffUserRole() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gkicks'
    });

    console.log('✅ Connected to database successfully');

    // First, verify the current state
    console.log('\n🔍 Current state:');
    
    const [usersRows] = await connection.execute(
      'SELECT id, email, is_admin, email_verified FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    const [adminRows] = await connection.execute(
      'SELECT id, email, role, is_active FROM admin_users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    console.log('Users table:', usersRows.length > 0 ? usersRows[0] : 'Not found');
    console.log('Admin_users table:', adminRows.length > 0 ? adminRows[0] : 'Not found');
    
    if (usersRows.length === 0) {
      console.log('✅ User not found in users table - already fixed!');
      return;
    }
    
    if (adminRows.length === 0) {
      console.log('❌ User not found in admin_users table - cannot proceed!');
      return;
    }
    
    // Remove from users table
    console.log('\n🗑️  Removing gkicksstaff@gmail.com from users table...');
    
    const [deleteResult] = await connection.execute(
      'DELETE FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    console.log('✅ Successfully removed user from users table');
    console.log('   Rows affected:', deleteResult.affectedRows);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix:');
    
    const [verifyUsers] = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    const [verifyAdmin] = await connection.execute(
      'SELECT id, email, role FROM admin_users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );
    
    console.log('Users table:', verifyUsers.length > 0 ? 'Still exists (ERROR!)' : '✅ Removed');
    console.log('Admin_users table:', verifyAdmin.length > 0 ? `✅ Exists with role: ${verifyAdmin[0].role}` : '❌ Missing');
    
    console.log('\n🎉 Fix completed! Now the login API will:');
    console.log('1. Check users table - not found');
    console.log('2. Check admin_users table - found with role "staff"');
    console.log('3. Generate JWT token with role "staff"');
    console.log('4. Allow access to POS inventory API');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixStaffUserRole().catch(console.error);