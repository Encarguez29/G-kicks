import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 AUTH ME: Request received');
    console.log('🔍 AUTH ME: JWT_SECRET preview:', JWT_SECRET.substring(0, 20) + '...');
    
    // Get token from cookie or Authorization header
    let token = request.cookies.get('auth-token')?.value
    console.log('🔍 AUTH ME: Cookie token:', token ? 'found' : 'not found');
    
    // If no cookie token, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization')
      console.log('🔍 AUTH ME: Auth header:', authHeader ? 'found' : 'not found');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
        console.log('🔍 AUTH ME: Bearer token extracted, length:', token.length);
      }
    }

    if (!token) {
      console.log('❌ AUTH ME: No token provided');
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    console.log('🔍 AUTH ME: Token preview:', token.substring(0, 50) + '...');
    
    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
      console.log('✅ AUTH ME: Token verified successfully for user:', decoded.userId);
    } catch (jwtError) {
      console.error('❌ AUTH ME: JWT verification failed:', (jwtError as Error).message);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }

    // Get user from database
    const userArray = await executeQuery(
      'SELECT id, email, first_name, last_name, avatar_url, is_admin, created_at FROM users WHERE id = ?',
      [decoded.userId]
    ) as any[]
    if (userArray.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userArray[0]

    // Also get profile data which might have more up-to-date information
    const profileArray = await executeQuery(
      'SELECT first_name, last_name, avatar_url FROM profiles WHERE id = ?',
      [decoded.userId]
    ) as any[]

    // Use profile data if available, otherwise fall back to user data
    let firstName = user.first_name
    let lastName = user.last_name
    let avatarUrl = user.avatar_url

    if (profileArray.length > 0) {
      const profile = profileArray[0]
      // Use profile data if it exists and is not empty
      if (profile.first_name) firstName = profile.first_name
      if (profile.last_name) lastName = profile.last_name
      if (profile.avatar_url) avatarUrl = profile.avatar_url
    }

    console.log('🔐 Auth Me: Returning user data:', {
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl
    });

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl,
        is_admin: user.is_admin,
        created_at: user.created_at
      }
    })

  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}