const mysql = require('mysql2/promise');

async function testMessageDeletion() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🔍 Testing message deletion functionality...\n');

    // First, let's check if we have any archived messages (closed support conversations)
    const [archivedMessages] = await connection.execute(`
      SELECT 
        id,
        CONCAT('Conversation #', id, ' - ', COALESCE(subject, 'Support Request')) as name,
        'message' as type,
        updated_at as archived_at,
        'System' as archived_by,
        'Conversation closed' as reason
      FROM support_conversations
      WHERE status = 'closed'
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    console.log('📋 Found archived messages:', archivedMessages.length);
    if (archivedMessages.length === 0) {
      console.log('❌ No archived messages found to test deletion');
      
      // Let's create a test closed conversation for testing
      console.log('🔧 Creating a test closed conversation...');
      await connection.execute(`
        INSERT INTO support_conversations (user_email, user_name, subject, status, created_at, updated_at, last_message_at)
        VALUES ('test@example.com', 'Test User', 'Test Support Request', 'closed', NOW(), NOW(), NOW())
      `);
      
      // Fetch again
      const [newArchivedMessages] = await connection.execute(`
        SELECT 
          id,
          CONCAT('Conversation #', id, ' - ', COALESCE(subject, 'Support Request')) as name,
          'message' as type,
          updated_at as archived_at,
          'System' as archived_by,
          'Conversation closed' as reason
        FROM support_conversations
        WHERE status = 'closed'
        ORDER BY updated_at DESC
        LIMIT 5
      `);
      
      if (newArchivedMessages.length === 0) {
        console.log('❌ Still no archived messages found after creating test data');
        return;
      }
      
      console.log('✅ Created test conversation for testing');
      archivedMessages.push(...newArchivedMessages);
    }

    archivedMessages.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: ${item.name}, Archived: ${item.archived_at}`);
    });

    // Test individual message deletion
    const firstMessageId = archivedMessages[0].id;
    console.log(`\n🧪 Testing individual deletion of message ID: ${firstMessageId}`);

    const individualResponse = await fetch('http://localhost:3000/api/admin/archive/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'admin_token=valid_token_here'
      },
      body: JSON.stringify({
        id: firstMessageId,
        type: 'message'
      })
    });

    const individualResult = await individualResponse.text();
    console.log(`Individual delete status: ${individualResponse.status}`);
    console.log(`Individual delete response: ${individualResult}`);

    // Test bulk message deletion if we have more messages
    if (archivedMessages.length > 1) {
      const remainingIds = archivedMessages.slice(1, 3).map(item => item.id);
      console.log(`\n🧪 Testing bulk deletion of message IDs: ${remainingIds.join(', ')}`);

      const bulkResponse = await fetch('http://localhost:3000/api/admin/archive/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'admin_token=valid_token_here'
        },
        body: JSON.stringify({
          items: remainingIds.map(id => ({ id, type: 'message' }))
        })
      });

      const bulkResult = await bulkResponse.text();
      console.log(`Bulk delete status: ${bulkResponse.status}`);
      console.log(`Bulk delete response: ${bulkResult}`);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await connection.end();
  }
}

testMessageDeletion();