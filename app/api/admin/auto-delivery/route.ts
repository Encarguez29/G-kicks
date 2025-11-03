import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'
import { 
  runAutoDeliveryProcess, 
  getEligibleOrdersCount, 
  getEligibleOrders 
} from '@/lib/schedulers/auto-delivery'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const AUTO_DELIVERY_API_KEY = process.env.AUTO_DELIVERY_API_KEY || 'auto-delivery-secret-key'

// POST method to process auto-delivery
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await checkAuthentication(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run the auto-delivery process using the scheduler
    const result = await runAutoDeliveryProcess()
    
    return NextResponse.json({
      message: 'Auto-delivery process completed',
      success: result.success,
      totalEligible: result.totalEligible,
      processed: result.processed,
      errors: result.errors,
      results: result.results
    })

  } catch (error) {
    console.error('Auto-delivery process error:', error)
    return NextResponse.json(
      { error: 'Failed to process auto-delivery' },
      { status: 500 }
    )
  }
}

// GET method to check eligible orders without processing
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await checkAuthentication(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get eligible orders count and details
    const [count, orders] = await Promise.all([
      getEligibleOrdersCount(),
      getEligibleOrders()
    ])
    
    return NextResponse.json({
      message: 'Eligible orders for auto-delivery',
      count,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        daysSinceShipped: order.days_since_shipped,
        shippedAt: order.shipped_at,
        customerEmail: order.customer_email
      }))
    })

  } catch (error) {
    console.error('Auto-delivery check error:', error)
    return NextResponse.json(
      { error: 'Failed to check eligible orders' },
      { status: 500 }
    )
  }
}

async function checkAuthentication(request: NextRequest): Promise<boolean> {
  // Check for API key in headers (for scheduled tasks)
  const apiKey = request.headers.get('x-api-key')
  if (apiKey === AUTO_DELIVERY_API_KEY) {
    return true
  }

  // Check for JWT token (for admin users)
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return false
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    // Verify user is admin/staff
    const adminCheck = await executeQuery(
      'SELECT id FROM admin_users WHERE user_id = ? AND (role = ? OR role = ?)',
      [decoded.userId, 'admin', 'staff']
    ) as any[]

    return adminCheck.length > 0
  } catch (error) {
    return false
  }
}