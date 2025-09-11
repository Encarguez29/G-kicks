const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gkicks'
};

async function testAnalyticsFix() {
  let connection;
  
  try {
    console.log('🔍 Testing Analytics Fix - Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');

    // Test 1: Check category stats include both orders and POS data
    console.log('📊 Testing Category Statistics:');
    console.log('================================');
    
    const categoryStats = await connection.execute(`
      SELECT 
        category,
        SUM(orders) as orders,
        SUM(items_sold) as items_sold,
        SUM(revenue) as revenue
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
      ORDER BY revenue DESC
    `);
    
    console.log('Category Stats Results:');
    if (categoryStats[0].length > 0) {
      categoryStats[0].forEach(cat => {
        console.log(`- ${cat.category}: ${cat.orders} orders, ${cat.items_sold} items, $${cat.revenue}`);
      });
    } else {
      console.log('- No category data found');
    }
    
    // Test 2: Check top products include both orders and POS data
    console.log('\n🏆 Testing Top Products Statistics:');
    console.log('===================================');
    
    const topProducts = await connection.execute(`
      SELECT 
        id,
        name,
        brand,
        category,
        SUM(total_sold) as total_sold,
        SUM(revenue) as revenue,
        SUM(order_count) as order_count
      FROM (
        SELECT 
          p.id,
          p.name,
          p.brand,
          p.category,
          SUM(oi.quantity) as total_sold,
          SUM(oi.price * oi.quantity) as revenue,
          COUNT(DISTINCT oi.order_id) as order_count
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status IN ('completed', 'delivered', 'processing', 'pending')
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        GROUP BY p.id, p.name, p.brand, p.category
        
        UNION ALL
        
        SELECT 
          p.id,
          p.name,
          p.brand,
          p.category,
          SUM(pti.quantity) as total_sold,
          SUM(pti.total_price) as revenue,
          COUNT(DISTINCT pti.transaction_id) as order_count
        FROM pos_transaction_items pti
        JOIN products p ON pti.product_id = p.id
        JOIN pos_transactions pt ON pti.transaction_id = pt.id
        WHERE pt.status = 'completed'
          AND pt.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        GROUP BY p.id, p.name, p.brand, p.category
      ) combined_product_data
      GROUP BY id, name, brand, category
      ORDER BY total_sold DESC
      LIMIT 10
    `);
    
    console.log('Top Products Results:');
    if (topProducts[0].length > 0) {
      topProducts[0].forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.brand}) - ${product.total_sold} sold, $${product.revenue}`);
      });
    } else {
      console.log('- No product data found');
    }
    
    // Test 3: Compare with old queries (orders only)
    console.log('\n🔄 Comparison with Orders-Only Data:');
    console.log('====================================');
    
    const ordersOnlyCategory = await connection.execute(`
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
    
    console.log('Orders-Only Category Stats:');
    if (ordersOnlyCategory[0].length > 0) {
      ordersOnlyCategory[0].forEach(cat => {
        console.log(`- ${cat.category}: ${cat.orders} orders, ${cat.items_sold} items, $${cat.revenue}`);
      });
    } else {
      console.log('- No orders-only category data found');
    }
    
    console.log('\n✅ Analytics fix test completed!');
    console.log('\n📝 Summary:');
    console.log(`- Combined category stats: ${categoryStats[0].length} categories`);
    console.log(`- Combined top products: ${topProducts[0].length} products`);
    console.log(`- Orders-only categories: ${ordersOnlyCategory[0].length} categories`);
    
    if (categoryStats[0].length > ordersOnlyCategory[0].length) {
      console.log('🎉 SUCCESS: Combined data shows more categories than orders-only!');
    } else if (categoryStats[0].length === ordersOnlyCategory[0].length && categoryStats[0].length > 0) {
      console.log('ℹ️  INFO: Same number of categories, but revenue values should be higher in combined data');
    } else {
      console.log('⚠️  WARNING: No difference detected - may need to check POS data availability');
    }
    
  } catch (error) {
    console.error('❌ Error testing analytics fix:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testAnalyticsFix();