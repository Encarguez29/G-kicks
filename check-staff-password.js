// Check staff user password hash
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkStaffPassword() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    console.log('=== Checking Staff Password ===');
    
    const [users] = await connection.execute(
      'SELECT id, email, password FROM admin_users WHERE email = "gkicksstaff@gmail.com"'
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('User found:', user.email);
      console.log('Password hash:', user.password);
      
      // Test common passwords
      const testPasswords = ['staff123', 'password', '123456', 'staff', 'gkicks123'];
      
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          console.log(`Testing '${testPassword}': ${isMatch ? '✅ MATCH' : '❌ No match'}`);
          if (isMatch) {
            console.log(`\n🎉 Correct password found: '${testPassword}'`);
            break;
          }
        } catch (error) {
          console.log(`Testing '${testPassword}': ❌ Error - ${error.message}`);
        }
      }
    } else {
      console.log('No user found with email gkicksstaff@gmail.com');
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStaffPassword();