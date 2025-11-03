const fetch = require('node-fetch');

// Test the delete API directly
async function testDelete() {
  try {
    console.log('🧪 Testing delete API with order ID 68...');
    
    // Create a test JWT token (this should match what's in localStorage)
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MTIxMzAwMH0.someSignature';
    
    const response = await fetch('http://localhost:3000/api/admin/archive/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({ 
        id: 68, 
        type: 'order' 
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📡 Response body:', responseText);

    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ JSON Response:', jsonResponse);
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
      }
    } else {
      console.log('❌ Response is not JSON, content-type:', response.headers.get('content-type'));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDelete();