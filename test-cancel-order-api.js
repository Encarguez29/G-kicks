require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

async function testOrderCancellationAPI() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🧪 Testing Order Cancellation API with Stock Restoration\n');

    // Step 1: Check current stock before cancellation
    const productId = 19;
    const color = 'Pine Green';
    const size = '7';

    console.log('📊 Step 1: Checking stock before cancellation...');
    const [initialProduct] = await connection.execute(
      'SELECT variants, stock_quantity FROM products WHERE id = ?',
      [productId]
    );

    const initialVariants = JSON.parse(initialProduct[0].variants || '{}');
    const initialStock = initialVariants[color]?.[size] || 0;
    const initialTotalStock = initialProduct[0].stock_quantity;

    console.log(`📦 Initial stock for ${color} ${size}: ${initialStock}`);
    console.log(`📦 Initial total stock: ${initialTotalStock}\n`);

    // Step 2: Find the most recent order to cancel
    console.log('📋 Step 2: Finding order to cancel...');
    const [orders] = await connection.execute(
      `SELECT o.id, o.order_number, o.status, o.user_id, oi.quantity
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       WHERE oi.product_id = ? AND oi.color = ? AND oi.size = ? 
       AND o.status IN ('pending', 'processing')
       ORDER BY o.created_at DESC 
       LIMIT 1`,
      [productId, color, size]
    );

    if (orders.length === 0) {
      console.log('❌ No orders found to cancel');
      return;
    }

    const order = orders[0];
    console.log(`📋 Found order: ${order.order_number} (ID: ${order.id})`);
    console.log(`📋 Order status: ${order.status}`);
    console.log(`📋 Order quantity: ${order.quantity}\n`);

    // Step 3: Generate JWT token for the user
    console.log('🔐 Step 3: Generating JWT token...');
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { 
        userId: order.user_id,
        email: 'test@example.com',
        role: 'user'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('✅ JWT token generated\n');

    // Step 4: Cancel the order via API
    console.log('🔄 Step 4: Cancelling order via API...');
    const response = await fetch(`http://localhost:3001/api/orders/${order.id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ API request failed:', response.status, errorData);
      return;
    }

    const result = await response.json();
    console.log('✅ Order cancelled successfully via API');
    console.log('📋 API Response:', result);
    console.log(`📦 Stock restored for ${result.stockRestored} items\n`);

    // Step 5: Verify stock restoration
    console.log('🔍 Step 5: Verifying stock restoration...');
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

    // Step 6: Verify order status
    console.log('🔍 Step 6: Verifying order status...');
    const [updatedOrder] = await connection.execute(
      'SELECT status FROM orders WHERE id = ?',
      [order.id]
    );

    const newStatus = updatedOrder[0].status;
    console.log(`📋 Order status: ${newStatus}\n`);

    // Final verification
    const stockRestored = finalStock === initialStock + order.quantity;
    const orderCancelled = newStatus === 'cancelled';

    if (stockRestored && orderCancelled) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Order was successfully cancelled');
      console.log('✅ Stock was correctly restored');
    } else {
      console.log('❌ SOME TESTS FAILED:');
      if (!orderCancelled) console.log('❌ Order status was not updated to cancelled');
      if (!stockRestored) console.log('❌ Stock was not correctly restored');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
  }
}

testOrderCancellationAPI();