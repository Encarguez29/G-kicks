const mysql = require('mysql2/promise');

async function testWithRealAuth() {
  try {
    console.log('🔍 Testing message API with real authentication...');
    
    // First, let's check what users exist in the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    const [users] = await connection.execute('SELECT id, email, name, is_verified FROM users LIMIT 5');
    console.log('Available users:');
    users.forEach(user => console.log(`  - ${user.email} (ID: ${user.id}, verified: ${user.is_verified})`));
    
    await connection.end();
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    // Try to login with the first verified user
    const testUser = users.find(u => u.is_verified) || users[0];
    console.log(`🔑 Attempting login with user: ${testUser.email}`);
    
    // Try common passwords
    const passwords = ['password123', 'password', '123456', 'admin'];
    let loginSuccess = false;
    let token = null;
    
    for (const password of passwords) {
      try {
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: password
          })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log(`✅ Login successful with password: ${password}`);
          loginSuccess = true;
          break;
        }
      } catch (e) {
        // Continue to next password
      }
    }
    
    if (!loginSuccess) {
      console.log('❌ Could not login with any common password');
      console.log('🔧 Creating a test user with known password...');
      
      // Create a test user
      const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'testuser@example.com',
          password: 'testpass123'
        })
      });
      
      if (registerResponse.ok) {
        console.log('✅ Test user created, attempting login...');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'testuser@example.com',
            password: 'testpass123'
          })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log('✅ Login successful with new test user');
          loginSuccess = true;
        }
      }
    }
    
    if (!loginSuccess || !token) {
      console.log('❌ Could not obtain authentication token');
      return;
    }
    
    // Now test the message API with the real token
    console.log('📤 Testing message API with real token...');
    
    // First create a conversation
    const convResponse = await fetch('http://localhost:3000/api/support/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_email: testUser.email,
        user_name: testUser.name || 'Test User',
        subject: 'Auth Test',
        message_content: 'Testing with real authentication'
      })
    });
    
    console.log('Conversation creation status:', convResponse.status);
    
    if (convResponse.ok) {
      const convData = await convResponse.json();
      const conversationId = convData.conversation.id;
      console.log('✅ Created conversation with ID:', conversationId);
      
      // Now send a message
      const messageResponse = await fetch('http://localhost:3000/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_content: 'Test message with real auth',
          sender_type: 'customer'
        })
      });
      
      console.log('Message response status:', messageResponse.status);
      const messageText = await messageResponse.text();
      console.log('Message response:', messageText);
      
      if (messageResponse.ok) {
        console.log('✅ Message sent successfully!');
      } else {
        console.log('❌ Message sending failed');
      }
    } else {
      const convText = await convResponse.text();
      console.log('❌ Conversation creation failed:', convText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWithRealAuth();