require('dotenv').config({ path: '.env.local' });

async function testBulkDelete() {
  try {
    console.log('🔍 TESTING BULK DELETE FUNCTIONALITY');
    console.log('====================================');

    // Step 1: Login to get token
    console.log('\n1️⃣ Logging in to get authentication token...');
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

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('🔑 Token received:', !!loginData.token);

    // Step 2: Get archived items
    console.log('\n2️⃣ Fetching archived items...');
    const archiveResponse = await fetch('http://localhost:3000/api/admin/archive', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (!archiveResponse.ok) {
      throw new Error(`Failed to fetch archived items: ${archiveResponse.status}`);
    }

    const archiveData = await archiveResponse.json();
    console.log('📦 Available archived items:', archiveData.items?.length || 0);

    if (!archiveData.items || archiveData.items.length < 2) {
      console.log('❌ Need at least 2 archived items to test bulk delete');
      return;
    }

    // Step 3: Test bulk delete with first 2 items
    const itemsToDelete = archiveData.items.slice(0, 2).map(item => ({
      id: item.id,
      type: item.type
    }));

    console.log('\n3️⃣ Testing bulk delete with items:');
    itemsToDelete.forEach((item, index) => {
      console.log(`   ${index + 1}. ID: ${item.id}, Type: ${item.type}`);
    });

    const bulkDeleteResponse = await fetch('http://localhost:3000/api/admin/archive/bulk-delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        items: itemsToDelete
      })
    });

    console.log('\n📡 Bulk delete response status:', bulkDeleteResponse.status);
    const bulkDeleteResult = await bulkDeleteResponse.text();
    console.log('📡 Bulk delete response:', bulkDeleteResult);

    if (bulkDeleteResponse.ok) {
      console.log('✅ Bulk delete API works!');
      console.log('🎉 BULK DELETE SHOULD NOW WORK IN FRONTEND');
    } else {
      console.log('❌ Bulk delete API failed');
      console.log('🔍 Check the error message above for details');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🏁 Test complete!');
}

testBulkDelete();