const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createTestAdmin() {
  try {
    console.log('🔧 Creating test admin user...');
    
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    const testEmail = 'testadmin@gkicks.com';
    const testPassword = 'testpass123';
    
    // Check if test admin already exists
    const [existing] = await conn.execute('SELECT id FROM admin_users WHERE email = ?', [testEmail]);
    
    if (existing.length > 0) {
      console.log('Test admin already exists, updating password...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      
      // Update existing admin
      await conn.execute(
        'UPDATE admin_users SET password_hash = ? WHERE email = ?',
        [hashedPassword, testEmail]
      );
      
      console.log('✅ Test admin password updated');
    } else {
      console.log('Creating new test admin...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      
      // Create new admin user
      await conn.execute(
        `INSERT INTO admin_users (username, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        ['testadmin', testEmail, hashedPassword, 'Test', 'Admin', 'admin', 1]
      );
      
      console.log('✅ Test admin created');
    }
    
    await conn.end();
    
    console.log(`📧 Test admin email: ${testEmail}`);
    console.log(`🔑 Test admin password: ${testPassword}`);
    
    // Now test login
    console.log('🔍 Testing login with new admin...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    console.log(`Login response status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log('Token received:', loginData.token ? 'Yes' : 'No');
      
      // Test message API
      console.log('📤 Testing message API...');
      
      // First create a conversation
      const convResponse = await fetch('http://localhost:3000/api/support/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          user_email: 'test@example.com',
          user_name: 'Test User',
          subject: 'Test Admin Message',
          message_content: 'Testing message API with test admin'
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
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            message_content: 'This is a test message from test admin!',
            sender_type: 'admin'
          })
        });
        
        console.log('Message response status:', messageResponse.status);
        const messageText = await messageResponse.text();
        console.log('Message response:', messageText);
        
        if (messageResponse.ok) {
          console.log('✅ Message sent successfully!');
          console.log('🎉 The message API is working correctly!');
        } else {
          console.log('❌ Message sending failed - this is the issue we need to fix');
        }
      } else {
        console.log('❌ Conversation creation failed');
      }
      
    } else {
      const errorText = await loginResponse.text();
      console.log('❌ Login failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createTestAdmin();