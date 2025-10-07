const mysql = require('mysql2/promise');

async function createOrderItemsTable() {
  const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'gkicks',
    ssl: false,
  };

  try {
    console.log('🔍 Creating order_items table...');
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Create order_items table with all required columns
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255),
        product_sku VARCHAR(100),
        quantity INT NOT NULL,
        size VARCHAR(20),
        color VARCHAR(50),
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Order_items table created successfully');
    
    // Verify the table structure
    const [columns] = await connection.execute('DESCRIBE order_items');
    console.log('📋 Order_items table structure:');
    console.table(columns);
    
    await connection.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
  }
}

createOrderItemsTable();