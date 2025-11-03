const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
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

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function setupAutoDeliveryTables() {
  let connection;
  
  try {
    log('🚀 Setting up auto-delivery database tables...', 'cyan');
    
    // Connect to the database
    connection = await mysql.createConnection(dbConfig);
    info('Connected to MySQL database');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'database', 'add-auto-delivery-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    info(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          log(`Statement ${i + 1}/${statements.length} executed successfully`, 'green');
        } catch (err) {
          if (err.code === 'ER_TABLE_EXISTS_ERROR' || 
              err.code === 'ER_DUP_FIELDNAME' || 
              err.message.includes('Duplicate column name')) {
            log(`Statement ${i + 1}/${statements.length} skipped (already exists)`, 'yellow');
          } else {
            throw err;
          }
        }
      }
    }
    
    success('All SQL statements executed successfully!');
    
    // Verify tables exist
    info('Verifying tables...');
    
    const tablesToCheck = ['order_status_history', 'refund_requests', 'delivery_notifications'];
    
    for (const table of tablesToCheck) {
      const [tables] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (tables.length > 0) {
        success(`Table '${table}' exists`);
      } else {
        error(`Table '${table}' not found`);
      }
    }
    
    // Check if orders table has required columns
    info('Checking orders table columns...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME IN ('shipped_at', 'delivered_at')
    `);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    if (columnNames.includes('shipped_at')) {
      success("Column 'shipped_at' exists in orders table");
    } else {
      error("Column 'shipped_at' not found in orders table");
    }
    
    if (columnNames.includes('delivered_at')) {
      success("Column 'delivered_at' exists in orders table");
    } else {
      error("Column 'delivered_at' not found in orders table");
    }
    
    success('Auto-delivery tables setup completed!');
    
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      info('Database connection closed');
    }
  }
}

// Run the setup
if (require.main === module) {
  setupAutoDeliveryTables().catch(err => {
    error(`Setup script failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { setupAutoDeliveryTables };