import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// GET - Fetch daily sales data
export async function GET(request: NextRequest) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let userRole = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        userRole = decoded.role
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const adminUserId = searchParams.get('adminUserId')

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (date) {
      whereClause += ' AND ds.sale_date = ?'
      params.push(date)
    } else if (startDate && endDate) {
      whereClause += ' AND ds.sale_date BETWEEN ? AND ?'
      params.push(startDate, endDate)
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)
      whereClause += ' AND ds.sale_date >= ?'
      params.push(thirtyDaysAgoStr)
    }

    const salesQuery = `
      SELECT ds.*
      FROM pos_daily_sales ds
      ${whereClause}
      ORDER BY ds.sale_date DESC
    `

    const salesData = await executeQuery(salesQuery, params)

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT ds.sale_date) as total_days,
        SUM(ds.total_transactions) as total_transactions,
        SUM(ds.gross_sales) as total_gross_sales,
        SUM(ds.cash_sales) as total_cash_sales,
        SUM(ds.card_sales) as total_card_sales,
        SUM(ds.digital_wallet_sales) as total_digital_wallet_sales,
        AVG(ds.gross_sales) as avg_daily_sales,
        MAX(ds.gross_sales) as best_day_sales,
        MIN(ds.gross_sales) as worst_day_sales
      FROM pos_daily_sales ds
      ${whereClause}
    `

    const summaryResults = await executeQuery(summaryQuery, params) as any[]
    const summary = summaryResults[0]

    // Compute total tax over the same date range directly from transactions
    let taxWhereClause = "WHERE t.status = 'completed'"
    const taxParams: any[] = []
    if (date) {
      taxWhereClause += ' AND t.transaction_date = ?'
      taxParams.push(date)
    } else if (startDate && endDate) {
      taxWhereClause += ' AND t.transaction_date BETWEEN ? AND ?'
      taxParams.push(startDate, endDate)
    } else {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)
      taxWhereClause += ' AND t.transaction_date >= ?'
      taxParams.push(thirtyDaysAgoStr)
    }

    const taxSummaryQuery = `
      SELECT COALESCE(SUM(GREATEST(t.total_amount - t.subtotal, 0)), 0.00) AS total_tax
      FROM pos_transactions t
      ${taxWhereClause}
    `

    const taxSummaryResults = await executeQuery(taxSummaryQuery, taxParams) as any[]
    const totalTax = parseFloat(taxSummaryResults?.[0]?.total_tax || '0')

    return NextResponse.json({
      dailySales: salesData,
      summary: {
        totalDays: summary.total_days || 0,
        totalTransactions: summary.total_transactions || 0,
        totalGrossSales: parseFloat(summary.total_gross_sales || '0'),
        totalCashSales: parseFloat(summary.total_cash_sales || '0'),
        totalCardSales: parseFloat(summary.total_card_sales || '0'),
        totalDigitalWalletSales: parseFloat(summary.total_digital_wallet_sales || '0'),
        avgDailySales: parseFloat(summary.avg_daily_sales || '0'),
        bestDaySales: parseFloat(summary.best_day_sales || '0'),
        worstDaySales: parseFloat(summary.worst_day_sales || '0'),
        totalTax
      }
    })
  } catch (error) {
    console.error('❌ API: Error fetching daily sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily sales data' },
      { status: 500 }
    )
  }
}

// POST - Update daily sales (manual recalculation)
export async function POST(request: NextRequest) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let userRole = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        userRole = decoded.role
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date, adminUserId } = await request.json()

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Recalculate daily sales for the specified date
    const recalculateQuery = `
      INSERT INTO pos_daily_sales (
        sale_date, gross_sales, net_sales, total_transactions, cash_sales, card_sales, digital_wallet_sales
      )
      SELECT 
        ? as sale_date,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_amount ELSE 0 END), 0.00) as gross_sales,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_amount ELSE 0 END), 0.00) as net_sales,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as total_transactions,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.payment_method = 'CASH' THEN t.total_amount ELSE 0 END), 0.00) as cash_sales,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.payment_method = 'CARD' THEN t.total_amount ELSE 0 END), 0.00) as card_sales,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.payment_method IN ('GCASH', 'MAYA') THEN t.total_amount ELSE 0 END), 0.00) as digital_wallet_sales
      FROM pos_transactions t
      WHERE t.transaction_date = ?
      ON DUPLICATE KEY UPDATE
        gross_sales = VALUES(gross_sales),
        net_sales = VALUES(net_sales),
        total_transactions = VALUES(total_transactions),
        cash_sales = VALUES(cash_sales),
        card_sales = VALUES(card_sales),
        digital_wallet_sales = VALUES(digital_wallet_sales),
        updated_at = ?
    `

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const params = [date, date, currentTimestamp]

    await executeQuery(recalculateQuery, params)

    return NextResponse.json({
      success: true,
      message: 'Daily sales recalculated successfully'
    })

  } catch (error) {
    console.error('❌ API: Error updating daily sales:', error)
    return NextResponse.json(
      { error: 'Failed to update daily sales' },
      { status: 500 }
    )
  }
}

// DELETE - Clear daily sales data
export async function DELETE(request: NextRequest) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let userRole = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        userRole = decoded.role
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const adminUserId = searchParams.get('adminUserId')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const deleteQuery = 'DELETE FROM pos_daily_sales WHERE sale_date = ?'
    const params = [date]

    const result = await executeQuery(deleteQuery, params)

    return NextResponse.json({
      success: true,
      deletedRecords: (result as any).affectedRows,
      message: 'Daily sales data deleted successfully'
    })

  } catch (error) {
    console.error('❌ API: Error deleting daily sales:', error)
    return NextResponse.json(
      { error: 'Failed to delete daily sales data' },
      { status: 500 }
    )
  }
}