import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Seeding analytics data...')
    
    // Check if analytics data already exists
    const existingOrders = await executeQuery(`
      SELECT COUNT(*) as count FROM orders WHERE status IN ('completed', 'delivered')
    `)
    
    if ((existingOrders as any[])[0]?.count > 0) {
      return NextResponse.json({
        success: true,
        message: 'Analytics data already exists',
        existingOrders: (existingOrders as any[])[0]?.count
      })
    }
    
    // Create sample completed orders for analytics
    const sampleOrders = [
      {
        user_id: 1,
        order_number: 'ORD-2025-001',
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'credit_card',
        subtotal: 299.99,
        tax_amount: 24.00,
        shipping_amount: 15.00,
        total_amount: 338.99,
        created_at: '2024-01-15 10:30:00'
      },
      {
        user_id: 2,
        order_number: 'ORD-2025-002',
        status: 'delivered',
        payment_status: 'paid',
        payment_method: 'paypal',
        subtotal: 159.99,
        tax_amount: 12.80,
        shipping_amount: 10.00,
        total_amount: 182.79,
        created_at: '2024-01-20 14:15:00'
      },
      {
        user_id: 1,
        order_number: 'ORD-2025-003',
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'credit_card',
        subtotal: 199.99,
        tax_amount: 16.00,
        shipping_amount: 12.00,
        total_amount: 227.99,
        created_at: '2024-02-05 09:45:00'
      },
      {
        user_id: 3,
        order_number: 'ORD-2025-004',
        status: 'delivered',
        payment_status: 'paid',
        payment_method: 'gcash',
        subtotal: 129.99,
        tax_amount: 10.40,
        shipping_amount: 8.00,
        total_amount: 148.39,
        created_at: '2024-02-12 16:20:00'
      },
      {
        user_id: 2,
        order_number: 'ORD-2025-005',
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'credit_card',
        subtotal: 249.99,
        tax_amount: 20.00,
        shipping_amount: 15.00,
        total_amount: 284.99,
        created_at: '2024-03-01 11:10:00'
      }
    ]
    
    // Insert sample orders
    for (const order of sampleOrders) {
      await executeQuery(`
        INSERT INTO orders (
          user_id, order_number, order_source, status, payment_status, payment_method,
          subtotal, tax_amount, shipping_amount, total_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.user_id, order.order_number, 'online', order.status, order.payment_status,
        order.payment_method, order.subtotal, order.tax_amount, order.shipping_amount,
        order.total_amount, order.created_at
      ])
    }
    
    // Create sample order items
    const orderItems = [
      { order_id: 2, product_id: 1, quantity: 1, unit_price: 299.99, total_price: 299.99, product_name: 'Air Max 97 SE', product_sku: 'NIKE-AM97-001', size: '9', color: 'White' },
      { order_id: 3, product_id: 2, quantity: 1, unit_price: 159.99, total_price: 159.99, product_name: 'UltraBoost 23', product_sku: 'ADIDAS-UB23-002', size: '8.5', color: 'Black' },
      { order_id: 4, product_id: 3, quantity: 1, unit_price: 199.99, total_price: 199.99, product_name: 'Fresh Foam X', product_sku: 'NB-FFX-003', size: '7', color: 'Pink' },
      { order_id: 5, product_id: 4, quantity: 1, unit_price: 129.99, total_price: 129.99, product_name: 'Gel-Kayano 30', product_sku: 'ASICS-GK30-004', size: '10', color: 'Navy' },
      { order_id: 6, product_id: 1, quantity: 1, unit_price: 249.99, total_price: 249.99, product_name: 'Air Max 97 SE', product_sku: 'NIKE-AM97-001', size: '8', color: 'Black' }
    ]
    
    for (const item of orderItems) {
      await executeQuery(`
        INSERT INTO order_items (
          order_id, product_id, quantity, unit_price, total_price, product_name, product_sku, size, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.order_id, item.product_id, item.quantity, item.unit_price, item.total_price,
        item.product_name, item.product_sku, item.size, item.color
      ])
    }
    
    console.log('✅ Analytics data seeded successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Analytics data seeded successfully',
      ordersCreated: sampleOrders.length,
      orderItemsCreated: orderItems.length
    })
  } catch (error) {
    console.error('❌ Error seeding analytics data:', error)
    return NextResponse.json(
      { error: 'Failed to seed analytics data', details: (error as Error).message },
      { status: 500 }
    )
  }
}