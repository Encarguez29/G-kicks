import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // First check regular users table
    const userArray = await executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as any[]
    
    let user = null
    let isAdminUser = false
    
    if (userArray.length > 0) {
      user = userArray[0]
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }
      
      // Check if email is verified
      if (!user.email_verified) {
        return NextResponse.json(
          { 
            error: 'Email not verified',
            message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
            requiresVerification: true
          },
          { status: 403 }
        )
      }
    } else {
      // If not found in users table, check admin_users table
      const adminUserArray = await executeQuery(
        'SELECT * FROM admin_users WHERE email = ? AND is_active = 1',
        [email]
      ) as any[]
      
      if (adminUserArray.length === 0) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }
      
      user = adminUserArray[0]
      isAdminUser = true
      
      // Verify password (admin_users table uses password_hash or password field)
      const passwordField = user.password_hash || user.password
      const isValidPassword = await bcrypt.compare(password, passwordField)
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }
    }

    // Generate JWT token with appropriate role
    let userRole = 'user'
    if (isAdminUser) {
      userRole = user.role // 'admin' or 'staff' from admin_users table
    } else {
      userRole = user.is_admin ? 'admin' : 'user'
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: userRole
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    const response = NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    })

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}