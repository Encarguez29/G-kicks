import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// GET - Fetch messages for a specific conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Verify authentication - check both cookies and headers
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

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Fetch messages for the conversation
    const messages = await executeQuery(`
      SELECT 
        id,
        sender_type,
        sender_name,
        sender_email,
        message_content,
        message_type,
        order_id,
        is_read,
        created_at
      FROM support_messages 
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [conversationId]) as any[]

    // Mark messages as read if admin is viewing
    if (decoded.role === 'admin' || decoded.role === 'staff') {
      await executeQuery(
        'UPDATE support_messages SET is_read = TRUE WHERE conversation_id = ? AND sender_type = "customer"',
        [conversationId]
      )
    }

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Send a new message (admin reply or customer message)
export async function POST(request: NextRequest) {
  try {
    const { conversation_id, message_content, sender_type, order_id } = await request.json()

    if (!conversation_id || !message_content || !sender_type) {
      return NextResponse.json(
        { error: 'Conversation ID, message content, and sender type are required' },
        { status: 400 }
      )
    }

    // Verify authentication - check both cookies and headers
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

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }
    
    let senderName = ''
    let senderEmail = ''
    let senderId = null

    if (sender_type === 'admin') {
      // Verify admin permissions
      if (decoded.role !== 'admin' && decoded.role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      senderName = decoded.name || 'Admin'
      senderEmail = decoded.email || 'admin@gkicks.com'
      senderId = decoded.userId
    } else if (sender_type === 'customer') {
      senderName = decoded.name || ''
      senderEmail = decoded.email || ''
      senderId = decoded.userId
    }

    // Insert the message
    await executeQuery(
      'INSERT INTO support_messages (conversation_id, sender_type, sender_id, sender_name, sender_email, message_content, message_type, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [conversation_id, sender_type, senderId, senderName, senderEmail, message_content, 'text', order_id || null]
    )

    // Update conversation's last_message_at
    await executeQuery(
      'UPDATE support_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
      [conversation_id]
    )

    // If admin replied, update status to in_progress
    if (sender_type === 'admin') {
      await executeQuery(
        'UPDATE support_conversations SET status = "in_progress" WHERE id = ? AND status = "open"',
        [conversation_id]
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}