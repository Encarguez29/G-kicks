const jwt = require('jsonwebtoken');

async function testDeleteEndpoint() {
  try {
    // Create a test JWT token using the correct secret
    const JWT_SECRET = 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';
    const token = jwt.sign(
      { 
        id: 1, 
        username: 'admin', 
        role: 'admin' 
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated JWT token for testing');
    
    // Test delete API with order ID 68 (we know it exists from previous test)
    const testData = {
      id: 68,
      type: 'order'
    };
    
    console.log('🧪 Testing delete API with data:', testData);
    
    const response = await fetch('http://localhost:3000/api/admin/archive/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('📡 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Delete API test successful!');
    } else {
      console.log('❌ Delete API test failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeleteEndpoint();