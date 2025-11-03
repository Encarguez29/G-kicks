const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function checkAdminUsers() {
  let connection = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');

    // Check admin_users table
    console.log('\n📋 Checking admin_users table...');
    const [adminUsers] = await connection.execute(
      'SELECT id, email, role, is_active FROM admin_users'
    );
    console.log('Admin users found:', adminUsers.length);
    if (adminUsers.length > 0) {
      console.log('Admin users:', adminUsers);
    }

    // Check regular users table for admin users
    console.log('\n📋 Checking users table for admin users...');
    const [regularUsers] = await connection.execute(
      'SELECT id, email, is_admin, email_verified FROM users WHERE email IN ("gkcksdmn@gmail.com", "gkicksstaff@gmail.com")'
    );
    console.log('Regular users with admin emails found:', regularUsers.length);
    if (regularUsers.length > 0) {
      console.log('Regular admin users:', regularUsers);
    }

    // Check all users with admin-like emails
    console.log('\n📋 Checking all users with admin-like emails...');
    const [allAdminEmails] = await connection.execute(
      'SELECT id, email, is_admin, email_verified FROM users WHERE email LIKE "%admin%" OR email LIKE "%gkck%" OR email LIKE "%staff%"'
    );
    console.log('Users with admin-like emails found:', allAdminEmails.length);
    if (allAdminEmails.length > 0) {
      console.log('Admin-like users:', allAdminEmails);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminUsers();