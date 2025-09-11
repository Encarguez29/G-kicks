// Test JWT token verification between login and POS inventory APIs
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

async function testJWTVerification() {
  try {
    console.log('=== Testing JWT Token Verification ===');
    
    // Get JWT_SECRET from environment
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    console.log('JWT_SECRET preview:', JWT_SECRET.substring(0, 20) + '...');
    
    // Step 1: Login and get token
    console.log('\n1. Logging in to get JWT token...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'gkicksstaff@gmail.com',
        password: 'gkicksstaff_123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, token received');
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    // Debug: Show full login response
      console.log('\n📋 Full login response:');
      console.log('Response data:', JSON.stringify(loginResponse.data, null, 2));
    
    // Step 2: Manually verify the token using the same secret
    console.log('\n2. Manually verifying token with JWT_SECRET...');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verification successful');
      console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      return;
    }
    
    // Step 3: Test POS inventory API with the token
    console.log('\n3. Testing POS inventory API with token...');
    const posResponse = await fetch('http://localhost:3001/api/pos/inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('POS API status:', posResponse.status);
    if (posResponse.ok) {
      const posData = await posResponse.json();
      console.log('✅ POS API successful, products returned:', posData.length);
    } else {
      const errorData = await posResponse.json();
      console.log('❌ POS API failed:', errorData);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testJWTVerification();