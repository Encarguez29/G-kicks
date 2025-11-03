import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'
import { sendWelcomeEmail } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email, verificationCode } = await request.json()

    if (!email || !verificationCode) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    // Validate verification code format (6 digits)
    if (!/^\d{6}$/.test(verificationCode)) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      )
    }

    // Find user by email
    const userArray = await executeQuery(
      'SELECT id, first_name, last_name, email, email_verified FROM users WHERE email = ?',
      [email]
    ) as any[]

    if (userArray.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userArray[0]

    // Check if user is already verified
    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Find valid verification code
    const tokenArray = await executeQuery(
      `SELECT id, user_id, token, expires_at 
       FROM email_verification_tokens 
       WHERE user_id = ? AND verification_code = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC 
       LIMIT 1`,
      [user.id, verificationCode]
    ) as any[]

    if (tokenArray.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    const verificationToken = tokenArray[0]

    // Update user as verified
    await executeQuery(
      'UPDATE users SET email_verified = true WHERE id = ?',
      [user.id]
    )

    // Mark verification token as used
    await executeQuery(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?',
      [verificationToken.id]
    )

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.first_name)
    } catch (emailError) {
      console.warn('⚠️ Failed to send welcome email:', emailError)
    }

    // Generate JWT token for authenticated session
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'user'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Create response with success message
    const response = NextResponse.json({
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: true,
        role: 'user'
      },
      verified: true
    })

    // Set HTTP-only cookie with JWT token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Verification code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}