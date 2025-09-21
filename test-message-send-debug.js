// Using built-in fetch (Node.js 18+)

async function testMessageSend() {
  try {
    console.log('🔍 Testing message send API...');
    
    // First, let's try to get a valid conversation ID
    const conversationsResponse = await fetch('http://localhost:3000/api/support/conversations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Conversations API Status:', conversationsResponse.status);
    const conversations = await conversationsResponse.text();
    console.log('Conversations Response:', conversations);
    
    // Try to send a message with correct field names
    const messageData = {
      conversation_id: 1, // Use a simple ID
      message_content: 'Test message', // Fixed: was 'message', should be 'message_content'
      sender_type: 'customer'
    };
    
    console.log('📤 Sending message with data:', messageData);
    
    const response = await fetch('http://localhost:3000/api/support/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(messageData)
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response Body:', responseText);
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, responseText);
    } else {
      console.log('✅ Message sent successfully!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMessageSend();