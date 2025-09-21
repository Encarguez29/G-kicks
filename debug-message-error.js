const mysql = require('mysql2/promise');

async function debugMessageError() {
  try {
    console.log('🔍 Debugging message API error...');
    
    // First check if conversation ID 1 exists
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });
    
    console.log('📊 Checking database...');
    
    // Check conversations table
    const [conversations] = await connection.execute('SELECT * FROM support_conversations LIMIT 5');
    console.log('Conversations in DB:', conversations.length);
    if (conversations.length > 0) {
      console.log('First conversation:', conversations[0]);
    }
    
    // Check messages table structure
    const [columns] = await connection.execute('DESCRIBE support_messages');
    console.log('Messages table columns:');
    columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    await connection.end();
    
    // Now test with a real token
    console.log('🔑 Testing with authentication...');
    
    // Create a test conversation first
    const convResponse = await fetch('http://localhost:3000/api/support/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_email: 'test@example.com',
        user_name: 'Test User',
        subject: 'Debug Test',
        message_content: 'Initial message for debugging'
      })
    });
    
    console.log('Conversation creation status:', convResponse.status);
    const convText = await convResponse.text();
    console.log('Conversation response:', convText);
    
    if (convResponse.ok) {
      const convData = JSON.parse(convText);
      const conversationId = convData.conversation.id;
      console.log('✅ Created conversation with ID:', conversationId);
      
      // Now try to send a message to this conversation
      console.log('📤 Sending message to conversation...');
      
      const messageResponse = await fetch('http://localhost:3000/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_content: 'Test message without auth',
          sender_type: 'customer'
        })
      });
      
      console.log('Message response status:', messageResponse.status);
      const messageText = await messageResponse.text();
      console.log('Message response:', messageText);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugMessageError();