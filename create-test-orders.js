const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
};

async function createTestOrders() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
    
    // Create orders table if it doesn't exist
    console.log('📋 Creating orders table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        shipping_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Orders table created/verified');
    
    // Create admin_users table if it doesn't exist
    console.log('👤 Creating admin_users table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'staff', 'manager') DEFAULT 'staff',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Admin users table created/verified');
    
    // Insert a test admin user if none exists
    const [adminUsers] = await connection.execute('SELECT COUNT(*) as count FROM admin_users');
    if (adminUsers[0].count === 0) {
      await connection.execute(`
        INSERT INTO admin_users (username, email, password_hash, role) 
        VALUES ('admin', 'admin@gkicks.com', '$2b$10$dummy.hash.for.testing', 'admin')
      `);
      console.log('👤 Test admin user created');
    }
    
    // Check if orders already exist
    const [existingOrders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
    
    if (existingOrders[0].count > 0) {
      console.log(`ℹ️  ${existingOrders[0].count} orders already exist`);
    } else {
      console.log('📦 Creating test orders...');
      
      // Insert sample orders
      const testOrders = [
        {
          order_number: 'GK17567538253181',
          customer_name: 'G-KicksAdmin',
          customer_email: 'customer1@example.com',
          total_amount: 1394.32,
          status: 'pending',
          payment_status: 'pending',
          shipping_address: '123 Main St, City, State 12345'
        },
        {
          order_number: 'GK17567414170302',
          customer_name: 'G-KicksAdmin',
          customer_email: 'customer2@example.com',
          total_amount: 1394.32,
          status: 'pending',
          payment_status: 'pending',
          shipping_address: '456 Oak Ave, City, State 12345'
        },
        {
          order_number: 'GK17566961133753',
          customer_name: 'G-KicksAdmin',
          customer_email: 'customer3@example.com',
          total_amount: 1394.32,
          status: 'processing',
          payment_status: 'paid',
          shipping_address: '789 Pine Rd, City, State 12345'
        },
        {
          order_number: 'GK17566845092104',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          total_amount: 899.99,
          status: 'shipped',
          payment_status: 'paid',
          shipping_address: '321 Elm St, City, State 12345'
        },
        {
          order_number: 'GK17566729051455',
          customer_name: 'Jane Smith',
          customer_email: 'jane@example.com',
          total_amount: 1299.50,
          status: 'delivered',
          payment_status: 'paid',
          shipping_address: '654 Maple Dr, City, State 12345'
        }
      ];
      
      for (const order of testOrders) {
        await connection.execute(`
          INSERT INTO orders (order_number, customer_name, customer_email, order_source, total_amount, status, payment_status, shipping_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          order.order_number,
          order.customer_name,
          order.customer_email,
          'online', // Test orders are considered online orders
          order.total_amount,
          order.status,
          order.payment_status,
          order.shipping_address
        ]);
      }
      
      console.log(`✅ Created ${testOrders.length} test orders`);
    }
    
    // Display current orders
    const [orders] = await connection.execute(
      'SELECT id, order_number, customer_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC'
    );
    
    console.log('\n📋 Current orders in database:');
    orders.forEach(order => {
      const timeAgo = getTimeAgo(order.created_at);
      console.log(`  #${order.order_number}: ${order.customer_name} - ₱${order.total_amount} (${order.status}) - ${timeAgo}`);
    });
    
    console.log('\n🎉 Test data setup complete!');
    console.log('💡 You can now test the notification functionality by:');
    console.log('   1. Starting the dev server: npm run dev');
    console.log('   2. Opening the admin panel');
    console.log('   3. Checking the notification bell icon');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

createTestOrders();