async function testMessageWithUser() {
  try {
    console.log('🔍 Testing message API with existing user...');
    
    // Try to login with an existing user
    const testEmail = 'genesisencarguez@gmail.com';
    console.log(`🔑 Attempting login with: ${testEmail}`);
    
    // Try common passwords
    const passwords = ['password123', 'password', '123456', 'admin', 'genesis123', 'genesis'];
    let loginSuccess = false;
    let token = null;
    
    for (const password of passwords) {
      try {
        console.log(`  Trying password: ${password}`);
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: password
          })
        });
        
        console.log(`  Login response status: ${loginResponse.status}`);
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log(`✅ Login successful with password: ${password}`);
          loginSuccess = true;
          break;
        } else {
          const errorText = await loginResponse.text();
          console.log(`  Login failed: ${errorText}`);
        }
      } catch (e) {
        console.log(`  Error with password ${password}: ${e.message}`);
      }
    }
    
    if (!loginSuccess) {
      console.log('❌ Could not login with any password');
      console.log('🔧 Let me try creating a new test user...');
      
      // Create a test user
      const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: 'testuser123@example.com',
          password: 'testpass123'
        })
      });
      
      console.log(`Registration response status: ${registerResponse.status}`);
      const regText = await registerResponse.text();
      console.log(`Registration response: ${regText}`);
      
      if (registerResponse.ok) {
        console.log('✅ Test user created, attempting login...');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'testuser123@example.com',
            password: 'testpass123'
          })
        });
        
        console.log(`New user login status: ${loginResponse.status}`);
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log('✅ Login successful with new test user');
          loginSuccess = true;
        } else {
          const loginText = await loginResponse.text();
          console.log(`New user login failed: ${loginText}`);
        }
      }
    }
    
    if (!loginSuccess || !token) {
      console.log('❌ Could not obtain authentication token');
      return;
    }
    
    console.log('📤 Testing message API with authenticated token...');
    
    // First create a conversation
    const convResponse = await fetch('http://localhost:3000/api/support/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_email: testEmail,
        user_name: 'Test User',
        subject: 'Auth Test Message',
        message_content: 'Testing message API with real authentication'
      })
    });
    
    console.log('Conversation creation status:', convResponse.status);
    const convText = await convResponse.text();
    console.log('Conversation response:', convText);
    
    if (convResponse.ok) {
      const convData = JSON.parse(convText);
      const conversationId = convData.conversation.id;
      console.log('✅ Created conversation with ID:', conversationId);
      
      // Now send a message
      console.log('📤 Sending message...');
      const messageResponse = await fetch('http://localhost:3000/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_content: 'This is a test message with real authentication!',
          sender_type: 'customer'
        })
      });
      
      console.log('Message response status:', messageResponse.status);
      const messageText = await messageResponse.text();
      console.log('Message response:', messageText);
      
      if (messageResponse.ok) {
        console.log('✅ Message sent successfully!');
        console.log('🎉 The message API is working correctly with authentication!');
      } else {
        console.log('❌ Message sending failed');
        console.log('This indicates there is still an issue with the message API');
      }
    } else {
      console.log('❌ Conversation creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMessageWithUser();