// Using built-in fetch (Node.js 18+)
const jwt = require('jsonwebtoken');

async function testOrdersAPI() {
  try {
    console.log('🔍 Testing Orders API directly...');
    
    // Create a test JWT token for user ID 1 (gkcksdmn@gmail.com)
    const JWT_SECRET = 'gkicks-super-secret-jwt-key-2024';
    const testToken = jwt.sign(
      { 
        userId: '1', 
        email: 'gkcksdmn@gmail.com',
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🔐 Generated test JWT token for user ID 1');
    console.log('🔐 Token preview:', testToken.substring(0, 50) + '...');
    console.log('🔐 JWT_SECRET used:', JWT_SECRET.substring(0, 20) + '...');
    
    // Decode the token to verify it's correct
    try {
      const decoded = jwt.decode(testToken);
      console.log('🔐 Token payload:', JSON.stringify(decoded, null, 2));
    } catch (error) {
      console.log('❌ Error decoding token:', error.message);
    }
    
    // Test the /api/auth/me endpoint first
    console.log('\n🔍 Testing /api/auth/me endpoint...');
    const authResponse = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔐 Auth response status:', authResponse.status);
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('🔐 Auth data:', JSON.stringify(authData, null, 2));
    } else {
      const authError = await authResponse.text();
      console.log('❌ Auth error:', authError);
    }
    
    // Test the /api/orders endpoint
    console.log('\n🔍 Testing /api/orders endpoint...');
    const ordersResponse = await fetch('http://localhost:3001/api/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📦 Orders response status:', ordersResponse.status);
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('📦 Orders data:', JSON.stringify(ordersData, null, 2));
      console.log('📦 Number of orders:', Array.isArray(ordersData) ? ordersData.length : 'Not an array');
    } else {
      const ordersError = await ordersResponse.text();
      console.log('❌ Orders error:', ordersError);
    }
    
    // Test the debug endpoint
    console.log('\n🔍 Testing /api/debug/orders endpoint...');
    const debugResponse = await fetch('http://localhost:3001/api/debug/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔧 Debug response status:', debugResponse.status);
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('🔧 Debug data:', JSON.stringify(debugData, null, 2));
    } else {
      const debugError = await debugResponse.text();
      console.log('❌ Debug error:', debugError);
    }
    
  } catch (error) {
    console.error('❌ Error testing orders API:', error);
  }
}

testOrdersAPI();