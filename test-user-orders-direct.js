const { executeQuery } = require('./lib/database/mysql');

async function testUserOrders() {
  try {
    console.log('🔍 Testing orders for user ID: 1 (gkcksdmn@gmail.com)');
    
    // Check if user exists
    const userCheck = await executeQuery(
      'SELECT id, email, first_name, last_name, is_admin FROM users WHERE id = ?',
      [1]
    );
    console.log('👤 User info:', userCheck[0] || 'User not found');
    
    // Check orders for this user
    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    const orders = await executeQuery(ordersQuery, [1]);
    console.log('📦 Orders found:', orders.length);
    console.log('📦 Orders data:', orders);
    
    // Check order items for these orders
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const itemsQuery = `
        SELECT 
          oi.*,
          p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
      `;
      
      const items = await executeQuery(itemsQuery, orderIds);
      console.log('🛍️ Order items found:', items.length);
      console.log('🛍️ Order items:', items);
    }
    
    // Check recent orders from all users for comparison
    const recentOrdersQuery = `
      SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.status,
        o.created_at,
        u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    
    const recentOrders = await executeQuery(recentOrdersQuery, []);
    console.log('🕒 Recent orders (all users):', recentOrders.length);
    console.log('🕒 Recent orders data:', recentOrders);
    
    // Test the exact query used by the orders API
    const apiQuery = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'product_id', oi.product_id,
            'variant_id', oi.variant_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product_name', p.name,
            'image_url', p.image_url,
            'size', pv.size,
            'color', pv.color
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE o.user_id = ?
      GROUP BY o.id, o.total_amount, o.status, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
    `;
    
    const apiResult = await executeQuery(apiQuery, [1]);
    console.log('🔧 API query result:', apiResult.length);
    console.log('🔧 API query data:', JSON.stringify(apiResult, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing user orders:', error);
  } finally {
    process.exit(0);
  }
}

testUserOrders();