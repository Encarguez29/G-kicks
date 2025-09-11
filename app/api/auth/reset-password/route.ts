import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { executeQuery } from '@/lib/database/mysql'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Find valid reset token
    const tokenArray = await executeQuery(
      'SELECT user_id, email, expires_at, used_at FROM password_reset_tokens WHERE token = ?',
      [token]
    ) as any[]

    if (tokenArray.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    const resetToken = tokenArray[0]

    // Check if token has expired
    if (new Date() > new Date(resetToken.expires_at)) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    // Check if token has already been used
    if (resetToken.used_at) {
      return NextResponse.json(
        { error: 'Reset token has already been used' },
        { status: 400 }
      )
    }

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update user password
    await executeQuery(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, resetToken.user_id]
    )

    // Mark token as used
    await executeQuery(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ?',
      [token]
    )

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to validate reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find valid reset token
    const tokenArray = await executeQuery(
      'SELECT expires_at, used_at FROM password_reset_tokens WHERE token = ?',
      [token]
    ) as any[]

    if (tokenArray.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    const resetToken = tokenArray[0]

    // Check if token has expired
    if (new Date() > new Date(resetToken.expires_at)) {
      return NextResponse.json(
        { valid: false, error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    // Check if token has already been used
    if (resetToken.used_at) {
      return NextResponse.json(
        { valid: false, error: 'Reset token has already been used' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    )

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}