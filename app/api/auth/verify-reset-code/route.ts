import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
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

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      )
    }

    // Find valid reset code
    const tokenArray = await executeQuery(
      'SELECT user_id, email, expires_at, used_at FROM password_reset_tokens WHERE email = ? AND token = ?',
      [email, code]
    ) as any[]

    if (tokenArray.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset code' },
        { status: 400 }
      )
    }

    const resetToken = tokenArray[0]

    // Check if code has expired
    if (new Date() > new Date(resetToken.expires_at)) {
      return NextResponse.json(
        { error: 'Reset code has expired' },
        { status: 400 }
      )
    }

    // Check if code has already been used
    if (resetToken.used_at) {
      return NextResponse.json(
        { error: 'Reset code has already been used' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Reset code verified successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Verify reset code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}