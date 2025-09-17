require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function addGkicksstaffToUsers() {
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

    // Check if user already exists in users table
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );

    if (existingUsers.length > 0) {
      console.log('ℹ️  User gkicksstaff@gmail.com already exists in users table');
      console.log('   User ID:', existingUsers[0].id);
      console.log('   Username:', existingUsers[0].username);
      console.log('   Email Verified:', existingUsers[0].email_verified ? 'YES' : 'NO');
      return;
    }

    // Get admin user info from admin_users table for reference
    const [adminUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );

    if (adminUsers.length === 0) {
      console.log('❌ Admin user not found in admin_users table');
      return;
    }

    const adminUser = adminUsers[0];
    console.log('📋 Found admin user info:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role
    });

    // Insert user into users table
    const insertQuery = `
      INSERT INTO users (
        email, 
        password_hash, 
        first_name,
        last_name,
        email_verified, 
        is_admin,
        is_active,
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [insertResult] = await connection.execute(insertQuery, [
      adminUser.email,              // gkicksstaff@gmail.com
      null,                         // No password hash (will use OAuth)
      adminUser.first_name || 'GKicks',  // First name from admin or default
      adminUser.last_name || 'Staff',    // Last name from admin or default
      1,                            // Email verified (since it's staff)
      0,                            // Not legacy admin (regular user)
      1                             // Active user
    ]);

    console.log('✅ Successfully added gkicksstaff@gmail.com to users table');
    console.log('   New User ID:', insertResult.insertId);
    console.log('   Email:', adminUser.email);
    console.log('   First Name:', adminUser.first_name || 'GKicks');
    console.log('   Last Name:', adminUser.last_name || 'Staff');
    console.log('   Email Verified: YES');
    console.log('   Authentication: OAuth (Google)');

    // Verify the insertion
    const [verifyUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['gkicksstaff@gmail.com']
    );

    if (verifyUsers.length > 0) {
      console.log('🔍 Verification successful - User now exists in users table');
      console.log('   This user will now appear in the Manage Users section');
    }

  } catch (error) {
    console.error('❌ Error adding user to users table:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addGkicksstaffToUsers()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });