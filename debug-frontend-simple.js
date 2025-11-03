// Simple debug script to test authentication flow without external dependencies
require('dotenv').config({ path: '.env.local' });

async function debugAuthFlow() {
  console.log('🔍 DEBUGGING AUTHENTICATION FLOW');
  console.log('=================================');
  
  // Test 1: Login API
  console.log('\n1️⃣ Testing login API...');
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkcksdmn@gmail.com',
        password: 'admingkicks2.0'
      })
    });
    
    console.log('📡 Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log('🔑 Token received:', !!loginData.token);
      console.log('👤 User role:', loginData.user?.role);
      console.log('📧 User email:', loginData.user?.email);
      
      if (loginData.token) {
        // Test 2: Delete API with token
        console.log('\n2️⃣ Testing delete API with login token...');
        
        // First, let's check what archived items exist
        console.log('\n🔍 Checking available archived items...');
        const archiveResponse = await fetch('http://localhost:3000/api/admin/archive', {
          headers: {
            'Authorization': `Bearer ${loginData.token}`
          }
        });
        
        if (archiveResponse.ok) {
          const archiveData = await archiveResponse.json();
          console.log('📦 Available archived items:', archiveData.items?.length || 0);
          
          if (archiveData.items && archiveData.items.length > 0) {
            const firstItem = archiveData.items[0];
            console.log('🎯 Testing delete with first available item:');
            console.log('   - ID:', firstItem.id);
            console.log('   - Type:', firstItem.type);
            console.log('   - Name:', firstItem.name);
            
            // Test delete with real archived item
            const deleteResponse = await fetch('http://localhost:3000/api/admin/archive/delete', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
              },
              body: JSON.stringify({
                id: firstItem.id,
                type: firstItem.type
              })
            });
            
            console.log('📡 Delete response status:', deleteResponse.status);
            const deleteResult = await deleteResponse.text();
            console.log('📡 Delete response:', deleteResult);
            
            if (deleteResponse.ok) {
              console.log('✅ Delete API works!');
              console.log('🎉 FRONTEND SHOULD WORK: The API authentication is functional');
            } else {
              console.log('❌ Delete API failed');
              console.log('🔍 This suggests the issue might be in the frontend implementation');
            }
          } else {
            console.log('📭 No archived items found to test delete with');
            console.log('💡 Try archiving an item first, then test delete');
          }
        } else {
          console.log('❌ Failed to fetch archived items');
        }
      }
    } else {
      const error = await loginResponse.text();
      console.log('❌ Login failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
  
  console.log('\n🏁 Debug complete!');
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Open browser dev tools (F12)');
  console.log('   2. Go to Console tab');
  console.log('   3. Try clicking delete button and check for errors');
  console.log('   4. Check Application tab > Local Storage for auth_token');
}

debugAuthFlow();