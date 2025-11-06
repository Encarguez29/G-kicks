const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load .env.local if present
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`Loaded env from ${envPath}`);
  }
} catch (_) {}

// Resolve configuration from environment variables (supports both MYSQL_* and DB_*)
const cfg = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'gkicks',
  sslEnabled: (process.env.MYSQL_SSL === 'true') || (process.env.DB_SSL === 'true'),
};

(async () => {
  const sqlFile = path.join(__dirname, '..', 'gkicks.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error(`Schema file not found: ${sqlFile}`);
    process.exit(1);
  }

  console.log('Connecting to MySQL...');
  console.log({ host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database, ssl: cfg.sslEnabled });

  let connection;
  try {
    connection = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.sslEnabled ? { rejectUnauthorized: false } : undefined,
      multipleStatements: true,
    });

    const raw = fs.readFileSync(sqlFile, 'utf8');
    // Split statements on semicolons while ignoring line comments
    const statements = raw
      .replace(/\r\n/g, '\n')
      .split(';')
      .map(s => s.replace(/--.*$/gm, '').trim())
      .filter(Boolean);

    console.log(`Executing ${statements.length} SQL statements from gkicks.sql...`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await connection.query(stmt);
        if ((i + 1) % 10 === 0 || i === statements.length - 1) {
          console.log(`Progress: ${i + 1}/${statements.length}`);
        }
      } catch (err) {
        console.error(`Failed at statement ${i + 1}:`, err.message);
        console.error('Statement:', stmt.slice(0, 200) + (stmt.length > 200 ? '...' : ''));
        throw err;
      }
    }

    console.log('✅ Schema import completed successfully.');
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
})();