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

    // First, let's check if we have any archived messages
    const [archivedItems] = await connection.execute(`
      SELECT id, type, name, archived_date, archived_by, reason 
      FROM archived_items 
      WHERE type = 'message' 
      ORDER BY archived_date DESC 
      LIMIT 5
    `);

    console.log('📋 Found archived messages:', archivedItems.length);
    if (archivedItems.length === 0) {
      console.log('❌ No archived messages found to test deletion');
      return;
    }

    archivedItems.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: ${item.name}, Archived: ${item.archived_date}`);
    });

    // Test individual message deletion
    const firstMessageId = archivedItems[0].id;
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
    if (archivedItems.length > 1) {
      const remainingIds = archivedItems.slice(1, 3).map(item => item.id);
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