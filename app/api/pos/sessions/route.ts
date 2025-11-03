import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

interface CreateSessionRequest {
  terminalName?: string
  openingCash?: number
  notes?: string
}

interface CloseSessionRequest {
  sessionId: string
  closingCash: number
  notes?: string
}

// GET - Fetch POS sessions
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
    const status = searchParams.get('status')
    const adminUserId = searchParams.get('adminUserId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      whereClause += ' AND s.status = ?'
      params.push(status)
    }

    if (adminUserId) {
      whereClause += ' AND s.user_id = ?'
      params.push(adminUserId)
    }

    if (startDate && endDate) {
      whereClause += ' AND DATE(s.start_time) BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }

    const sessionsQuery = `
      SELECT 
        s.*,
        CONCAT(u.first_name, ' ', u.last_name) as cashier_name,
        u.email as cashier_email,
        COUNT(DISTINCT t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_amount ELSE 0 END), 0) as actual_sales
      FROM pos_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN pos_transactions t ON s.id = t.session_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.start_time DESC
      LIMIT ? OFFSET ?
    `

    const sessions = await executeQuery(sessionsQuery, [...params, limit, offset])

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM pos_sessions s
      ${whereClause}
    `
    const countResult = await executeQuery(countQuery, params) as any[];
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('❌ API: Error fetching POS sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST - Create new POS session or close existing session
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

    const body = await request.json()
    
    // Get admin user ID from database using email
    let adminUserId = 1 // Default fallback
    try {
      const userResult = await executeQuery(
        'SELECT id FROM admin_users WHERE email = ?',
        [userEmail]
      )
      if (Array.isArray(userResult) && userResult.length > 0) {
        adminUserId = (userResult[0] as any).id
      }
    } catch (error) {
      console.error('Error fetching user ID:', error)
    }

    // Check if this is a close session request
    if ('sessionId' in body) {
      return await closeSession(body as CloseSessionRequest)
    }

    // Create new session
    const { terminalName, openingCash, notes } = body as CreateSessionRequest

    // Check if user has an active session
    const activeSessionQuery = `
      SELECT id, session_id FROM pos_sessions 
      WHERE user_id = ? AND status = 'active'
      ORDER BY start_time DESC
      LIMIT 1
    `
    const activeSession = await executeQuery(activeSessionQuery, [adminUserId])

    if (Array.isArray(activeSession) && activeSession.length > 0) {
      return NextResponse.json(
        { 
          error: 'You already have an active session. Please close it first.',
          activeSessionId: (activeSession[0] as any).session_id
        },
        { status: 400 }
      )
    }

    // Generate session ID
    const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const insertSessionQuery = `
      INSERT INTO pos_sessions (
        session_id, user_id, terminal_name, opening_cash, notes
      ) VALUES (?, ?, ?, ?, ?)
    `

    const result = await executeQuery(insertSessionQuery, [
      sessionId,
      adminUserId,
      terminalName || 'POS Terminal',
      openingCash || 0,
      notes || null
    ])

    const dbSessionId = (result as any).insertId

    return NextResponse.json({
      success: true,
      sessionId,
      dbSessionId,
      message: 'POS session started successfully'
    })

  } catch (error) {
    console.error('❌ API: Error managing POS session:', error)
    return NextResponse.json(
      { error: 'Failed to manage session' },
      { status: 500 }
    )
  }
}

// Helper function to close session
async function closeSession(body: CloseSessionRequest) {
  const { sessionId, closingCash, notes } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  if (closingCash === undefined || closingCash < 0) {
    return NextResponse.json({ error: 'Valid closing cash amount is required' }, { status: 400 })
  }

  // Get session details
  const sessionQuery = `
    SELECT 
      s.*,
      COUNT(DISTINCT t.id) as transaction_count,
      COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_amount ELSE 0 END), 0) as total_sales
    FROM pos_sessions s
    LEFT JOIN pos_transactions t ON s.id = t.session_id
    WHERE s.session_id = ? AND s.status = 'active'
    GROUP BY s.id
  `

  const sessionData = await executeQuery(sessionQuery, [sessionId])

  if (!Array.isArray(sessionData) || sessionData.length === 0) {
    return NextResponse.json(
      { error: 'Active session not found' },
      { status: 404 }
    )
  }

  const sessionInfo = sessionData[0] as any

  // Update session
  const updateSessionQuery = `
    UPDATE pos_sessions 
    SET 
      status = 'closed',
      end_time = ?,
      closing_cash = ?,
      total_sales = ?,
      total_transactions = ?,
      notes = CASE 
        WHEN notes IS NULL THEN ?
        WHEN ? IS NULL THEN notes
        ELSE CONCAT(notes, '\n\n--- Session Close ---\n', ?)
      END
    WHERE session_id = ? AND status = 'active'
  `

  const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await executeQuery(updateSessionQuery, [
    currentTimestamp,
    closingCash,
    sessionInfo.total_sales,
    sessionInfo.transaction_count,
    notes,
    notes,
    notes,
    sessionId
  ])

  if ((result as any).affectedRows === 0) {
    return NextResponse.json(
      { error: 'Failed to close session' },
      { status: 500 }
    )
  }

  // Calculate cash variance
  const expectedCash = parseFloat(sessionInfo.opening_cash) + parseFloat(sessionInfo.total_sales)
  const cashVariance = closingCash - expectedCash

  return NextResponse.json({
    success: true,
    message: 'Session closed successfully',
    sessionSummary: {
      sessionId,
      startTime: sessionInfo.start_time,
      endTime: new Date().toISOString(),
      openingCash: parseFloat(sessionInfo.opening_cash),
      closingCash,
      totalSales: parseFloat(sessionInfo.total_sales),
      totalTransactions: sessionInfo.transaction_count,
      expectedCash,
      cashVariance,
      varianceStatus: Math.abs(cashVariance) < 0.01 ? 'balanced' : cashVariance > 0 ? 'over' : 'short'
    }
  })
}

// PUT - Update session (suspend/resume)
export async function PUT(request: NextRequest) {
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

    if (!isAuthenticated || !userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, action, notes } = await request.json()

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Session ID and action are required' },
        { status: 400 }
      )
    }

    if (!['suspend', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "suspend" or "resume"' },
        { status: 400 }
      )
    }

    const newStatus = action === 'suspend' ? 'suspended' : 'active'
    const currentStatus = action === 'suspend' ? 'active' : 'suspended'

    const updateQuery = `
      UPDATE pos_sessions 
      SET 
        status = ?,
        notes = CASE 
          WHEN notes IS NULL THEN ?
          WHEN ? IS NULL THEN notes
          ELSE CONCAT(notes, '\n\n--- ', UPPER(?), ' ---\n', ?)
        END,
        updated_at = ?
      WHERE session_id = ? AND status = ?
    `

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const result = await executeQuery(updateQuery, [
      newStatus,
      notes,
      notes,
      action,
      notes,
      currentTimestamp,
      sessionId,
      currentStatus
    ])

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: `Session not found or cannot be ${action}ed` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Session ${action}ed successfully`
    })

  } catch (error) {
    console.error('❌ API: Error updating POS session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}