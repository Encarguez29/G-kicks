#!/usr/bin/env node

/**
 * Check Addresses Table Structure
 * 
 * This script checks the structure of the addresses table to verify
 * if the shipping_region column exists.
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

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Create database connection
 */
async function createConnection() {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    return connection;
  } catch (err) {
    error(`Failed to connect to database: ${err.message}`);
    throw err;
  }
}

/**
 * Check addresses table structure
 */
async function checkAddressesTable() {
  try {
    log('🔍 Checking addresses table structure...', 'cyan');
    
    const connection = await createConnection();
    
    try {
      // Check table structure
      const [columns] = await connection.execute('DESCRIBE addresses');
      
      info('Addresses table structure:');
      console.table(columns);
      
      // Check if shipping_region column exists
      const shippingRegionColumn = columns.find(col => col.Field === 'shipping_region');
      
      if (shippingRegionColumn) {
        success('shipping_region column found!');
        info(`Type: ${shippingRegionColumn.Type}`);
        info(`Default: ${shippingRegionColumn.Default}`);
        info(`Null: ${shippingRegionColumn.Null}`);
      } else {
        error('shipping_region column NOT found!');
      }
      
      // Check sample data
      const [addresses] = await connection.execute('SELECT * FROM addresses LIMIT 3');
      
      if (addresses.length > 0) {
        info('Sample addresses data:');
        console.table(addresses);
      } else {
        info('No addresses found in the table');
      }
      
    } finally {
      await connection.end();
    }
    
  } catch (err) {
    error(`Check failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the check
if (require.main === module) {
  checkAddressesTable().catch(err => {
    error(`Script failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { checkAddressesTable };