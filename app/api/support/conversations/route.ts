import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// GET - Fetch all support conversations for admin
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication - check both cookies and headers
    let token = request.cookies.get('auth-token')?.value
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.role !== 'admin' && decoded.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch conversations with latest message info
    const conversations = await executeQuery(`
      SELECT 
        c.id,
        c.user_id,
        c.user_email,
        c.user_name,
        c.subject,
        c.status,
        c.priority,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_type = 'customer') as unread_count,
        (SELECT message_content FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as latest_message,
        (SELECT sender_type FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_sender_type,
        (SELECT created_at FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as latest_message_time
      FROM support_conversations c
      ORDER BY c.last_message_at DESC
    `) as any[]

    return NextResponse.json({ 
      success: true,
      conversations 
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new conversation (usually from customer support)
export async function POST(request: NextRequest) {
  try {
    const { user_email, user_name, subject, message_content, user_id } = await request.json()

    if (!user_email || !message_content) {
      return NextResponse.json(
        { error: 'User email and message content are required' },
        { status: 400 }
      )
    }

    // Create conversation
    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const conversationResult = await executeQuery(
      'INSERT INTO support_conversations (user_id, user_email, user_name, subject, status, last_message_at) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id || null, user_email, user_name || '', subject || 'Support Request', 'open', currentTimestamp]
    ) as any

    const conversationId = conversationResult.insertId

    // Add initial message
    await executeQuery(
      'INSERT INTO support_messages (conversation_id, sender_type, sender_name, sender_email, message_content, message_type) VALUES (?, ?, ?, ?, ?, ?)',
      [conversationId, 'customer', user_name || '', user_email, message_content, 'text']
    )

    return NextResponse.json({ 
      success: true, 
      conversation: {
        id: conversationId
      }
    })

  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update conversation (e.g., archive/close, change status)
export async function PUT(request: NextRequest) {
  try {
    const { conversation_id, status } = await request.json()

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Verify admin authentication - check both cookies and headers
    let token = request.cookies.get('auth-token')?.value
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.role !== 'admin' && decoded.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedStatuses = new Set(['open', 'in_progress', 'resolved', 'closed'])
    const newStatus = typeof status === 'string' && allowedStatuses.has(status) ? status : 'closed'
    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await executeQuery(
      'UPDATE support_conversations SET status = ?, updated_at = ? WHERE id = ?',
      [newStatus, currentTimestamp, conversation_id]
    )

    return NextResponse.json({ success: true, status: newStatus })

  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}