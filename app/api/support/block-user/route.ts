import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { conversation_id } = await request.json()

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'admin' && decoded.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find user associated with this conversation
    const convRows = await executeQuery(
      'SELECT user_id, user_email FROM support_conversations WHERE id = ? LIMIT 1',
      [conversation_id]
    ) as any[]

    if (!convRows || convRows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { user_id, user_email } = convRows[0]

    let affected = 0
    if (user_id) {
      const res = await executeQuery(
        'UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [user_id]
      ) as any
      affected += res.affectedRows || 0
    }

    if (!user_id && user_email) {
      const res = await executeQuery(
        'UPDATE users SET is_active = 0, updated_at = NOW() WHERE email = ?',
        [user_email]
      ) as any
      affected += res.affectedRows || 0
    }

    // Optionally also close the conversation
    await executeQuery(
      'UPDATE support_conversations SET status = "closed", updated_at = NOW() WHERE id = ?',
      [conversation_id]
    )

    // Add a system message for audit trail
    await executeQuery(
      'INSERT INTO support_messages (conversation_id, sender_type, sender_name, sender_email, message_content, message_type) VALUES (?, "system", "System", NULL, "User has been blocked by admin.", "system_notification")',
      [conversation_id]
    )

    return NextResponse.json({ success: true, affected })

  } catch (error) {
    console.error('Error blocking user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}