const mysql = require('mysql2/promise');

async function checkPasswordColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gkicks',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Checking password-related columns in users table...');
    const [rows] = await pool.execute("SHOW COLUMNS FROM users LIKE 'password%'");
    console.table(rows);
    
    console.log('\nChecking all columns in users table...');
    const [allRows] = await pool.execute('DESCRIBE users');
    console.table(allRows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPasswordColumn();