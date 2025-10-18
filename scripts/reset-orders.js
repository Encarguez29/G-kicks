/**
 * Reset all orders by permanently deleting orders and their related items.
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

async function resetOrders() {
  let connection;
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);

    // Verify orders table exists
    const [ordersTable] = await connection.execute('SHOW TABLES LIKE "orders"');
    if (ordersTable.length === 0) {
      console.log('❌ Orders table not found. Aborting.');
      return;
    }

    await connection.beginTransaction();

    // Delete notification views referencing orders (if table exists)
    let notifAffected = 0;
    const [notifTable] = await connection.execute('SHOW TABLES LIKE "notification_views"');
    if (notifTable.length > 0) {
      const [resNotif] = await connection.execute(`
        DELETE nv FROM notification_views nv
        INNER JOIN orders o ON nv.order_id = o.id
      `);
      notifAffected = resNotif.affectedRows || 0;
      console.log(`🧹 Deleted ${notifAffected} notification views linked to orders`);
    } else {
      console.log('ℹ️ notification_views table not found; skipping');
    }

    // Delete order items linked to orders
    const [resItems] = await connection.execute(`
      DELETE oi FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
    `);
    const itemsAffected = resItems.affectedRows || 0;
    console.log(`🧹 Deleted ${itemsAffected} order items`);

    // Delete all orders
    const [resOrders] = await connection.execute(`DELETE FROM orders`);
    const ordersAffected = resOrders.affectedRows || 0;
    console.log(`🗑️ Deleted ${ordersAffected} orders`);

    await connection.commit();
    console.log('✅ Orders reset complete.');
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Failed to reset orders:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

resetOrders();