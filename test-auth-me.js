// Test auth/me endpoint for staff user
require('dotenv').config({ path: '.env.local' });

async function testAuthMe() {
  try {
    console.log('🧪 Testing auth/me endpoint for staff user...');
    
    // Step 1: Login with staff credentials
    console.log('\n1. Logging in with staff credentials...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkicksstaff@gmail.com',
        password: 'gkicksstaff_123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Test /api/auth/me endpoint
    console.log('\n2. Testing /api/auth/me endpoint...');
    const meResponse = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const meData = await meResponse.json();
    console.log('Auth/me response status:', meResponse.status);
    console.log('Auth/me response data:', JSON.stringify(meData, null, 2));
    
    if (meData.user && meData.user.role) {
      console.log('\n✅ User role detected:', meData.user.role);
      if (meData.user.role === 'staff') {
        console.log('🎉 Staff role correctly detected!');
      } else {
        console.log('⚠️ Expected staff role, got:', meData.user.role);
      }
    } else {
      console.log('❌ No role field found in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthMe();