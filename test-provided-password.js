const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function testProvidedPassword() {
  let connection = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');

    // Get admin user password hash
    console.log('\n🔍 Getting admin user password hash...');
    const [adminUsers] = await connection.execute(
      'SELECT id, email, password_hash FROM admin_users WHERE email = "gkcksdmn@gmail.com"'
    );
    
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log('Admin user found:', {
        id: adminUser.id,
        email: adminUser.email
      });
      
      // Test the provided password
      const providedPassword = 'admingkicks2,0';
      console.log(`\n🧪 Testing provided password: "${providedPassword}"`);
      
      try {
        const isMatch = await bcrypt.compare(providedPassword, adminUser.password_hash);
        console.log(`Password "${providedPassword}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
        
        if (isMatch) {
          console.log(`🎉 Found working password: "${providedPassword}"`);
          
          // Now test the login API with this password
          console.log('\n🧪 Testing login API with provided password...');
          const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'gkcksdmn@gmail.com',
              password: providedPassword
            })
          });
          
          console.log('📡 Login response status:', loginResponse.status);
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login successful!');
            console.log('🔑 Token received:', !!loginData.token);
            console.log('👤 User role:', loginData.user?.role);
            
            // Test delete API with this token
            console.log('\n🧪 Testing delete API with login token...');
            const deleteResponse = await fetch('http://localhost:3000/api/admin/archive/delete', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
              },
              body: JSON.stringify({
                id: 78, // Using another order ID from our previous test
                type: 'order'
              })
            });
            
            console.log('📡 Delete response status:', deleteResponse.status);
            const deleteResult = await deleteResponse.text();
            console.log('📡 Delete response:', deleteResult);
            
            if (deleteResponse.ok) {
              console.log('✅ Delete API works with login token!');
              console.log('🎉 PROBLEM SOLVED: Frontend authentication should now work');
              console.log(`\n📝 SOLUTION: Use email "gkcksdmn@gmail.com" and password "${providedPassword}" to login`);
            } else {
              console.log('❌ Delete API still failed with login token');
            }
          } else {
            const error = await loginResponse.text();
            console.log('❌ Login failed:', error);
          }
        } else {
          console.log('❌ Provided password does not match');
        }
      } catch (error) {
        console.log(`❌ Error testing password: ${error.message}`);
      }
    } else {
      console.log('❌ No admin user found with email gkcksdmn@gmail.com');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testProvidedPassword();