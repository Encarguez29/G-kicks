// Using built-in fetch (Node.js 18+)

async function testInventoryAPI() {
  try {
    console.log('🔍 Testing POS Inventory API with authentication...');
    
    // Step 1: Login as admin to get token
    console.log('\n1. Logging in as admin...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'gkicksstaff@gmail.com',
        password: 'gkicksstaff_123'
      })
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      console.error('❌ Login failed:', errorData);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Test POS inventory API with token
    console.log('\n2. Testing POS inventory API with token...');
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
        console.log('⚠️ No products returned');
      }
    } else {
      const errorData = await inventoryResponse.text();
      console.error('❌ POS Inventory API failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInventoryAPI();