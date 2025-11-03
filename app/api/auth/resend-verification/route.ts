import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { sendVerificationEmailWithCode, generateVerificationToken, generateVerificationCode } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists and is not already verified
    const userResults = await executeQuery(
      'SELECT id, first_name, email_verified FROM users WHERE email = ?',
      [email]
    ) as any[]

    if (userResults.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: 'If an account with that email exists and is unverified, a new verification email has been sent.' },
        { status: 200 }
      )
    }

    const user = userResults[0]

    // If already verified, don't send email but return success message
    if (user.email_verified) {
      return NextResponse.json(
        { message: 'This email address is already verified. You can sign in to your account.' },
        { status: 200 }
      )
    }

    // Delete any existing unused tokens for this user
    await executeQuery(
      'DELETE FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    )

    // Generate new verification token and code
    const verificationToken = generateVerificationToken()
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Store new verification token and code
    await executeQuery(
      'INSERT INTO email_verification_tokens (user_id, token, verification_code, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, verificationToken, verificationCode, expiresAt]
    )

    // Send verification email with code
    const emailSent = await sendVerificationEmailWithCode(email, user.first_name, verificationCode)

    if (!emailSent) {
      console.error('Failed to send verification email to:', email)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    console.log('✅ Verification email resent successfully to:', email)

    return NextResponse.json(
      { message: 'A new verification email has been sent. Please check your inbox and spam folder.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Resend verification email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}