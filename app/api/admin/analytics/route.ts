import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching analytics data from MySQL database... (recompiled)')
    
    // Check authentication using JWT token
    let token = request.cookies.get('auth-token')?.value
    
    // If no cookie token, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      console.log('❌ Analytics API: No token provided')
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    // Verify token
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    } catch (error) {
      console.log('❌ Analytics API: Invalid token')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    // Check if user has admin/staff role
    const userEmail = decoded.email
    console.log('🔍 Analytics API: Checking admin status for:', userEmail)
    
    try {
      const adminCheck = await executeQuery(
        'SELECT role FROM admin_users WHERE email = ? AND is_active = 1',
        [userEmail]
      )
      
      const isLegacyAdmin = userEmail === 'gkcksdmn@gmail.com'
      const hasAdminAccess = (adminCheck && Array.isArray(adminCheck) && adminCheck.length > 0) || isLegacyAdmin
      
      if (!hasAdminAccess) {
        console.log('❌ Analytics API: User does not have admin access:', userEmail)
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        )
      }
      
      console.log('✅ Analytics API: Admin access granted for:', userEmail)
    } catch (error) {
      console.error('❌ Analytics API: Error checking admin status:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    
    // Get current date and calculate date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    // Monthly revenue data for the last 6 months (combining orders and POS transactions)
    const monthlyRevenue = await executeQuery(`
      SELECT 
        DATE_FORMAT(date_col, '%Y-%m') as month,
        MONTHNAME(date_col) as month_name,
        SUM(revenue) as revenue,
        SUM(order_count) as order_count
      FROM (
        SELECT 
          created_at as date_col,
          total_amount as revenue,
          1 as order_count
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND status NOT IN ('cancelled', 'refunded', 'pending')
        UNION ALL
        SELECT 
          created_at as date_col,
          total_amount as revenue,
          1 as order_count
        FROM pos_transactions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND status = 'completed'
      ) combined_data
      GROUP BY DATE_FORMAT(date_col, '%Y-%m'), MONTHNAME(date_col)
      ORDER BY month ASC
    `)
    
    // Daily sales for the last 30 days (combining orders and POS transactions)
    const dailySales = await executeQuery(`
      SELECT 
        DATE(date_col) as date,
        SUM(revenue) as revenue,
        SUM(order_count) as orders
      FROM (
        SELECT 
          created_at as date_col,
          total_amount as revenue,
          1 as order_count
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND status NOT IN ('cancelled', 'refunded', 'pending')
        UNION ALL
        SELECT 
          created_at as date_col,
          total_amount as revenue,
          1 as order_count
        FROM pos_transactions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND status = 'completed'
      ) combined_data
      GROUP BY DATE(date_col)
      ORDER BY date ASC
    `)
    
    // Category performance (combining orders and POS transactions)
    const categoryStats = await executeQuery(`
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
        WHERE o.status NOT IN ('cancelled', 'refunded', 'pending')
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
    `)
    
    // Top selling products (combining orders and POS transactions)
    const topProducts = await executeQuery(`
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
        WHERE o.status NOT IN ('cancelled', 'refunded', 'pending')
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
    `)
    
    // Customer analytics (combining orders and POS transactions)
    const customerStats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT COALESCE(user_id, customer_email)) as total_customers,
        AVG(total_amount) as avg_order_value,
        COUNT(*) as total_orders
      FROM (
        SELECT user_id, NULL as customer_email, total_amount
        FROM orders 
        WHERE status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'returned')
          AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        UNION ALL
        SELECT NULL as user_id, customer_email, total_amount
        FROM pos_transactions 
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      ) combined_data
    `)

    // Lifetime totals (all-time across orders and POS)
    const lifetimeTotalsResult = await executeQuery(`
      SELECT 
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM (
        SELECT total_amount
        FROM orders 
        WHERE status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'returned')
        UNION ALL
        SELECT total_amount
        FROM pos_transactions 
        WHERE status = 'completed'
      ) combined_all
    `)

    // Revenue totals (only delivered orders)
    const revenueTotalsResult = await executeQuery(`
      SELECT 
        SUM(total_amount) as revenue
      FROM (
        SELECT total_amount
        FROM orders 
        WHERE status IN ('delivered', 'completed')
        UNION ALL
        SELECT total_amount
        FROM pos_transactions 
        WHERE status = 'completed'
      ) delivered_orders
    `)

    // Order status breakdown
    const orderStatusResult = await executeQuery(`
      SELECT 
        SUM(CASE WHEN status IN ('pending', 'processing', 'shipped') THEN 1 ELSE 0 END) as ongoing_orders,
        SUM(CASE WHEN status IN ('completed', 'delivered') THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_orders,
        SUM(CASE WHEN status IN ('cancelled', 'refunded') THEN 1 ELSE 0 END) as cancelled_orders
      FROM orders
    `)

    const posStatusResult = await executeQuery(`
      SELECT 
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_pos
      FROM pos_transactions
    `)
    
    // Growth metrics - Current month (combining orders and POS transactions)
    const currentMonthStatsResult = await executeQuery(`
      SELECT 
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        COUNT(DISTINCT COALESCE(user_id, customer_email)) as customers
      FROM (
        SELECT user_id, NULL as customer_email, total_amount
        FROM orders 
        WHERE created_at >= ? 
          AND status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'returned')
        UNION ALL
        SELECT NULL as user_id, customer_email, total_amount
        FROM pos_transactions 
        WHERE created_at >= ?
          AND status = 'completed'
      ) combined_data
    `, [startOfMonth.toISOString().split('T')[0], startOfMonth.toISOString().split('T')[0]])
    
    const lastMonthStatsResult = await executeQuery(`
      SELECT 
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        COUNT(DISTINCT COALESCE(user_id, customer_email)) as customers
      FROM (
        SELECT user_id, NULL as customer_email, total_amount
        FROM orders 
        WHERE created_at >= ? AND created_at <= ?
          AND status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'returned')
        UNION ALL
        SELECT NULL as user_id, customer_email, total_amount
        FROM pos_transactions 
        WHERE created_at >= ? AND created_at <= ?
          AND status = 'completed'
      ) combined_data
    `, [startOfLastMonth.toISOString().split('T')[0], endOfLastMonth.toISOString().split('T')[0], startOfLastMonth.toISOString().split('T')[0], endOfLastMonth.toISOString().split('T')[0]])
    
    // Calculate growth percentages
    const currentMonthStats = Array.isArray(currentMonthStatsResult) ? currentMonthStatsResult : []
    const lastMonthStats = Array.isArray(lastMonthStatsResult) ? lastMonthStatsResult : []
    const currentMonth = currentMonthStats[0] || { orders: 0, revenue: 0, customers: 0 }
    const lastMonth = lastMonthStats[0] || { orders: 0, revenue: 0, customers: 0 }
    
    const orderGrowth = lastMonth.orders > 0 
      ? ((currentMonth.orders - lastMonth.orders) / lastMonth.orders * 100).toFixed(1)
      : '0'
    
    const revenueGrowth = lastMonth.revenue > 0 
      ? ((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue * 100).toFixed(1)
      : '0'
    
    const customerGrowth = lastMonth.customers > 0 
      ? ((currentMonth.customers - lastMonth.customers) / lastMonth.customers * 100).toFixed(1)
      : '0'
    
    // Recent Activity - Get recent orders and transactions
    const recentActivity = await executeQuery(`
      SELECT 
        'order' as type,
        id,
        total_amount,
        status,
        created_at,
        user_id as customer_info
      FROM orders 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT 
        'pos_transaction' as type,
        id,
        total_amount,
        status,
        created_at,
        customer_email as customer_info
      FROM pos_transactions 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 10
    `)
    
    const analyticsData = {
      monthlyRevenue: monthlyRevenue.map((row: { month_name: string | null; revenue: string | number; order_count: string | number }) => ({
        month: row.month_name?.substring(0, 3) || 'N/A',
        revenue: parseFloat(String(row.revenue)) || 0,
        orders: parseInt(String(row.order_count)) || 0
      })),
      dailySales: dailySales.map((row: { date: string; revenue: string | number; orders: string | number }) => ({
        date: row.date,
        revenue: parseFloat(String(row.revenue)) || 0,
        orders: parseInt(String(row.orders)) || 0
      })),
      categoryStats: categoryStats.map((row: { category: string; items_sold: string; revenue: string; orders: string }) => ({
        name: row.category || 'Other',
        value: parseInt(row.items_sold) || 0,
        revenue: parseFloat(row.revenue) || 0,
        orders: parseInt(row.orders) || 0
      })),
      topProducts,
      customerStats: customerStats[0] || { total_customers: 0, avg_order_value: 0, total_orders: 0 },
      growth: {
        orders: parseFloat(orderGrowth),
        revenue: parseFloat(revenueGrowth),
        customers: parseFloat(customerGrowth)
      },
      currentMonth,
      lastMonth,
      lifetimeTotals: {
        orders: parseInt(String(lifetimeTotalsResult?.[0]?.orders ?? 0)) || 0,
        revenue: parseFloat(String(revenueTotalsResult?.[0]?.revenue ?? 0)) || 0,
        ongoingOrders: parseInt(String(orderStatusResult?.[0]?.ongoing_orders ?? 0)) || 0,
        deliveredOrders: (parseInt(String(orderStatusResult?.[0]?.delivered_orders ?? 0)) || 0) + (parseInt(String(posStatusResult?.[0]?.completed_pos ?? 0)) || 0),
        returnedOrders: parseInt(String(orderStatusResult?.[0]?.returned_orders ?? 0)) || 0,
        cancelledOrders: parseInt(String(orderStatusResult?.[0]?.cancelled_orders ?? 0)) || 0,
      },
      recentActivity: recentActivity.map((activity: any) => ({
        type: activity.type,
        id: activity.id,
        amount: parseFloat(activity.total_amount) || 0,
        status: activity.status,
        date: activity.created_at,
        customer: activity.customer_info || 'Guest'
      }))
    }
    
    console.log(`✅ API: Successfully returned analytics data`)
    
    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('❌ API: Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}