const mysql = require('mysql2/promise');

async function testStockRestoration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🧪 Testing Stock Restoration Functionality\n');

    // Step 1: Check current stock for a product
    const productId = 19; // Jordan 4 Retro SB
    const color = 'Pine Green';
    const size = '7';

    console.log('📊 Step 1: Checking initial stock...');
    const [initialProduct] = await connection.execute(
      'SELECT id, name, variants, stock_quantity FROM products WHERE id = ?',
      [productId]
    );

    if (initialProduct.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const product = initialProduct[0];
    const variants = JSON.parse(product.variants || '{}');
    const initialStock = variants[color]?.[size] || 0;
    const initialTotalStock = product.stock_quantity;

    console.log(`📦 Product: ${product.name}`);
    console.log(`📦 Initial stock for ${color} ${size}: ${initialStock}`);
    console.log(`📦 Initial total stock: ${initialTotalStock}\n`);

    // Step 2: Check if there are any existing orders to cancel
    console.log('📋 Step 2: Looking for existing orders to test cancellation...');
    const [existingOrders] = await connection.execute(
      `SELECT o.id, o.order_number, o.status, oi.product_id, oi.quantity, oi.size, oi.color
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       WHERE oi.product_id = ? AND oi.color = ? AND oi.size = ? 
       AND o.status IN ('pending', 'processing')
       ORDER BY o.created_at DESC 
       LIMIT 1`,
      [productId, color, size]
    );

    if (existingOrders.length === 0) {
      console.log('⚠️ No existing orders found for this product variant.');
      console.log('💡 Create an order first using the test-order-creation.js script, then run this test.\n');
      return;
    }

    const order = existingOrders[0];
    console.log(`📋 Found order: ${order.order_number} (ID: ${order.id})`);
    console.log(`📋 Order status: ${order.status}`);
    console.log(`📋 Order quantity: ${order.quantity} x ${order.color} ${order.size}\n`);

    // Step 3: Simulate order cancellation via API
    console.log('🔄 Step 3: Testing order cancellation with stock restoration...');
    
    // We'll simulate the cancellation logic directly since we don't have the full API context
    console.log('🔄 Simulating stock restoration...');

    // Get order items
    const [orderItems] = await connection.execute(
      'SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?',
      [order.id]
    );

    console.log(`📦 Found ${orderItems.length} items to restore stock for`);

    // Restore stock for each item
    for (const item of orderItems) {
      console.log(`🔄 Restoring stock for product ${item.product_id}: ${item.color} ${item.size} +${item.quantity}`);

      // Get current product data
      const [productResult] = await connection.execute(
        'SELECT variants, stock_quantity FROM products WHERE id = ?',
        [item.product_id]
      );

      if (productResult.length === 0) {
        console.warn(`⚠️ Product ${item.product_id} not found, skipping`);
        continue;
      }

      const currentProduct = productResult[0];
      let currentVariants = JSON.parse(currentProduct.variants || '{}');

      // Restore stock to variants
      if (!currentVariants[item.color]) currentVariants[item.color] = {};
      const currentStock = currentVariants[item.color][item.size] || 0;
      const restoredStock = currentStock + item.quantity;
      currentVariants[item.color][item.size] = restoredStock;

      // Calculate new total stock
      let totalStock = 0;
      Object.values(currentVariants).forEach((sizeStocks) => {
        totalStock += Object.values(sizeStocks).reduce((sum, qty) => sum + qty, 0);
      });

      // Update database
      await connection.execute(
        'UPDATE products SET variants = ?, stock_quantity = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(currentVariants), totalStock, item.product_id]
      );

      console.log(`✅ Stock restored: ${item.color} ${item.size} now has ${restoredStock} (was ${currentStock})`);
    }

    // Update order status to cancelled
    await connection.execute(
      'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [order.id]
    );

    console.log(`✅ Order ${order.order_number} cancelled successfully\n`);

    // Step 4: Verify the stock restoration
    console.log('🔍 Step 4: Verifying stock restoration...');
    const [finalProduct] = await connection.execute(
      'SELECT variants, stock_quantity FROM products WHERE id = ?',
      [productId]
    );

    const finalVariants = JSON.parse(finalProduct[0].variants || '{}');
    const finalStock = finalVariants[color]?.[size] || 0;
    const finalTotalStock = finalProduct[0].stock_quantity;

    console.log(`📦 Final stock for ${color} ${size}: ${finalStock}`);
    console.log(`📦 Final total stock: ${finalTotalStock}`);
    console.log(`📈 Stock change: +${finalStock - initialStock} (expected: +${order.quantity})`);
    console.log(`📈 Total stock change: +${finalTotalStock - initialTotalStock}\n`);

    // Verify the restoration was correct
    if (finalStock === initialStock + order.quantity) {
      console.log('✅ Stock restoration test PASSED! Stock was correctly restored.');
    } else {
      console.log('❌ Stock restoration test FAILED! Stock was not correctly restored.');
      console.log(`Expected: ${initialStock + order.quantity}, Got: ${finalStock}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
  }
}

testStockRestoration();