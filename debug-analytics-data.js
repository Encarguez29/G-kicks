const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gkicks',
  port: 3306
};

async function debugAnalyticsData() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Check total orders vs POS transactions
    console.log('\n=== ORDERS VS POS COMPARISON ===');
    
    const [ordersCount] = await connection.execute(
      'SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM orders WHERE status IN ("completed", "delivered", "processing", "pending")'
    );
    console.log('Regular Orders:', ordersCount[0]);
    
    const [posCount] = await connection.execute(
      'SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM pos_transactions WHERE status = "completed"'
    );
    console.log('POS Transactions:', posCount[0]);
    
    // Check combined analytics query
    console.log('\n=== COMBINED ANALYTICS QUERY ===');
    const [combinedStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue
      FROM (
        SELECT total_amount
        FROM orders 
        WHERE status IN ('completed', 'delivered', 'processing', 'pending')
        UNION ALL
        SELECT total_amount
        FROM pos_transactions 
        WHERE status = 'completed'
      ) combined_data
    `);
    console.log('Combined Stats:', combinedStats[0]);
    
    // Check category stats (current implementation - orders only)
    console.log('\n=== CATEGORY STATS (ORDERS ONLY) ===');
    const [categoryStatsOrders] = await connection.execute(`
      SELECT 
        p.category,
        COUNT(DISTINCT oi.order_id) as orders,
        SUM(oi.quantity) as items_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('completed', 'delivered', 'processing', 'pending')
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      GROUP BY p.category
      ORDER BY revenue DESC
    `);
    console.log('Category Stats (Orders Only):');
    console.table(categoryStatsOrders);
    
    // Check if POS transaction items exist
    console.log('\n=== POS TRANSACTION ITEMS CHECK ===');
    const [posItemsCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM pos_transaction_items'
    );
    console.log('POS Transaction Items Count:', posItemsCount[0]);
    
    if (posItemsCount[0].count > 0) {
      const [posItemsSample] = await connection.execute(
        'SELECT * FROM pos_transaction_items LIMIT 5'
      );
      console.log('Sample POS Transaction Items:');
      console.table(posItemsSample);
      
      // Check category stats including POS data
      console.log('\n=== CATEGORY STATS (INCLUDING POS) ===');
      const [categoryStatsWithPos] = await connection.execute(`
        SELECT 
          category,
          SUM(orders) as total_orders,
          SUM(items_sold) as total_items_sold,
          SUM(revenue) as total_revenue
        FROM (
          SELECT 
            p.category,
            COUNT(DISTINCT oi.order_id) as orders,
            SUM(oi.quantity) as items_sold,
            SUM(oi.price * oi.quantity) as revenue
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.status IN ('completed', 'delivered', 'processing', 'pending')
            AND o.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
          GROUP BY p.category
          
          UNION ALL
          
          SELECT 
            p.category,
            COUNT(DISTINCT pti.transaction_id) as orders,
            SUM(pti.quantity) as items_sold,
            SUM(pti.total_price) as revenue
          FROM pos_transaction_items pti
          JOIN products p ON pti.product_id = p.id
          JOIN pos_transactions pt ON pti.transaction_id = pt.id
          WHERE pt.status = 'completed'
            AND pt.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
          GROUP BY p.category
        ) combined_category_data
        GROUP BY category
        ORDER BY total_revenue DESC
      `);
      console.log('Category Stats (Including POS):');
      console.table(categoryStatsWithPos);
    }
    
    // Check recent activity
    console.log('\n=== RECENT ACTIVITY ===');
    const [recentOrders] = await connection.execute(
      'SELECT id, total_amount, status, created_at, "order" as type FROM orders ORDER BY created_at DESC LIMIT 5'
    );
    console.log('Recent Orders:');
    console.table(recentOrders);
    
    const [recentPos] = await connection.execute(
      'SELECT id, total_amount, status, created_at, "pos" as type FROM pos_transactions ORDER BY created_at DESC LIMIT 5'
    );
    console.log('Recent POS Transactions:');
    console.table(recentPos);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

debugAnalyticsData();