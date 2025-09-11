const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testLoginDebug() {
  try {
    console.log('=== Testing Login with Debug Info ===');
    
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'gkicksstaff@gmail.com',
      password: 'gkicksstaff_123'
    });
    
    console.log('✅ Login successful');
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.user) {
      console.log('\n📋 User details:');
      console.log('- ID:', response.data.user.id);
      console.log('- Email:', response.data.user.email);
      console.log('- Role in response:', response.data.user.role);
    }
    
    // Decode the JWT token to see what role is actually in it
    if (response.data.token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(response.data.token, process.env.JWT_SECRET);
      console.log('\n🔐 JWT Token payload:');
      console.log(JSON.stringify(decoded, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testLoginDebug();