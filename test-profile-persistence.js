// Test script to check profile data persistence issues
// This script will test the gender, barangay, and default address settings

async function testProfilePersistence() {
  console.log('🧪 Testing Profile Data Persistence...\n');
  
  try {
    // Step 1: Login to get a valid token
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');
    
    // Step 2: Get current profile data
    console.log('📋 Step 2: Getting current profile data...');
    const getProfileResponse = await fetch('http://localhost:3001/api/profiles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!getProfileResponse.ok) {
      console.error('❌ Failed to get profile:', getProfileResponse.status);
      return;
    }
    
    const currentProfile = await getProfileResponse.json();
    console.log('Current profile data:');
    console.log('- Gender:', currentProfile.gender || 'NOT SET');
    console.log('- First Name:', currentProfile.first_name || 'NOT SET');
    console.log('- Last Name:', currentProfile.last_name || 'NOT SET');
    console.log('- Phone:', currentProfile.phone || 'NOT SET');
    console.log('- Bio:', currentProfile.bio || 'NOT SET');
    console.log('');
    
    // Step 3: Test profile update with gender
    console.log('💾 Step 3: Testing profile update with gender...');
    const testProfileData = {
      first_name: currentProfile.first_name || 'Test',
      last_name: currentProfile.last_name || 'User',
      phone: currentProfile.phone || '09123456789',
      birthdate: currentProfile.birthdate || '',
      gender: 'male', // Setting gender explicitly
      bio: currentProfile.bio || 'Test bio',
      avatar_url: currentProfile.avatar_url || '',
      preferences: currentProfile.preferences || {
        newsletter: true,
        sms_notifications: false,
        email_notifications: true,
        preferred_language: 'en',
        currency: 'PHP'
      }
    };
    
    console.log('Updating profile with gender:', testProfileData.gender);
    
    const updateProfileResponse = await fetch('http://localhost:3001/api/profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testProfileData)
    });
    
    if (!updateProfileResponse.ok) {
      console.error('❌ Profile update failed:', updateProfileResponse.status);
      const errorText = await updateProfileResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const updateResult = await updateProfileResponse.json();
    console.log('✅ Profile update successful');
    console.log('Update result:', updateResult.message || 'No message');
    console.log('');
    
    // Step 4: Verify the update by fetching again
    console.log('🔍 Step 4: Verifying profile update...');
    const verifyProfileResponse = await fetch('http://localhost:3001/api/profiles', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!verifyProfileResponse.ok) {
      console.error('❌ Failed to verify profile:', verifyProfileResponse.status);
      return;
    }
    
    const verifiedProfile = await verifyProfileResponse.json();
    console.log('Verified profile data:');
    console.log('- Gender:', verifiedProfile.gender || 'NOT SET');
    console.log('- First Name:', verifiedProfile.first_name || 'NOT SET');
    console.log('- Last Name:', verifiedProfile.last_name || 'NOT SET');
    console.log('- Phone:', verifiedProfile.phone || 'NOT SET');
    console.log('');
    
    if (verifiedProfile.gender === 'male') {
      console.log('✅ Gender persistence: WORKING');
    } else {
      console.log('❌ Gender persistence: FAILED');
      console.log('Expected: male, Got:', verifiedProfile.gender);
    }
    
    // Step 5: Test addresses
    console.log('\n🏠 Step 5: Testing address data...');
    const getAddressResponse = await fetch('http://localhost:3001/api/addresses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!getAddressResponse.ok) {
      console.error('❌ Failed to get addresses:', getAddressResponse.status);
      return;
    }
    
    const addresses = await getAddressResponse.json();
    console.log(`Found ${addresses.length} addresses`);
    
    if (addresses.length > 0) {
      const firstAddress = addresses[0];
      console.log('First address:');
      console.log('- Barangay:', firstAddress.barangay || 'NOT SET');
      console.log('- Is Default:', firstAddress.is_default);
      console.log('- Shipping Region:', firstAddress.shipping_region || 'NOT SET');
      
      // Test address update
      console.log('\n💾 Testing address update...');
      const testAddressData = {
        id: firstAddress.id,
        address_line_1: firstAddress.address_line_1,
        city: firstAddress.city,
        state: firstAddress.state,
        postal_code: firstAddress.postal_code,
        country: firstAddress.country,
        first_name: firstAddress.first_name,
        last_name: firstAddress.last_name,
        phone: firstAddress.phone,
        barangay: 'Test Barangay', // Setting barangay explicitly
        shipping_region: 'Luzon',
        is_default: true // Setting as default
      };
      
      const updateAddressResponse = await fetch('http://localhost:3001/api/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testAddressData)
      });
      
      if (updateAddressResponse.ok) {
        console.log('✅ Address update successful');
        
        // Verify address update
        const verifyAddressResponse = await fetch('http://localhost:3001/api/addresses', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (verifyAddressResponse.ok) {
          const verifiedAddresses = await verifyAddressResponse.json();
          const verifiedAddress = verifiedAddresses.find(addr => addr.id === firstAddress.id);
          
          if (verifiedAddress) {
            console.log('\nVerified address:');
            console.log('- Barangay:', verifiedAddress.barangay || 'NOT SET');
            console.log('- Is Default:', verifiedAddress.is_default);
            console.log('- Shipping Region:', verifiedAddress.shipping_region || 'NOT SET');
            
            if (verifiedAddress.barangay === 'Test Barangay') {
              console.log('✅ Barangay persistence: WORKING');
            } else {
              console.log('❌ Barangay persistence: FAILED');
            }
            
            if (verifiedAddress.is_default === true) {
              console.log('✅ Default address persistence: WORKING');
            } else {
              console.log('❌ Default address persistence: FAILED');
            }
          }
        }
      } else {
        console.error('❌ Address update failed:', updateAddressResponse.status);
        const errorText = await updateAddressResponse.text();
        console.error('Error details:', errorText);
      }
    } else {
      console.log('No addresses found to test');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testProfilePersistence().then(() => {
  console.log('\n🏁 Profile persistence test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});