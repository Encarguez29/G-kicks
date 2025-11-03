import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { sendEmailRecoveryNotification, sendEmailNotFoundNotification } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
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

    // Check if user exists with this email
    const userArray = await executeQuery(
      'SELECT id, email, first_name FROM users WHERE email = ?',
      [email]
    ) as any[]

    let emailSent = false

    if (userArray.length > 0) {
      // User exists - send recovery email with their email address
      const user = userArray[0]
      try {
        emailSent = await sendEmailRecoveryNotification(user.email, user.first_name || 'User', user.email)
        
        if (emailSent) {
          console.log(`Email recovery notification sent to: ${user.email}`)
        } else {
          console.error('Failed to send email recovery notification')
        }
      } catch (emailError) {
        console.error('Failed to send email recovery notification:', emailError)
      }
    } else {
      // User doesn't exist - send "not found" email
      try {
        emailSent = await sendEmailNotFoundNotification(email)
        
        if (emailSent) {
          console.log(`Email not found notification sent to: ${email}`)
        } else {
          console.error('Failed to send email not found notification')
        }
      } catch (emailError) {
        console.error('Failed to send email not found notification:', emailError)
      }
    }

    // Always return the same success message to prevent email enumeration
    return NextResponse.json(
      { message: 'If an account with that email exists, recovery information has been sent to your email address.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}