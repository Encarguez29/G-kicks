const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function fixStaffPasswordHash() {
  let connection;
  
  try {
    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gkicks'
    };

    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Hash the password
    const plainPassword = 'gkicksstaff.123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    
    console.log('🔐 Generated password hash for gkicksstaff.123');
    
    // Update the user's password hash
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'gkicksstaff@gmail.com']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Successfully updated password hash for gkicksstaff@gmail.com');
      
      // Verify the update
      const [users] = await connection.execute(
        'SELECT email, password_hash FROM users WHERE email = ?',
        ['gkicksstaff@gmail.com']
      );
      
      if (users.length > 0 && users[0].password_hash) {
        console.log('✅ Password hash verified in database');
        
        // Test the hash
        const isValid = await bcrypt.compare(plainPassword, users[0].password_hash);
        console.log(`✅ Password verification test: ${isValid ? 'PASSED' : 'FAILED'}`);
      }
    } else {
      console.log('❌ No rows were updated');
    }
    
  } catch (error) {
    console.error('❌ Error fixing staff password hash:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.');
    }
  }
}

fixStaffPasswordHash();