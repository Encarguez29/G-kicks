// Direct test of profile PUT API endpoint
const testProfilePUT = async () => {
  console.log('🧪 Testing Profile PUT API directly...');
  
  try {
    // Step 1: Get auth token (simulate browser localStorage)
    console.log('\n📋 Step 1: Simulating authentication...');
    
    // First, let's test with a mock token to see the API structure
    const mockProfileData = {
      first_name: 'Test',
      last_name: 'User', 
      phone: '+1234567890',
      bio: 'Test bio for PUT request',
      birthdate: '',
      gender: '',
      preferences: {
        newsletter: true,
        sms_notifications: false,
        email_notifications: true,
        preferred_language: 'en',
        currency: 'PHP'
      }
    };
    
    console.log('📝 Profile data to send:');
    console.log(JSON.stringify(mockProfileData, null, 2));
    
    // Step 2: Test the PUT endpoint structure
    console.log('\n🔍 Step 2: Testing PUT endpoint...');
    
    const response = await fetch('http://localhost:3001/api/profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-for-testing'
      },
      body: JSON.stringify(mockProfileData)
    });
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`📋 Response body: ${responseText}`);
    
    if (response.status === 401) {
      console.log('✅ PUT endpoint is working (returned 401 as expected for invalid token)');
      console.log('🔑 The endpoint correctly validates authentication');
    } else {
      console.log(`❌ Unexpected response status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing PUT endpoint:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Run the test
testProfilePUT().then(() => {
  console.log('\n✅ Profile PUT test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});