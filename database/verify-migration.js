#!/usr/bin/env node

/**
 * Verify Migration Script
 * 
 * This script verifies if the shipping_region column was successfully added
 * to the addresses table.
 */

const mysql = require('mysql2/promise');

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  multipleStatements: true
};

async function verifyMigration() {
  try {
    console.log('🔍 Verifying shipping_region column...');
    
    const connection = await mysql.createConnection(DB_CONFIG);
    
    try {
      // Check if column exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${DB_CONFIG.database}' 
        AND TABLE_NAME = 'addresses'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('\n📋 All columns in addresses table:');
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Default: ${col.COLUMN_DEFAULT}, Nullable: ${col.IS_NULLABLE}`);
      });
      
      // Specifically check for shipping_region
      const shippingRegionColumn = columns.find(col => col.COLUMN_NAME === 'shipping_region');
      
      if (shippingRegionColumn) {
        console.log('\n✅ shipping_region column found!');
        console.log(`   Type: ${shippingRegionColumn.DATA_TYPE}`);
        console.log(`   Default: ${shippingRegionColumn.COLUMN_DEFAULT}`);
        console.log(`   Nullable: ${shippingRegionColumn.IS_NULLABLE}`);
      } else {
        console.log('\n❌ shipping_region column NOT found!');
        console.log('The migration may have failed or the column name is different.');
      }
      
      // Try to add the column if it doesn't exist
      if (!shippingRegionColumn) {
        console.log('\n🔧 Attempting to add shipping_region column...');
        await connection.execute(`
          ALTER TABLE addresses 
          ADD COLUMN shipping_region VARCHAR(50) DEFAULT 'Luzon'
        `);
        console.log('✅ Column added successfully!');
        
        // Update existing records
        await connection.execute(`
          UPDATE addresses 
          SET shipping_region = 'Luzon' 
          WHERE shipping_region IS NULL
        `);
        console.log('✅ Existing records updated!');
      }
      
    } finally {
      await connection.end();
    }
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    
    // If the error is about duplicate column, that's actually good news
    if (err.message.includes('Duplicate column name')) {
      console.log('✅ Column already exists (duplicate column error is expected)');
    } else {
      process.exit(1);
    }
  }
}

// Run the verification
verifyMigration();