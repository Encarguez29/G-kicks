const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';

async function testRestoreAPI() {
  try {
    console.log('🧪 Testing Restore API Functionality...\n');
    
    // Generate JWT token for staff user
    const staffToken = jwt.sign(
      { 
        email: 'gkicksstaff@gmail.com',
        role: 'staff',
        userId: 1
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated JWT token for staff user');
    
    // Test restore API with a sample order (assuming we have an archived order with ID 24)
    const testRestoreData = {
      id: 24,
      type: 'order'
    };
    
    console.log('📋 Testing restore API with data:', testRestoreData);
    
    const response = await fetch('http://localhost:3001/api/admin/archive/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify(testRestoreData)
    });
    
    console.log('📡 Response status:', response.status);
    
    const responseData = await response.json();
    console.log('📋 Response data:', responseData);
    
    if (response.ok) {
      console.log('✅ Restore API test successful!');
    } else {
      console.log('❌ Restore API test failed:', responseData.error);
    }
    
    // Test with invalid data
    console.log('\n🧪 Testing with invalid data...');
    
    const invalidResponse = await fetch('http://localhost:3001/api/admin/archive/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ id: 999999, type: 'order' })
    });
    
    const invalidData = await invalidResponse.json();
    console.log('📋 Invalid data response:', invalidData);
    
    // Test without authentication
    console.log('\n🧪 Testing without authentication...');
    
    const noAuthResponse = await fetch('http://localhost:3001/api/admin/archive/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRestoreData)
    });
    
    const noAuthData = await noAuthResponse.json();
    console.log('📋 No auth response:', noAuthData);
    
    console.log('\n✅ Restore API testing completed');
    
  } catch (error) {
    console.error('❌ Error during restore API test:', error);
  }
}

// Run the test
testRestoreAPI().catch(console.error);