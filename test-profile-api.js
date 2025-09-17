// Test profile update via API to simulate frontend behavior
// Using built-in fetch (Node.js 18+)

async function testProfileAPI() {
  try {
    console.log('🧪 Testing profile API update...');
    
    // First get a token (simulate login)
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkicksadmn@gmail.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, token received');
    
    // Test profile update
    const updateData = {
      first_name: 'Updated First Name',
      last_name: 'Updated Last Name',
      phone: '+1234567890',
      birthdate: '',
      gender: '',
      bio: 'Updated bio from API test',
      avatar_url: '',
      preferences: {
        newsletter: true,
        sms_notifications: false,
        email_notifications: true,
        preferred_language: 'en',
        currency: 'PHP'
      }
    };
    
    console.log('📝 Sending profile update:', updateData);
    
    const updateResponse = await fetch('http://localhost:3001/api/profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📊 Update response status:', updateResponse.status);
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('✅ Profile update successful:', updateResult);
    } else {
      const errorText = await updateResponse.text();
      console.error('❌ Profile update failed:', errorText);
    }
    
    // Verify the update by fetching profile
    const fetchResponse = await fetch('http://localhost:3001/api/profiles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (fetchResponse.ok) {
      const profileData = await fetchResponse.json();
      console.log('📋 Current profile after update:', JSON.stringify(profileData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing profile API:', error);
  }
}

testProfileAPI();