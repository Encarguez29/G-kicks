import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching admin dashboard data from MySQL database...')
    
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
      console.log('❌ Dashboard API: No token provided')
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
      console.log('❌ Dashboard API: Invalid token')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Check if user is admin or staff with dashboard permissions
    const adminUsers = await executeQuery(
      'SELECT id, email, is_admin FROM users WHERE id = ? AND is_admin = 1',
      [decoded.userId]
    ) as any[]

    // Check if user is staff in admin_users table
    const staffUsers = await executeQuery(
      'SELECT id, email, role, permissions FROM admin_users WHERE email = ? AND role = "staff" AND is_active = 1',
      [decoded.email]
    ) as any[]

    // Deny access for staff users (dashboard access removed)
    if (adminUsers.length === 0 && staffUsers.length > 0) {
      console.log('❌ Dashboard API: Staff user access denied (dashboard removed):', decoded.email)
      return NextResponse.json(
        { error: 'Access denied. Dashboard access has been removed for staff users.' },
        { status: 403 }
      )
    }

    if (adminUsers.length === 0) {
      console.log('❌ Dashboard API: User is not admin:', decoded.email)
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    console.log('✅ Dashboard API: Admin access granted for:', decoded.email)
    
    // Initialize dashboard stats
    const dashboardStats = {
      totalProducts: 0,
      activeProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      inStockProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      totalUsers: 0,
      recentOrders: [],
      topProducts: [],
      salesData: [],
      categoryData: []
    }
    
    // Fetch products statistics
    try {
      const productStats = await executeQuery(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
          SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= 5 THEN 1 ELSE 0 END) as low_stock_products,
          SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_products,
          SUM(CASE WHEN stock_quantity > 5 THEN 1 ELSE 0 END) as in_stock_products
        FROM products
      `)
      
      if (Array.isArray(productStats) && productStats.length > 0) {
        const stats = productStats[0] as any
        dashboardStats.totalProducts = parseInt(stats.total_products) || 0
        dashboardStats.activeProducts = parseInt(stats.active_products) || 0
        dashboardStats.lowStockProducts = parseInt(stats.low_stock_products) || 0
        dashboardStats.outOfStockProducts = parseInt(stats.out_of_stock_products) || 0
        dashboardStats.inStockProducts = parseInt(stats.in_stock_products) || 0
      }
    } catch (error) {
      console.warn('Warning: Error fetching product stats:', error)
    }
    
    // Fetch orders statistics (including POS transactions)
    try {
      const orderStats = await executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM orders) + (SELECT COUNT(*) FROM pos_transactions WHERE status = 'completed') as total_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
          (SELECT COUNT(*) FROM orders WHERE status IN ('completed', 'delivered')) + (SELECT COUNT(*) FROM pos_transactions WHERE status = 'completed') as completed_orders,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status NOT IN ('cancelled', 'refunded')) + (SELECT COALESCE(SUM(total_amount), 0) FROM pos_transactions WHERE status = 'completed') as total_revenue
      `)
      
      if (Array.isArray(orderStats) && orderStats.length > 0) {
        const stats = orderStats[0] as any
        dashboardStats.totalOrders = parseInt(stats.total_orders) || 0
        dashboardStats.pendingOrders = parseInt(stats.pending_orders) || 0
        dashboardStats.completedOrders = parseInt(stats.completed_orders) || 0
        dashboardStats.totalRevenue = parseFloat(stats.total_revenue) || 0
      }
    } catch (error) {
      console.warn('Warning: Error fetching order stats:', error)
    }
    
    // Fetch users count
    try {
      const userStats = await executeQuery(`
        SELECT COUNT(*) as total_users
        FROM users
      `)
      
      if (Array.isArray(userStats) && userStats.length > 0) {
        dashboardStats.totalUsers = parseInt((userStats[0] as any).total_users) || 0
      }
    } catch (error) {
      console.warn('Warning: Error fetching user stats:', error)
    }
    
    // Fetch recent orders
    try {
      const recentOrders = await executeQuery(`
        SELECT 
          o.id,
          o.total_amount,
          o.status,
          o.created_at,
          CONCAT(u.first_name, ' ', u.last_name) as customer_name,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `)
      
      dashboardStats.recentOrders = recentOrders || []
    } catch (error) {
      console.warn('Warning: Error fetching recent orders:', error)
    }
    
    // Fetch top products by stock quantity
    try {
      const topProducts = await executeQuery(`
        SELECT 
          id,
          name,
          price,
          stock_quantity,
          category
        FROM products
        WHERE is_active = 1
        ORDER BY stock_quantity DESC
        LIMIT 5
      `)
      
      dashboardStats.topProducts = topProducts || []
    } catch (error) {
      console.warn('Warning: Error fetching top products:', error)
    }
    
    // Fetch sales data for the last 7 days (including POS transactions)
    try {
      const salesData = await executeQuery(`
        SELECT 
          date,
          SUM(revenue) as revenue,
          SUM(orders) as orders
        FROM (
          SELECT 
            DATE(created_at) as date,
            SUM(total_amount) as revenue,
            COUNT(*) as orders
          FROM orders
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND status NOT IN ('cancelled', 'refunded')
          GROUP BY DATE(created_at)
          
          UNION ALL
          
          SELECT 
            DATE(created_at) as date,
            SUM(total_amount) as revenue,
            COUNT(*) as orders
          FROM pos_transactions
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND status = 'completed'
          GROUP BY DATE(created_at)
        ) combined_sales
        GROUP BY date
        ORDER BY date ASC
      `)
      
      dashboardStats.salesData = salesData || []
    } catch (error) {
      console.warn('Warning: Error fetching sales data:', error)
    }
    
    // Fetch category data
    try {
      const categoryData = await executeQuery(`
        SELECT 
          category,
          COUNT(*) as count
        FROM products
        WHERE is_active = 1
        GROUP BY category
        ORDER BY count DESC
      `)
      
      dashboardStats.categoryData = categoryData?.map((row: { category: string; count: number }) => ({
        name: row.category || 'Other',
        value: String(row.count || 0)
      })) || []
    } catch (error) {
      console.warn('Warning: Error fetching category data:', error)
    }
    
    console.log(`✅ API: Successfully returned dashboard data`)
    
    return NextResponse.json(dashboardStats)
  } catch (error) {
    console.error('❌ API: Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}