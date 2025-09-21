const mysql = require('mysql2/promise');
require('dotenv').config();

async function createSupportTables() {
  try {
    console.log('🔍 Connecting to database...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'gkicks'
    });
    
    console.log('✅ Connected to database');
    
    // Create support_conversations table
    const createConversationsTable = `
      CREATE TABLE IF NOT EXISTS support_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        subject VARCHAR(255),
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        assigned_to INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_last_message_at (last_message_at)
      )
    `;
    
    await connection.execute(createConversationsTable);
    console.log('✅ Created support_conversations table');
    
    // Create support_messages table
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS support_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_type ENUM('customer', 'admin', 'system') NOT NULL,
        sender_id INT NULL,
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        message_content TEXT NOT NULL,
        message_type ENUM('text', 'order_inquiry', 'system_notification') DEFAULT 'text',
        order_id VARCHAR(100) NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_type (sender_type),
        INDEX idx_created_at (created_at),
        INDEX idx_is_read (is_read)
      )
    `;
    
    await connection.execute(createMessagesTable);
    console.log('✅ Created support_messages table');
    
    // Create additional indexes
    try {
      await connection.execute('CREATE INDEX idx_conversations_user_status ON support_conversations(user_id, status)');
      console.log('✅ Created additional index on conversations');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('ℹ️  Index already exists, skipping...');
      } else {
        console.error('❌ Index error:', err.message);
      }
    }
    
    try {
      await connection.execute('CREATE INDEX idx_messages_conversation_read ON support_messages(conversation_id, is_read)');
      console.log('✅ Created additional index on messages');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('ℹ️  Index already exists, skipping...');
      } else {
        console.error('❌ Index error:', err.message);
      }
    }
    
    // Verify tables were created
    const [tables] = await connection.execute('SHOW TABLES LIKE "support_%"');
    console.log('📋 Support tables found:', tables.length);
    tables.forEach(table => console.log('  -', Object.values(table)[0]));
    
    // Test insert
    console.log('🧪 Testing table functionality...');
    const [result] = await connection.execute(
      'INSERT INTO support_conversations (user_email, user_name, subject, status, last_message_at) VALUES (?, ?, ?, ?, NOW())',
      ['test@example.com', 'Test User', 'Test Subject', 'open']
    );
    
    const conversationId = result.insertId;
    console.log('✅ Test conversation created with ID:', conversationId);
    
    await connection.execute(
      'INSERT INTO support_messages (conversation_id, sender_type, sender_name, sender_email, message_content) VALUES (?, ?, ?, ?, ?)',
      [conversationId, 'customer', 'Test User', 'test@example.com', 'Test message content']
    );
    
    console.log('✅ Test message created');
    
    // Clean up test data
    await connection.execute('DELETE FROM support_conversations WHERE user_email = ?', ['test@example.com']);
    console.log('🧹 Test data cleaned up');
    
    await connection.end();
    console.log('✅ Support tables setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating support tables:', error.message);
    console.error('Full error:', error);
  }
}

createSupportTables();