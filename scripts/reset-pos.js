/**
 * Reset all POS data by permanently deleting POS transactions and items.
 * WARNING: This action is irreversible. Intended for admin/dev use only.
 */
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function resetPOS() {
  let connection;
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);

    // Verify POS tables exist
    const [posTxTable] = await connection.execute('SHOW TABLES LIKE "pos_transactions"');
    const [posItemsTable] = await connection.execute('SHOW TABLES LIKE "pos_transaction_items"');
    const [posDailyTable] = await connection.execute('SHOW TABLES LIKE "pos_daily_sales"');

    if (posTxTable.length === 0) {
      console.log('❌ pos_transactions table not found. Aborting.');
      return;
    }

    await connection.beginTransaction();

    // Delete POS transaction items linked to transactions
    if (posItemsTable.length > 0) {
      const [resPosItems] = await connection.execute(`
        DELETE pti FROM pos_transaction_items pti
        INNER JOIN pos_transactions pt ON pti.transaction_id = pt.id
      `);
      const posItemsAffected = resPosItems.affectedRows || 0;
      console.log(`🧹 Deleted ${posItemsAffected} POS transaction items`);
    } else {
      console.log('ℹ️ pos_transaction_items table not found; skipping');
    }

    // Delete POS transactions
    const [resPosTx] = await connection.execute('DELETE FROM pos_transactions');
    const posTxAffected = resPosTx.affectedRows || 0;
    console.log(`🗑️ Deleted ${posTxAffected} POS transactions`);

    // Delete POS daily sales summaries if present
    if (posDailyTable.length > 0) {
      const [resDaily] = await connection.execute('DELETE FROM pos_daily_sales');
      const dailyAffected = resDaily.affectedRows || 0;
      console.log(`🗑️ Deleted ${dailyAffected} POS daily sales summaries`);
    } else {
      console.log('ℹ️ pos_daily_sales table not found; skipping');
    }

    await connection.commit();
    console.log('✅ POS reset complete.');
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Failed to reset POS:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

resetPOS();