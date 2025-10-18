#!/usr/bin/env node
/**
 * Deactivate an admin user (soft delete) in `admin_users` table.
 * Usage:
 *   node scripts/deactivate-admin.js --email testadmin@gkicks.com
 *   node scripts/deactivate-admin.js --username testadmin
 */
const mysql = require('mysql2/promise');

function getEnv(name, fallback) {
  return process.env[name] ?? fallback;
}

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  let email = null;
  let username = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') {
      email = args[i + 1] || null;
      i++;
    } else if (args[i] === '--username') {
      username = args[i + 1] || null;
      i++;
    }
  }

  // Default to the known test admin if nothing provided
  if (!email && !username) {
    email = 'testadmin@gkicks.com';
  }

  if (!email && !username) {
    console.error('ERROR: Provide --email or --username');
    process.exit(1);
  }

  const dbConfig = {
    host: getEnv('DB_HOST', getEnv('MYSQL_HOST', 'localhost')),
    port: parseInt(getEnv('DB_PORT', getEnv('MYSQL_PORT', '3306')), 10),
    user: getEnv('DB_USER', getEnv('MYSQL_USER', 'root')),
    password: getEnv('DB_PASSWORD', getEnv('MYSQL_PASSWORD', '')),
    database: getEnv('DB_NAME', getEnv('MYSQL_DATABASE', 'gkicks')),
    ssl: getEnv('DB_SSL', getEnv('MYSQL_SSL', 'false')) === 'true' ? { rejectUnauthorized: false } : undefined,
  };

  console.log('Connecting to MySQL with config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    ssl: !!dbConfig.ssl,
  });

  const conn = await mysql.createConnection(dbConfig);
  try {
    console.log('Connected. Searching for admin user...');
    let row;

    if (email && username) {
      const [rows] = await conn.execute(
        'SELECT id, email, username, is_active FROM admin_users WHERE email = ? OR username = ? LIMIT 1',
        [email, username]
      );
      row = rows[0];
    } else if (email) {
      const [rows] = await conn.execute(
        'SELECT id, email, username, is_active FROM admin_users WHERE email = ? LIMIT 1',
        [email]
      );
      row = rows[0];
    } else {
      const [rows] = await conn.execute(
        'SELECT id, email, username, is_active FROM admin_users WHERE username = ? LIMIT 1',
        [username]
      );
      row = rows[0];
    }

    if (!row) {
      console.log('No matching admin user found.', { email, username });
      process.exit(0);
    }

    console.log('Found admin user:', row);

    if (row.is_active === 0 || row.is_active === false) {
      console.log('Admin user is already inactive. No changes made.');
    } else {
      const [result] = await conn.execute(
        'UPDATE admin_users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [row.id]
      );
      console.log('Deactivate result:', result && result.affectedRows);
    }

    const [checkRows] = await conn.execute(
      'SELECT id, email, username, is_active FROM admin_users WHERE id = ?',
      [row.id]
    );
    console.log('Post-update state:', checkRows[0]);

    console.log('Done: Admin user deactivated.');
  } catch (err) {
    console.error('Failed to deactivate admin user:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();