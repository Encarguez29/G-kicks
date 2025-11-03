const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function checkAdminSchema() {
  let connection = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');

    // Check admin_users table schema
    console.log('\n📋 Checking admin_users table schema...');
    const [columns] = await connection.execute(
      'DESCRIBE admin_users'
    );
    console.log('admin_users table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Get all admin_users data to see what's there
    console.log('\n📋 Checking admin_users data...');
    const [adminUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = "gkcksdmn@gmail.com"'
    );
    
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log('Admin user data:');
      Object.keys(adminUser).forEach(key => {
        const value = adminUser[key];
        if (key.toLowerCase().includes('password')) {
          console.log(`- ${key}: ${value ? '[HASH PRESENT]' : '[EMPTY]'}`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      });
    }

    // Also check users table schema
    console.log('\n📋 Checking users table schema...');
    const [userColumns] = await connection.execute(
      'DESCRIBE users'
    );
    console.log('users table columns:');
    userColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminSchema();