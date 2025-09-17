import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 JWT: Attempting to convert session to JWT...')
    
    // Get the NextAuth session
    const session = await getServerSession(authOptions)
    
    console.log('🔐 JWT: Session found:', !!session)
    console.log('🔐 JWT: User in session:', !!session?.user)
    console.log('🔐 JWT: User email:', session?.user?.email)
    
    if (!session || !session.user) {
      console.log('❌ JWT: No active session found')
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      )
    }

    // First check admin_users table for staff/admin roles
    const adminUserArray = await executeQuery(
      'SELECT id, email, first_name, last_name, role FROM admin_users WHERE email = ? AND is_active = 1',
      [session.user.email || null]
    ) as any[]

    let user = null
    let userRole = 'user'
    let isAdminUser = false

    if (adminUserArray.length > 0) {
      // User found in admin_users table
      user = adminUserArray[0]
      userRole = user.role // 'admin' or 'staff' from admin_users table
      isAdminUser = true
    } else {
      // Fallback to regular users table
      const userArray = await executeQuery(
        'SELECT id, email, first_name, last_name, is_admin FROM users WHERE email = ?',
        [session.user.email || null]
      ) as any[]

      if (userArray.length === 0) {
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 404 }
        )
      }

      user = userArray[0]
      userRole = user.is_admin ? 'admin' : 'user'
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: userRole
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({
      message: 'JWT token generated successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: userRole
      }
    })

    // Also set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Session to JWT conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate JWT token' },
      { status: 500 }
    )
  }
}