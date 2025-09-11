// Test complete staff login and POS inventory access flow
async function testCompleteStaffFlow() {
  try {
    console.log('=== Testing Complete Staff POS Flow ===');
    
    // Step 1: Login using the auth/login endpoint (same as admin context)
    console.log('\n1. Logging in via /api/auth/login...');
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
    
    if (!loginResponse.ok) {
      console.error('❌ Auth login failed:', loginResponse.status);
      const errorData = await loginResponse.text();
      console.error('Error details:', errorData);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Auth login successful');
    console.log('Token received:', loginData.token ? 'Yes' : 'No');
    
    const token = loginData.token;
    if (!token) {
      console.error('❌ No token received from auth login');
      return;
    }
    
    // Step 2: Check admin status (same as admin context)
    console.log('\n2. Checking admin status...');
    const adminResponse = await fetch('http://localhost:3001/api/admin/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'gkicksstaff@gmail.com' })
    });
    
    if (!adminResponse.ok) {
      console.error('❌ Admin check failed:', adminResponse.status);
      const errorData = await adminResponse.text();
      console.error('Error details:', errorData);
      return;
    }
    
    const adminData = await adminResponse.json();
    console.log('✅ Admin check successful');
    console.log('User role:', adminData.user?.role);
    console.log('User permissions:', adminData.user?.permissions);
    
    // Step 3: Test POS inventory API with the token
    console.log('\n3. Testing POS inventory API with token...');
    const inventoryResponse = await fetch('http://localhost:3001/api/pos/inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('POS Inventory API status:', inventoryResponse.status);
    
    if (inventoryResponse.ok) {
      const inventoryData = await inventoryResponse.json();
      console.log('✅ POS Inventory API successful');
      console.log('📦 Products returned:', inventoryData.length);
      
      if (inventoryData.length > 0) {
        console.log('\n📋 Sample products:');
        inventoryData.slice(0, 3).forEach((product, index) => {
          console.log(`${index + 1}. ${product.name} - Stock: ${product.stock_quantity} - Active: ${product.is_active}`);
        });
      } else {
        console.log('⚠️ No products returned - this is the issue!');
      }
    } else {
      const errorData = await inventoryResponse.text();
      console.error('❌ POS Inventory API failed:', errorData);
    }
    
    // Step 4: Test without token to confirm authentication is working
    console.log('\n4. Testing POS inventory API without token (should fail)...');
    const noTokenResponse = await fetch('http://localhost:3001/api/pos/inventory', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('No token API status:', noTokenResponse.status);
    if (noTokenResponse.status === 401) {
      console.log('✅ Authentication is working correctly (unauthorized without token)');
    } else {
      console.log('⚠️ Unexpected response without token');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteStaffFlow();