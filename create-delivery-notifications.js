const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createDeliveryNotifications() {
  let connection;
  
  try {
    console.log('🔧 Creating delivery_notifications table...');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });

    // Add delivery tracking fields to orders table (if not exists)
    console.log('📋 Adding delivery tracking fields to orders table...');
    try {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN shipped_at TIMESTAMP NULL COMMENT 'When the order was marked as shipped',
        ADD COLUMN delivered_at TIMESTAMP NULL COMMENT 'When the order was marked as delivered by customer',
        ADD COLUMN tracking_number VARCHAR(100) NULL COMMENT 'Shipping tracking number',
        ADD COLUMN delivery_confirmation_required BOOLEAN DEFAULT TRUE COMMENT 'Whether customer needs to confirm delivery'
      `);
      console.log('✅ Added delivery tracking fields to orders table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Delivery tracking fields already exist in orders table');
      } else {
        console.error('❌ Error adding delivery tracking fields:', error.message);
      }
    }

    // Create delivery_notifications table
    console.log('📋 Creating delivery_notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS delivery_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          user_id INT NOT NULL,
          notification_type ENUM('shipped', 'delivered', 'delivery_confirmation') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP NULL,
          email_sent BOOLEAN DEFAULT FALSE,
          email_sent_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_notifications (user_id, is_read),
          INDEX idx_order_notifications (order_id),
          INDEX idx_notification_type (notification_type)
      )
    `);
    console.log('✅ Created delivery_notifications table');

    // Create delivery_confirmations table
    console.log('📋 Creating delivery_confirmations table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS delivery_confirmations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL UNIQUE,
          user_id INT NOT NULL,
          confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          confirmation_method ENUM('web', 'email', 'sms') DEFAULT 'web',
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created delivery_confirmations table');

    // Update existing orders to set shipped_at for orders that are already shipped
    console.log('📋 Updating existing shipped orders...');
    const [shippedResult] = await connection.execute(`
      UPDATE orders 
      SET shipped_at = updated_at 
      WHERE status IN ('shipped', 'delivered') AND shipped_at IS NULL
    `);
    console.log(`✅ Updated ${shippedResult.affectedRows} shipped orders`);

    // Update existing orders to set delivered_at for orders that are already delivered
    console.log('📋 Updating existing delivered orders...');
    const [deliveredResult] = await connection.execute(`
      UPDATE orders 
      SET delivered_at = updated_at 
      WHERE status = 'delivered' AND delivered_at IS NULL
    `);
    console.log(`✅ Updated ${deliveredResult.affectedRows} delivered orders`);

    console.log('\n🎉 Successfully created all delivery notification tables!');
    
  } catch (error) {
    console.error('❌ Error creating delivery notification tables:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDeliveryNotifications();