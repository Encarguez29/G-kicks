const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkUsersColumns() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });

    console.log('✅ Connected to MySQL database');

    // Check users table structure
    console.log('\n📋 Users table columns:');
    const [structure] = await connection.execute("DESCRIBE users");
    
    structure.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type}`);
    });

    // Check if there are any users
    const [count] = await connection.execute("SELECT COUNT(*) as count FROM users");
    console.log(`\n📊 Total users: ${count[0].count}`);

    if (count[0].count > 0) {
      console.log('\n📝 Sample user data:');
      const [sample] = await connection.execute("SELECT * FROM users LIMIT 1");
      console.log(sample[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsersColumns();