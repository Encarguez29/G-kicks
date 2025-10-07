#!/usr/bin/env node

const mysql = require('mysql2/promise');

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks'
};

async function checkReviewsTable() {
  try {
    console.log('🔍 Checking reviews table...');
    
    const connection = await mysql.createConnection(DB_CONFIG);
    
    try {
      // Check if reviews table exists
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'reviews'"
      );
      
      if (tables.length === 0) {
        console.log('❌ Reviews table does not exist!');
        
        // Create the reviews table
        console.log('📝 Creating reviews table...');
        const createTableSQL = `
          CREATE TABLE reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            user_id INT NULL,
            user_name VARCHAR(100) NOT NULL,
            user_email VARCHAR(255) NULL,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT NOT NULL,
            photos JSON NULL,
            is_verified_purchase BOOLEAN DEFAULT FALSE,
            is_approved BOOLEAN DEFAULT TRUE,
            helpful_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            
            INDEX idx_product_id (product_id),
            INDEX idx_user_id (user_id),
            INDEX idx_rating (rating),
            INDEX idx_created_at (created_at),
            INDEX idx_approved (is_approved)
          )`;
        
        await connection.execute(createTableSQL);
        console.log('✅ Reviews table created successfully!');
      } else {
        console.log('✅ Reviews table exists');
        
        // Check table structure
        const [columns] = await connection.execute('DESCRIBE reviews');
        console.log('📋 Table structure:');
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });
        
        // Check existing reviews
        const [reviews] = await connection.execute('SELECT * FROM reviews');
        console.log(`📊 Found ${reviews.length} reviews in database`);
        
        if (reviews.length > 0) {
          console.log('📝 Recent reviews:');
          reviews.slice(0, 3).forEach(review => {
            console.log(`  - ID: ${review.id}, Product: ${review.product_id}, Rating: ${review.rating}, User: ${review.user_name}`);
          });
        }
      }
      
    } finally {
      await connection.end();
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkReviewsTable();