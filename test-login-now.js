// Test login after fixing duplicate user issue
async function testLoginNow() {
  try {
    console.log('🧪 Testing login after fixing duplicate user...');
    
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
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log('User role:', loginData.user?.role || 'not set');
      console.log('Token received:', loginData.token ? 'Yes' : 'No');
      
      // Test POS inventory access
      console.log('\n🛒 Testing POS inventory access...');
      const inventoryResponse = await fetch('http://localhost:3001/api/pos/inventory', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('POS inventory response status:', inventoryResponse.status);
      
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        console.log('✅ POS inventory access successful!');
        console.log('Products count:', inventoryData.products?.length || 0);
      } else {
        const errorData = await inventoryResponse.json();
        console.log('❌ POS inventory access failed:', errorData);
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLoginNow();