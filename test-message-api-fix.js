async function testMessageAPI() {
  try {
    console.log('🧪 Testing message sending API with authentication fix...');
    
    // First get a valid token by testing login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jikjikqt@gmail.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.log('Error:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, got token');
    
    // Test creating a conversation first
    console.log('📝 Creating conversation...');
    const convResponse = await fetch('http://localhost:3000/api/support/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_email: 'jikjikqt@gmail.com',
        user_name: 'Test User',
        subject: 'Test Message API',
        message_content: 'Testing message API'
      })
    });
    
    console.log('📝 Conversation response status:', convResponse.status);
    
    if (!convResponse.ok) {
      console.log('❌ Conversation creation failed:', convResponse.status);
      const errorText = await convResponse.text();
      console.log('Error:', errorText);
      return;
    }
    
    const convData = await convResponse.json();
    const conversationId = convData.conversation.id;
    console.log('✅ Conversation created with ID:', conversationId);
    
    // Now test sending a message
    console.log('📤 Sending message...');
    const messageResponse = await fetch('http://localhost:3000/api/support/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message_content: 'This is a test message from API - authentication fix test',
        sender_type: 'customer'
      })
    });
    
    console.log('📤 Message send response status:', messageResponse.status);
    
    if (messageResponse.ok) {
      const messageData = await messageResponse.json();
      console.log('✅ Message sent successfully!');
      console.log('Response:', JSON.stringify(messageData, null, 2));
      
      // Test fetching messages to verify it was saved
      console.log('📥 Fetching messages to verify...');
      const fetchResponse = await fetch(`http://localhost:3000/api/support/messages?conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        console.log('✅ Messages fetched successfully!');
        console.log(`Found ${fetchData.messages.length} messages in conversation`);
        console.log('Latest message:', fetchData.messages[fetchData.messages.length - 1]?.message_content);
      } else {
        console.log('❌ Failed to fetch messages:', fetchResponse.status);
      }
      
    } else {
      const errorText = await messageResponse.text();
      console.log('❌ Message send failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMessageAPI();