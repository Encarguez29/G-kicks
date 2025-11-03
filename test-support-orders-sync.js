const jwt = require('jsonwebtoken');
const axios = require('axios');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

(async () => {
     console.log('🧪 Testing Customer Support Orders Synchronization...\n');

     // Database connection
     const dbConfig = {
       host: process.env.DB_HOST || 'localhost',
       user: process.env.DB_USER || 'root',
       password: process.env.DB_PASSWORD || '',
       database: process.env.DB_NAME || 'gkicks',
       port: parseInt(process.env.DB_PORT || '3306'),
     };

     let connection;
     try {
       connection = await mysql.createConnection(dbConfig);
       console.log('✅ Connected to database');

       // Get a real user from the database
       const [users] = await connection.execute('SELECT id, email FROM users WHERE email_verified = 1 LIMIT 1');
       
       if (users.length === 0) {
         console.log('❌ No verified users found in database');
         return;
       }

       const realUser = users[0];
       console.log(`✅ Found verified user: ${realUser.email} (ID: ${realUser.id})`);

       // Generate JWT token for the real user using the same secret as the API
       const testUser = {
         userId: realUser.id.toString(),
         email: realUser.email
       };

       const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
       const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
       console.log('✅ Generated JWT token for real user');

       // Test the orders API endpoint that customer support should now use
       const response = await axios.get('http://localhost:3000/api/orders', {
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         }
       });

       console.log('✅ API request successful!');
       console.log(`📊 Response status: ${response.status}`);
       console.log(`📦 Orders fetched: ${response.data.length}`);
       
       if (response.data.length > 0) {
         console.log('\n📋 Sample order data:');
         console.log(JSON.stringify(response.data[0], null, 2));
       }

       console.log('\n🎉 Test completed successfully! Customer support orders are now synced with real data.');

     } catch (error) {
       console.error('❌ Test failed:', error.response ? `${error.response.status} ${error.response.statusText}` : error.message);
     } finally {
       if (connection) {
         await connection.end();
         console.log('✅ Database connection closed');
       }
     }
})();