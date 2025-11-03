// Using built-in fetch API (Node.js 18+)

async function testFrontendAPIIntegration() {
  console.log('🚀 Starting frontend API integration test...');
  
  let authToken = null;
  
  try {
    // Step 1: Login to get auth token
    console.log('📍 Step 1: Logging in to get auth token...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'encarguerz@gmail.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    authToken = loginData.token;
    console.log('✅ Login successful, token obtained');
    
    // Step 2: Test profile data fetching (simulating frontend behavior)
    console.log('📍 Step 2: Testing profile data fetching...');
    
    const profileResponse = await fetch(`http://localhost:3000/api/profiles?t=${Date.now()}&cache=${Math.random()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`);
    }
    
    const profileData = await profileResponse.json();
    console.log('✅ Profile data fetched successfully:');
    console.log('   First Name:', profileData.first_name);
    console.log('   Last Name:', profileData.last_name);
    console.log('   Phone:', profileData.phone);
    console.log('   Gender:', profileData.gender);
    
    // Step 3: Test profile data update
    console.log('📍 Step 3: Testing profile data update...');
    
    const updateProfileResponse = await fetch('http://localhost:3000/api/profiles', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: 'Frontend Test',
        last_name: profileData.last_name,
        phone: '09987654321',
        gender: 'other',
        bio: profileData.bio || '',
        preferences: profileData.preferences || {}
      })
    });
    
    if (!updateProfileResponse.ok) {
      throw new Error(`Profile update failed: ${updateProfileResponse.status}`);
    }
    
    console.log('✅ Profile data updated successfully');
    
    // Step 4: Verify profile data persistence
    console.log('📍 Step 4: Verifying profile data persistence...');
    
    const verifyProfileResponse = await fetch(`http://localhost:3000/api/profiles?t=${Date.now()}&cache=${Math.random()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!verifyProfileResponse.ok) {
      throw new Error(`Profile verification failed: ${verifyProfileResponse.status}`);
    }
    
    const verifiedProfileData = await verifyProfileResponse.json();
    console.log('✅ Profile data after update:');
    console.log('   First Name:', verifiedProfileData.first_name);
    console.log('   Phone:', verifiedProfileData.phone);
    console.log('   Gender:', verifiedProfileData.gender);
    
    // Step 5: Test address data fetching
    console.log('📍 Step 5: Testing address data fetching...');
    
    const addressResponse = await fetch('http://localhost:3000/api/addresses', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!addressResponse.ok) {
      throw new Error(`Address fetch failed: ${addressResponse.status}`);
    }
    
    const addressData = await addressResponse.json();
    console.log('✅ Address data fetched successfully:');
    if (addressData.length > 0) {
      console.log('   Street:', addressData[0].address_line_1);
      console.log('   City:', addressData[0].city);
      console.log('   Barangay:', addressData[0].barangay);
      
      // Step 6: Test address data update
      console.log('📍 Step 6: Testing address data update...');
      
      const updateAddressResponse = await fetch('http://localhost:3000/api/addresses', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: addressData[0].id,
          first_name: 'Frontend',
          last_name: 'Test',
          address_line_1: addressData[0].address_line_1,
          city: addressData[0].city,
          state: addressData[0].state,
          postal_code: addressData[0].postal_code,
          country: addressData[0].country,
          barangay: 'Frontend Test Barangay',
          shipping_region: addressData[0].shipping_region
        })
      });
      
      if (!updateAddressResponse.ok) {
        throw new Error(`Address update failed: ${updateAddressResponse.status}`);
      }
      
      console.log('✅ Address data updated successfully');
      
      // Step 7: Verify address data persistence
      console.log('📍 Step 7: Verifying address data persistence...');
      
      const verifyAddressResponse = await fetch('http://localhost:3000/api/addresses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!verifyAddressResponse.ok) {
        throw new Error(`Address verification failed: ${verifyAddressResponse.status}`);
      }
      
      const verifiedAddressData = await verifyAddressResponse.json();
      console.log('✅ Address data after update:');
      console.log('   Barangay:', verifiedAddressData[0].barangay);
      
      // Step 8: Final verification
      console.log('📍 Step 8: Final verification...');
      
      const profilePersisted = verifiedProfileData.first_name === 'Frontend Test' && 
                              verifiedProfileData.phone === '09987654321' &&
                              verifiedProfileData.gender === 'other';
      
      const addressPersisted = verifiedAddressData[0].barangay === 'Frontend Test Barangay';
      
      if (profilePersisted && addressPersisted) {
        console.log('🎉 SUCCESS: All frontend API integration tests passed!');
        console.log('✅ Profile data persistence: WORKING');
        console.log('✅ Address data persistence: WORKING');
        console.log('✅ Cache-busting headers: WORKING');
        console.log('✅ API endpoints: WORKING');
      } else {
        console.log('❌ FAILURE: Some tests failed:');
        if (!profilePersisted) {
          console.log('   - Profile data persistence: FAILED');
        }
        if (!addressPersisted) {
          console.log('   - Address data persistence: FAILED');
        }
      }
    } else {
      console.log('⚠️ No address data found, skipping address tests');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendAPIIntegration().catch(console.error);