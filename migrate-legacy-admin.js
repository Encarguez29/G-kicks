require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function migrateLegacyAdmin() {
  let connection;
  
  try {
    console.log('🔄 Starting migration of legacy admin to admin_users table...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    console.log('✅ Connected to MySQL database');

    // Step 1: Get user data from users table
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, password_hash FROM users WHERE email = ? AND is_admin = 1',
      ['gkcksdmn@gmail.com']
    );

    if (users.length === 0) {
      console.log('❌ User gkcksdmn@gmail.com not found in users table or is not an admin');
      return;
    }

    const user = users[0];
    console.log('✅ Found legacy admin user:', {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      has_password: !!user.password_hash
    });

    // Step 2: Check if user already exists in admin_users table
    const [existingAdminUsers] = await connection.execute(
      'SELECT id FROM admin_users WHERE email = ?',
      [user.email]
    );

    if (existingAdminUsers.length > 0) {
      console.log('⚠️  User already exists in admin_users table with ID:', existingAdminUsers[0].id);
      return;
    }

    // Step 3: Create username from email
    const username = user.email.split('@')[0]; // gkcksdmn

    // Step 4: Set up password - use existing hash or create a default one
    let passwordHash = user.password_hash;
    if (!passwordHash) {
      // Create a default password hash for "admin123" if no password exists
      passwordHash = await bcrypt.hash('admin123', 12);
      console.log('⚠️  No password found, created default password: admin123');
    }

    // Step 5: Set up admin permissions
    const adminPermissions = {
      users: true,
      orders: true,
      products: true,
      analytics: true,
      pos: true,
      settings: true
    };

    // Step 6: Insert into admin_users table
    const [result] = await connection.execute(
      `INSERT INTO admin_users 
       (username, email, password_hash, first_name, last_name, role, permissions, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        username,
        user.email,
        passwordHash,
        user.first_name || 'Admin',
        user.last_name || 'User',
        'admin',
        JSON.stringify(adminPermissions),
        1
      ]
    );

    console.log('✅ Successfully migrated user to admin_users table');
    console.log('📋 Migration Details:');
    console.log('   - New admin_users ID:', result.insertId);
    console.log('   - Username:', username);
    console.log('   - Email:', user.email);
    console.log('   - Role: admin');
    console.log('   - Permissions: Full admin access');
    console.log('   - Status: Active');

    // Step 7: Verify the migration
    const [verifyUser] = await connection.execute(
      'SELECT id, username, email, role, is_active FROM admin_users WHERE email = ?',
      [user.email]
    );

    if (verifyUser.length > 0) {
      console.log('✅ Migration verified successfully!');
      console.log('🎉 gkcksdmn@gmail.com will now appear in the Admin Users management interface');
    } else {
      console.log('❌ Migration verification failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
migrateLegacyAdmin().catch(console.error);