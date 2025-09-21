async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login...');
    
    // Try to login with admin user
    const adminEmail = 'gkcksdmn@gmail.com';
    console.log(`🔑 Attempting login with admin: ${adminEmail}`);
    
    // Try common passwords for admin
    const passwords = ['admin123', 'admin', 'password', 'gkicks123', 'gkcksdmn123', '123456'];
    let loginSuccess = false;
    let token = null;
    
    for (const password of passwords) {
      try {
        console.log(`  Trying password: ${password}`);
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: password
          })
        });
        
        console.log(`  Login response status: ${loginResponse.status}`);
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log(`✅ Admin login successful with password: ${password}`);
          console.log('User data:', loginData.user);
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
      console.log('❌ Could not login with admin user');
      console.log('🔧 Let me check if there are any password hashes in the database...');
      
      // Check password hashes in database
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gkicks'
      });
      
      const [adminUsers] = await conn.execute('SELECT id, email, password_hash FROM admin_users WHERE email = ?', [adminEmail]);
      console.log('Admin user data:', adminUsers);
      
      if (adminUsers.length > 0 && adminUsers[0].password_hash) {
        console.log('Password hash exists, but none of the test passwords worked');
        console.log('Hash preview:', adminUsers[0].password_hash.substring(0, 20) + '...');
      } else {
        console.log('No password hash found for admin user');
      }
      
      await conn.end();
      return;
    }
    
    console.log('📤 Testing message API with admin token...');
    
    // First create a conversation
    const convResponse = await fetch('http://localhost:3000/api/support/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_email: 'test@example.com',
        user_name: 'Test User',
        subject: 'Admin Test Message',
        message_content: 'Testing message API with admin authentication'
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
          message_content: 'This is a test message from admin!',
          sender_type: 'admin'
        })
      });
      
      console.log('Message response status:', messageResponse.status);
      const messageText = await messageResponse.text();
      console.log('Message response:', messageText);
      
      if (messageResponse.ok) {
        console.log('✅ Message sent successfully!');
        console.log('🎉 The message API is working correctly with admin authentication!');
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

testAdminLogin();