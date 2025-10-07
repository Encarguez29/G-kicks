#!/usr/bin/env node

/**
 * Migration Runner Script
 * 
 * This script runs the shipping region migration to add the shipping_region column
 * to the addresses table.
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

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
 * Execute SQL script
 */
async function executeSQLScript(connection, sqlContent, description) {
  try {
    info(`Executing ${description}...`);
    
    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }
    
    success(`${description} completed successfully`);
  } catch (err) {
    error(`Failed to execute ${description}: ${err.message}`);
    throw err;
  }
}

/**
 * Run the shipping region migration
 */
async function runMigration() {
  try {
    log('🚀 Running shipping region migration...', 'cyan');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'add-shipping-region-column.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Connect to the database
    const connection = await createConnection();
    
    try {
      // Execute the migration
      await executeSQLScript(connection, migrationSQL, 'shipping region migration');
      
      // Verify the column was added
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${DB_CONFIG.database}' 
        AND TABLE_NAME = 'addresses' 
        AND COLUMN_NAME = 'shipping_region'
      `);
      
      if (columns.length > 0) {
        success('shipping_region column verified in addresses table');
      } else {
        error('shipping_region column not found after migration');
      }
      
      success('Migration completed successfully!');
      
    } finally {
      await connection.end();
    }
    
  } catch (err) {
    error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(err => {
    error(`Migration script failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runMigration };