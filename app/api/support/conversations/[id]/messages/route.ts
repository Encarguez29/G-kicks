import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// GET - Fetch messages for a specific conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const resolvedParams = await params
    
    // Verify admin authentication
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

    const conversationId = resolvedParams.id

    // Fetch messages for the conversation
    const messages = await executeQuery(`
      SELECT 
        id,
        message_content as content,
        sender_type as sender,
        created_at as timestamp,
        is_read
      FROM support_messages 
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [conversationId]) as any[]

    return NextResponse.json({ 
      success: true,
      messages 
    })

  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Send a new message in the conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const resolvedParams = await params
    
    // Verify admin authentication
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

    const conversationId = resolvedParams.id
    const { message, sender_type } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Get admin user info
    const adminUser = await executeQuery(`
      SELECT id, username, email, first_name, last_name 
      FROM admin_users 
      WHERE email = ? AND is_active = 1
    `, [decoded.email]) as any[]

    if (adminUser.length === 0) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    const admin = adminUser[0]
    const senderName = admin.first_name && admin.last_name 
      ? `${admin.first_name} ${admin.last_name}` 
      : admin.username || 'Admin'

    // Insert the message
    const result = await executeQuery(`
      INSERT INTO support_messages (
        conversation_id, 
        sender_type, 
        sender_id, 
        sender_name, 
        sender_email, 
        message_content, 
        message_type,
        is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      conversationId,
      sender_type || 'admin',
      admin.id,
      senderName,
      admin.email,
      message.trim(),
      'text',
      1 // Admin messages are marked as read by default
    ]) as any

    // Update conversation's last_message_at
    await executeQuery(`
      UPDATE support_conversations 
      SET last_message_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [conversationId])

    return NextResponse.json({ 
      success: true, 
      messageId: result.insertId 
    })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}