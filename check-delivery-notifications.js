const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkDeliveryNotifications() {
  let connection;
  
  try {
    console.log('🔍 Checking delivery_notifications table...');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });

    // Check if delivery_notifications table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'delivery_notifications'
    `, [process.env.MYSQL_DATABASE || 'gkicks']);
    
    if (tables.length === 0) {
      console.log('❌ delivery_notifications table does NOT exist');
      return false;
    }
    
    console.log('✅ delivery_notifications table exists');
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE delivery_notifications');
    console.log('\n📋 delivery_notifications table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Check for sample data
    const [count] = await connection.execute('SELECT COUNT(*) as count FROM delivery_notifications');
    console.log(`\n📊 Total delivery notifications: ${count[0].count}`);
    
    if (count[0].count > 0) {
      const [sample] = await connection.execute('SELECT * FROM delivery_notifications LIMIT 3');
      console.log('\n📋 Sample delivery notifications:');
      sample.forEach((notification, index) => {
        console.log(`Notification ${index + 1}:`, {
          id: notification.id,
          order_id: notification.order_id,
          user_id: notification.user_id,
          notification_type: notification.notification_type,
          title: notification.title,
          is_read: notification.is_read,
          created_at: notification.created_at
        });
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking delivery_notifications table:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDeliveryNotifications().then(exists => {
  if (!exists) {
    console.log('\n💡 The delivery_notifications table needs to be created.');
    console.log('This is likely the cause of the HTTP 500 error.');
  }
});