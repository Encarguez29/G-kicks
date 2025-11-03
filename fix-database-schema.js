const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gkicks',
};

async function fixDatabaseSchema() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check current schema of email_verification_tokens table
    console.log('\n📋 Checking current schema of email_verification_tokens table...');
    const [columns] = await connection.execute('DESCRIBE email_verification_tokens');
    
    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Check if verification_code column exists
    const hasVerificationCode = columns.some(col => col.Field === 'verification_code');
    
    if (hasVerificationCode) {
      console.log('\n✅ verification_code column already exists!');
    } else {
      console.log('\n❌ verification_code column is missing. Adding it now...');
      
      // Add the missing verification_code column
      await connection.execute(`
        ALTER TABLE email_verification_tokens 
        ADD COLUMN verification_code VARCHAR(6) NOT NULL AFTER token
      `);
      
      console.log('✅ verification_code column added successfully!');
      
      // Verify the change
      console.log('\n📋 Verifying updated schema...');
      const [updatedColumns] = await connection.execute('DESCRIBE email_verification_tokens');
      
      console.log('Updated columns:');
      updatedColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
      });
    }

    // Also check if we need to add other missing columns that might be referenced
    console.log('\n🔍 Checking for other potential missing columns...');
    
    // Check if used_at column exists (referenced in some queries)
    const hasUsedAt = columns.some(col => col.Field === 'used_at');
    if (!hasUsedAt) {
      console.log('❌ used_at column is missing. Adding it...');
      await connection.execute(`
        ALTER TABLE email_verification_tokens 
        ADD COLUMN used_at TIMESTAMP NULL DEFAULT NULL
      `);
      console.log('✅ used_at column added successfully!');
    }

    // Check if created_at column exists (referenced in some queries)
    const hasCreatedAt = columns.some(col => col.Field === 'created_at');
    if (!hasCreatedAt) {
      console.log('❌ created_at column is missing. Adding it...');
      await connection.execute(`
        ALTER TABLE email_verification_tokens 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ created_at column added successfully!');
    }

    console.log('\n🎉 Database schema fix completed successfully!');
    console.log('The registration API should now work properly.');

  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

fixDatabaseSchema();