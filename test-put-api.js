// Using built-in fetch API (Node.js 18+)

async function testPutAPI() {
  try {
    console.log('🧪 Testing PUT API directly...');
    
    // First, let's try to get a token by simulating login
    console.log('\n🔐 Step 1: Getting authentication token...');
    
    // For this test, we'll use a hardcoded token that should work
    // In a real scenario, you'd get this from login
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiZ2tpY2tzYWRtaW5AZ21haWwuY29tIiwiaWF0IjoxNzU1OTcyOTk4LCJleHAiOjE3NTU5NzY1OTh9.YourTokenHere';
    
    // Let's try to get the current profile first
    console.log('\n📋 Step 2: Getting current profile...');
    const getResponse = await fetch('http://localhost:3001/api/profiles', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    if (!getResponse.ok) {
      console.log('❌ Failed to get profile:', getResponse.status);
      console.log('Response:', await getResponse.text());
      return;
    }
    
    const currentProfile = await getResponse.json();
    console.log('✅ Current profile:', JSON.stringify(currentProfile, null, 2));
    
    // Now test the PUT request
    console.log('\n💾 Step 3: Testing PUT request...');
    const testData = {
      first_name: 'API Test',
      last_name: 'Direct PUT',
      phone: '+9876543210',
      birthdate: '',
      gender: '',
      bio: 'Testing PUT API directly',
      avatar_url: currentProfile.avatar_url || '',
      preferences: {
        newsletter: false,
        sms_notifications: true,
        email_notifications: false,
        preferred_language: 'es',
        currency: 'EUR'
      }
    };
    
    console.log('📝 Sending PUT data:', JSON.stringify(testData, null, 2));
    
    const putResponse = await fetch('http://localhost:3001/api/profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 PUT Response status:', putResponse.status);
    
    if (putResponse.ok) {
      const result = await putResponse.json();
      console.log('✅ PUT request successful!');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    } else {
      const error = await putResponse.text();
      console.log('❌ PUT request failed:', error);
    }
    
    // Verify the update
    console.log('\n🔍 Step 4: Verifying update...');
    const verifyResponse = await fetch('http://localhost:3001/api/profiles', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    if (verifyResponse.ok) {
      const updatedProfile = await verifyResponse.json();
      console.log('✅ Updated profile:', JSON.stringify(updatedProfile, null, 2));
      
      // Check if the update persisted
      if (updatedProfile.first_name === 'API Test' && updatedProfile.last_name === 'Direct PUT') {
        console.log('🎉 SUCCESS: Profile update persisted correctly!');
      } else {
        console.log('❌ FAILURE: Profile update did not persist');
      }
    }
    
    // Restore original data
    console.log('\n🔄 Step 5: Restoring original data...');
    const restoreResponse = await fetch('http://localhost:3001/api/profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        first_name: currentProfile.first_name,
        last_name: currentProfile.last_name,
        phone: currentProfile.phone,
        birthdate: currentProfile.birthdate,
        gender: currentProfile.gender,
        bio: currentProfile.bio,
        avatar_url: currentProfile.avatar_url,
        preferences: currentProfile.preferences
      })
    });
    
    if (restoreResponse.ok) {
      console.log('✅ Original data restored');
    } else {
      console.log('❌ Failed to restore original data');
    }
    
  } catch (error) {
    console.error('❌ Error testing PUT API:', error);
  }
}

testPutAPI();