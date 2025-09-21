const mysql = require('mysql2/promise');

async function debugMessageAPI() {
  try {
    console.log('🔍 Debugging message API in detail...');
    
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    // Check support_messages table structure
    console.log('📋 Checking support_messages table structure...');
    const [messagesCols] = await conn.execute('DESCRIBE support_messages');
    console.log('Messages table columns:', messagesCols.map(c => c.Field));
    
    // Check if conversation exists
    const conversationId = 6;
    console.log(`🔍 Checking if conversation ${conversationId} exists...`);
    const [conversations] = await conn.execute('SELECT * FROM support_conversations WHERE id = ?', [conversationId]);
    console.log('Conversation data:', conversations);
    
    // Test the exact insert query that the API uses
    console.log('🧪 Testing the insert query...');
    
    const testData = {
      conversation_id: conversationId,
      sender_type: 'admin',
      sender_id: 1, // Test admin ID
      sender_name: 'Test Admin',
      sender_email: 'testadmin@gkicks.com',
      message_content: 'This is a test message from debug script',
      message_type: 'text',
      order_id: null
    };
    
    try {
      const insertResult = await conn.execute(
        'INSERT INTO support_messages (conversation_id, sender_type, sender_id, sender_name, sender_email, message_content, message_type, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [testData.conversation_id, testData.sender_type, testData.sender_id, testData.sender_name, testData.sender_email, testData.message_content, testData.message_type, testData.order_id]
      );
      
      console.log('✅ Insert successful:', insertResult);
      
      // Test update query
      console.log('🧪 Testing update queries...');
      
      const updateResult1 = await conn.execute(
        'UPDATE support_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
        [conversationId]
      );
      console.log('✅ Update 1 successful:', updateResult1);
      
      const updateResult2 = await conn.execute(
        'UPDATE support_conversations SET status = "in_progress" WHERE id = ? AND status = "open"',
        [conversationId]
      );
      console.log('✅ Update 2 successful:', updateResult2);
      
      console.log('🎉 All database operations successful! The issue might be in JWT decoding or validation.');
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      console.error('SQL State:', dbError.sqlState);
      console.error('Error Code:', dbError.errno);
    }
    
    await conn.end();
    
    // Now test the actual API with detailed logging
    console.log('🔍 Testing actual API with test admin...');
    
    // Login first
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testadmin@gkicks.com',
        password: 'testpass123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Token payload preview:', loginData.token.split('.')[1]);
    
    // Decode the JWT to see what's inside
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(loginData.token);
    console.log('🔍 Decoded JWT:', decoded);
    
    // Test message API with detailed error handling
    console.log('📤 Testing message API...');
    
    const messageResponse = await fetch('http://localhost:3000/api/support/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message_content: 'This is a test message with detailed debugging!',
        sender_type: 'admin'
      })
    });
    
    console.log('Message API response status:', messageResponse.status);
    const responseText = await messageResponse.text();
    console.log('Message API response:', responseText);
    
    if (!messageResponse.ok) {
      console.log('❌ Message API failed - checking server logs would help identify the exact error');
    } else {
      console.log('✅ Message API successful!');
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugMessageAPI();