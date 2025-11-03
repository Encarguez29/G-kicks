require('dotenv').config({ path: '.env.local' });

async function testMessageDelete() {
  try {
    console.log('🔍 TESTING MESSAGE DELETE FUNCTIONALITY');
    console.log('======================================');

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

    // Find a message to delete
    const messageItem = archiveData.items?.find(item => item.type === 'message');
    
    if (!messageItem) {
      console.log('❌ No archived messages found to test deletion');
      return;
    }

    console.log('\n3️⃣ Testing individual message delete...');
    console.log('🎯 Testing delete with message:');
    console.log('   - ID:', messageItem.id);
    console.log('   - Type:', messageItem.type);
    console.log('   - Name:', messageItem.name);

    // Test individual delete
    const deleteResponse = await fetch('http://localhost:3000/api/admin/archive/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        id: messageItem.id,
        type: messageItem.type
      })
    });

    console.log('\n📡 Individual delete response status:', deleteResponse.status);
    const deleteResult = await deleteResponse.text();
    console.log('📡 Individual delete response:', deleteResult);

    if (deleteResponse.ok) {
      console.log('✅ Individual message delete works!');
    } else {
      console.log('❌ Individual message delete failed');
    }

    // Step 4: Test bulk delete with remaining messages
    const remainingMessages = archiveData.items?.filter(item => 
      item.type === 'message' && item.id !== messageItem.id
    ).slice(0, 2); // Take up to 2 messages

    if (remainingMessages && remainingMessages.length > 0) {
      console.log('\n4️⃣ Testing bulk message delete...');
      console.log('🎯 Testing bulk delete with messages:');
      remainingMessages.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}, Name: ${item.name}`);
      });

      const bulkDeleteResponse = await fetch('http://localhost:3000/api/admin/archive/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          items: remainingMessages.map(item => ({
            id: item.id,
            type: item.type
          }))
        })
      });

      console.log('\n📡 Bulk delete response status:', bulkDeleteResponse.status);
      const bulkDeleteResult = await bulkDeleteResponse.text();
      console.log('📡 Bulk delete response:', bulkDeleteResult);

      if (bulkDeleteResponse.ok) {
        console.log('✅ Bulk message delete works!');
      } else {
        console.log('❌ Bulk message delete failed');
      }
    }

    console.log('\n🎉 MESSAGE DELETE SHOULD NOW WORK IN FRONTEND');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🏁 Test complete!');
}

testMessageDelete();