import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { executeQuery } from '@/lib/database/mysql'
import { sendPasswordResetEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists
    const userArray = await executeQuery(
      'SELECT id, email, first_name FROM users WHERE email = ?',
      [email]
    ) as any[]

    // Always return success to prevent email enumeration attacks
    if (userArray.length === 0) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a password reset link has been sent.' },
        { status: 200 }
      )
    }

    const user = userArray[0]

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Delete any existing tokens for this user
    await executeQuery(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [user.id]
    )

    // Store reset token in database
    await executeQuery(
      'INSERT INTO password_reset_tokens (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, email, resetToken, tokenExpiry]
    )

    // Send password reset email
    const resetUrl = `http://72.60.211.237/auth/reset-password?token=${resetToken}`
    
    try {
      await sendPasswordResetEmail(email, user.first_name, resetUrl)
      console.log(`Password reset email sent to: ${email}`)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Continue execution - don't fail the request if email fails
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, a password reset link has been sent.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}