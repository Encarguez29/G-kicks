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

async function testBothPasswords() {
  let connection = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');

    // Get all admin users
    console.log('\n🔍 Getting all admin users...');
    const [adminUsers] = await connection.execute(
      'SELECT id, email, password_hash, role FROM admin_users WHERE is_active = 1'
    );
    
    console.log(`Found ${adminUsers.length} active admin users:`);
    adminUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });

    // Test passwords
    const passwords = {
      'gkicksstaff@gmail.com': 'gkicksstaff_123',
      'gkcksdmn@gmail.com': 'admingkicks2.0'
    };

    for (const [email, password] of Object.entries(passwords)) {
      console.log(`\n🧪 Testing ${email} with password "${password}"`);
      
      const user = adminUsers.find(u => u.email === email);
      if (!user) {
        console.log(`❌ User ${email} not found`);
        continue;
      }

      try {
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`Password "${password}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
        
        if (isMatch) {
          console.log(`🎉 Found working credentials: ${email} / ${password}`);
          
          // Test login API
          console.log(`\n🧪 Testing login API for ${email}...`);
          const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              password: password
            })
          });
          
          console.log('📡 Login response status:', loginResponse.status);
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login successful!');
            console.log('🔑 Token received:', !!loginData.token);
            console.log('👤 User role:', loginData.user?.role);
            
            // Test delete API with this token
            console.log(`\n🧪 Testing delete API with ${email} token...`);
            const deleteResponse = await fetch('http://localhost:3000/api/admin/archive/delete', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
              },
              body: JSON.stringify({
                id: 79, // Using another test order ID
                type: 'order'
              })
            });
            
            console.log('📡 Delete response status:', deleteResponse.status);
            const deleteResult = await deleteResponse.text();
            console.log('📡 Delete response:', deleteResult);
            
            if (deleteResponse.ok) {
              console.log(`✅ Delete API works with ${email} token!`);
              console.log('🎉 PROBLEM SOLVED: Frontend authentication should now work');
              console.log(`\n📝 WORKING CREDENTIALS: ${email} / ${password}`);
            } else {
              console.log(`❌ Delete API failed with ${email} token`);
            }
          } else {
            const error = await loginResponse.text();
            console.log('❌ Login failed:', error);
          }
        }
      } catch (error) {
        console.log(`❌ Error testing password for ${email}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testBothPasswords();