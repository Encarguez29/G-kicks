const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSupportDB() {
  try {
    console.log('🔍 Testing database connection...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'gkicks'  // Use the actual database name that exists
    });
    
    console.log('✅ Database connection successful');
    
    // Check if support_conversations table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "support_conversations"');
    console.log('Support conversations table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Check table structure
      const [columns] = await connection.execute('DESCRIBE support_conversations');
      console.log('\n📋 Table structure:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
      
      // Test insert operation
      console.log('\n🧪 Testing insert operation...');
      const testResult = await connection.execute(
        'INSERT INTO support_conversations (user_email, user_name, subject, status, last_message_at) VALUES (?, ?, ?, ?, NOW())',
        ['test@example.com', 'Test User', 'Test Subject', 'open']
      );
      
      console.log('✅ Insert successful, ID:', testResult[0].insertId);
      
      // Clean up test data
      await connection.execute('DELETE FROM support_conversations WHERE user_email = ?', ['test@example.com']);
      console.log('🧹 Test data cleaned up');
      
    } else {
      console.log('❌ Support conversations table does not exist');
      console.log('📝 Available tables:');
      const [allTables] = await connection.execute('SHOW TABLES');
      allTables.forEach(table => console.log(`  - ${Object.values(table)[0]}`));
    }
    
    // Check support_messages table
    const [messagesTables] = await connection.execute('SHOW TABLES LIKE "support_messages"');
    console.log('\nSupport messages table exists:', messagesTables.length > 0);
    
    await connection.end();
    console.log('✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  }
}

testSupportDB();