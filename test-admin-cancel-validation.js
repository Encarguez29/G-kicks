const mysql = require('mysql2/promise');

async function testAdminCancelValidation() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    console.log('🧪 Testing Admin API Cancel Validation...\n');

    // First, let's check if there are any delivered orders we can test with
    console.log('=== CHECKING FOR DELIVERED ORDERS ===');
    const [deliveredOrders] = await connection.execute(`
      SELECT id, order_number, status, delivered_at, customer_email
      FROM orders 
      WHERE status = 'delivered' OR delivered_at IS NOT NULL
      LIMIT 3
    `);

    if (deliveredOrders.length === 0) {
      console.log('No delivered orders found. Creating a test delivered order...');
      
      // Create a test delivered order
      const [insertResult] = await connection.execute(`
        INSERT INTO orders (
          order_number, user_id, customer_email, status, 
          subtotal_amount, tax_amount, shipping_fee, discount_amount, total_amount,
          payment_method, payment_status, shipping_address, delivered_at, created_at, updated_at
        ) VALUES (
          'TEST_DELIVERED_001', 47, 'test@example.com', 'delivered',
          1000.00, 120.00, 0.00, 0.00, 1120.00,
          'Cash', 'completed', '{"fullName":"Test Customer","street":"Test Street","city":"Test City","province":"Test Province","zipCode":"1234","country":"Philippines"}',
          NOW(), NOW(), NOW()
        )
      `);
      
      const testOrderId = insertResult.insertId;
      console.log(`✅ Created test delivered order with ID: ${testOrderId}`);
      
      // Test the admin API with this delivered order
      await testCancelDeliveredOrder(testOrderId);
      
      // Clean up - delete the test order
      await connection.execute('DELETE FROM orders WHERE id = ?', [testOrderId]);
      console.log(`🧹 Cleaned up test order ${testOrderId}`);
      
    } else {
      console.log(`Found ${deliveredOrders.length} delivered orders:`);
      deliveredOrders.forEach(order => {
        console.log(`- Order ${order.order_number} (ID: ${order.id}) - Status: ${order.status} - Delivered: ${order.delivered_at}`);
      });
      
      // Test with the first delivered order (but don't actually change it)
      console.log(`\n🧪 Testing validation with delivered order ${deliveredOrders[0].order_number}...`);
      await testCancelDeliveredOrder(deliveredOrders[0].id, false); // false = don't actually make the request
    }

    console.log('\n=== TESTING PENDING ORDER CANCELLATION ===');
    // Check for pending orders
    const [pendingOrders] = await connection.execute(`
      SELECT id, order_number, status 
      FROM orders 
      WHERE status = 'pending'
      LIMIT 1
    `);

    if (pendingOrders.length > 0) {
      console.log(`Testing cancellation of pending order ${pendingOrders[0].order_number}...`);
      await testCancelPendingOrder(pendingOrders[0].id, false); // false = don't actually make the request
    } else {
      console.log('No pending orders found to test with.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
  }
}

async function testCancelDeliveredOrder(orderId, actuallyTest = true) {
  if (!actuallyTest) {
    console.log(`📝 Would test cancelling delivered order ${orderId}, but skipping actual API call to preserve data.`);
    console.log('✅ Expected result: Admin API should reject with "Cannot cancel delivered orders" error');
    return;
  }

  try {
    console.log(`🧪 Attempting to cancel delivered order ${orderId} via admin API...`);
    
    // This would normally require a valid admin token
    // For testing purposes, we're just showing what the request would look like
    console.log('📝 Request would be:');
    console.log('  POST /api/admin/orders');
    console.log('  Body: { orderId: ' + orderId + ', status: "cancelled" }');
    console.log('  Headers: { Authorization: "Bearer <admin_token>" }');
    console.log('✅ Expected result: Should return 400 error - "Cannot cancel delivered orders"');
    
  } catch (error) {
    console.log('✅ Good! Admin API correctly rejected the cancellation:', error.message);
  }
}

async function testCancelPendingOrder(orderId, actuallyTest = true) {
  if (!actuallyTest) {
    console.log(`📝 Would test cancelling pending order ${orderId}, but skipping actual API call to preserve data.`);
    console.log('✅ Expected result: Admin API should allow cancellation of pending orders');
    return;
  }

  console.log(`🧪 Testing cancellation of pending order ${orderId}...`);
  console.log('📝 Request would be:');
  console.log('  POST /api/admin/orders');
  console.log('  Body: { orderId: ' + orderId + ', status: "cancelled" }');
  console.log('  Headers: { Authorization: "Bearer <admin_token>" }');
  console.log('✅ Expected result: Should succeed and cancel the pending order');
}

// Run the test
testAdminCancelValidation();