const jwt = require('jsonwebtoken');

async function testFrontendAuth() {
  try {
    console.log('🧪 Testing frontend authentication flow...');
    
    // Step 1: Simulate login
    console.log('\n1. Simulating admin login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkcksdmn@gmail.com',
        password: 'admin123'
      })
    });
    
    console.log('📡 Login response status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('❌ Login failed:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('🔑 Token received:', !!loginData.token);
    console.log('👤 User role:', loginData.user?.role);
    
    // Step 2: Simulate storing token in localStorage (like frontend does)
    const token = loginData.token;
    console.log('\n2. Token details:');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    // Decode token to check contents
    const JWT_SECRET = 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Step 3: Test delete API with the token from login
    console.log('\n3. Testing delete API with login token...');
    const deleteResponse = await fetch('http://localhost:3000/api/admin/archive/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: 74, // Using another order ID from our previous test
        type: 'order'
      })
    });
    
    console.log('📡 Delete response status:', deleteResponse.status);
    const deleteResult = await deleteResponse.text();
    console.log('📡 Delete response:', deleteResult);
    
    if (deleteResponse.ok) {
      console.log('✅ Delete API works with login token!');
    } else {
      console.log('❌ Delete API failed with login token');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendAuth();