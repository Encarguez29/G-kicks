import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { executeQuery } from '@/lib/database/mysql'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚫 PROFILES: No valid authorization header found')
      return null
    }

    const token = authHeader.substring(7)
    console.log('🔍 PROFILES: Token received:', token.substring(0, 50) + '...')
    console.log('🔍 PROFILES: Token length:', token.length)
    console.log('🔍 PROFILES: Token parts:', token.split('.').length)
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    console.log('✅ PROFILES: Token verified successfully for user:', decoded.userId)
    return { id: decoded.userId, email: decoded.email }
  } catch (error) {
    console.error('❌ PROFILES: Token verification failed:', error)
    console.error('❌ PROFILES: Token that failed:', authHeader?.substring(7, 57) + '...')
    return null
  }
}

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔍 API: Fetching profile for user:', user.id, '- timestamp:', new Date().toISOString())
    
    // Fetch profile from database
    const profileQuery = 'SELECT * FROM profiles WHERE id = ?'
    const profiles = await executeQuery(profileQuery, [user.id])
    
    console.log('📊 API: Raw profile data from DB:', profiles)
    
    let profile
    const profilesArray = profiles as any[]
    if (profilesArray.length > 0) {
      const dbProfile = profilesArray[0]
      console.log('📋 API: Processing profile:', {
        id: dbProfile.id,
        first_name: dbProfile.first_name,
        last_name: dbProfile.last_name,
        phone: dbProfile.phone,
        preferences: dbProfile.preferences
      })
      
      // Check if existing profile has empty first_name/last_name and update from users table
      if (!dbProfile.first_name || !dbProfile.last_name) {
        console.log('🔄 Profile has empty name fields, updating from users table')
        
        // Fetch user data from users table
        const userQuery = 'SELECT first_name, last_name, avatar_url FROM users WHERE id = ?'
        const userData = await executeQuery(userQuery, [user.id])
        
        const userDataArray = userData as any[]
        if (userDataArray.length > 0) {
          const userFirstName = userDataArray[0].first_name || ''
          const userLastName = userDataArray[0].last_name || ''
          const userAvatarUrl = userDataArray[0].avatar_url || ''
          
          // Update profile with user data (preserve existing avatar_url)
          const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const updateQuery = `
            UPDATE profiles 
            SET first_name = ?, last_name = ?, avatar_url = ?, updated_at = ?
            WHERE id = ?
          `
          
          // Only use user avatar if profile doesn't have one
          const finalAvatarUrl = dbProfile.avatar_url || userAvatarUrl
          
          await executeQuery(updateQuery, [
            userFirstName,
            userLastName,
            finalAvatarUrl,
            currentTimestamp,
            user.id
          ])
          
          console.log('✅ Profile updated with user data:', {
            first_name: userFirstName,
            last_name: userLastName,
            avatar_url: finalAvatarUrl
          })
          
          // Update the profile object
          dbProfile.first_name = userFirstName
          dbProfile.last_name = userLastName
          dbProfile.avatar_url = finalAvatarUrl
        }
      }
      
      // Parse preferences if it's a string
      let preferences = {
        newsletter: true,
        sms_notifications: false,
        email_notifications: true,
        preferred_language: 'en',
        currency: 'PHP'
      }
      
      if (dbProfile.preferences) {
        try {
          preferences = typeof dbProfile.preferences === 'string' 
            ? JSON.parse(dbProfile.preferences) 
            : dbProfile.preferences
        } catch (e) {
          console.warn('Failed to parse preferences, using defaults')
        }
      }
      
      // Format birthdate properly for frontend
      let formattedBirthdate = ''
      if (dbProfile.birthdate) {
        try {
          const date = new Date(dbProfile.birthdate)
          if (!isNaN(date.getTime())) {
            formattedBirthdate = date.toISOString().split('T')[0] // YYYY-MM-DD format
          }
        } catch (e) {
          console.warn('Failed to format birthdate:', dbProfile.birthdate)
        }
      }
      
      profile = {
        id: dbProfile.id,
        first_name: dbProfile.first_name || '',
        last_name: dbProfile.last_name || '',
        phone: dbProfile.phone || '',
        birthdate: formattedBirthdate,
        gender: dbProfile.gender || '',
        bio: dbProfile.bio || '',
        avatar_url: dbProfile.avatar_url || '',
        preferences
      }
      
      console.log('✨ API: Final profile object:', profile)
    } else {
      // Fetch user data from users table to use as defaults
      const userQuery = 'SELECT first_name, last_name, avatar_url FROM users WHERE id = ?'
      const users = await executeQuery(userQuery, [user.id])
      
      let userFirstName = ''
      let userLastName = ''
      let userAvatarUrl = ''
      
      const usersArray = users as any[]
      if (usersArray.length > 0) {
        const userData = usersArray[0]
        userFirstName = userData.first_name || ''
        userLastName = userData.last_name || ''
        userAvatarUrl = userData.avatar_url || ''
        console.log('📋 API: Using user data as defaults:', { userFirstName, userLastName, userAvatarUrl })
      }
      
      // Create default profile if none exists
      const defaultProfile = {
        id: user.id,
        first_name: userFirstName,
        last_name: userLastName,
        phone: '',
        birthdate: null,
        gender: '',
        bio: '',
        avatar_url: userAvatarUrl,
        preferences: JSON.stringify({
          newsletter: true,
          sms_notifications: false,
          email_notifications: true,
          preferred_language: 'en',
          currency: 'PHP'
        })
      }
      
      const insertQuery = `
        INSERT INTO profiles (id, first_name, last_name, phone, birthdate, gender, bio, avatar_url, preferences)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      await executeQuery(insertQuery, [
        defaultProfile.id,
        defaultProfile.first_name,
        defaultProfile.last_name,
        defaultProfile.phone,
        defaultProfile.birthdate,
        defaultProfile.gender,
        defaultProfile.bio,
        defaultProfile.avatar_url,
        defaultProfile.preferences
      ])
      
      profile = {
        id: user.id,
        first_name: userFirstName,
        last_name: userLastName,
        phone: '',
        birthdate: '',
        gender: '',
        bio: '',
        avatar_url: userAvatarUrl,
        preferences: JSON.parse(defaultProfile.preferences)
      }
    }
    
    console.log('✅ API: Successfully fetched profile')
    return NextResponse.json(profile)

  } catch (error) {
    console.error('❌ API: Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('🔍 API: Updating profile for user:', user.id, 'with data:', body)
    console.log('📝 API: Update data received:', {
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      birthdate: body.birthdate,
      gender: body.gender,
      bio: body.bio,
      avatar_url: body.avatar_url,
      preferences: body.preferences
    })

    // Check if profile exists first
    const checkQuery = 'SELECT id FROM profiles WHERE id = ?'
    const existingProfile = await executeQuery(checkQuery, [user.id])
    const profileExists = (existingProfile as any[]).length > 0
    
    console.log('🔍 API: Profile exists check:', profileExists)
    
    const preferencesString = typeof body.preferences === 'object' 
      ? JSON.stringify(body.preferences) 
      : body.preferences
    
    let result
    if (profileExists) {
      // Update existing profile
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateQuery = `
        UPDATE profiles 
        SET first_name = ?, last_name = ?, phone = ?, birthdate = ?, gender = ?, bio = ?, avatar_url = ?, preferences = ?, updated_at = ?
        WHERE id = ?`
      
      // Format birthdate for database storage
      let formattedBirthdate = null
      if (body.birthdate && body.birthdate.trim() !== '') {
        try {
          const date = new Date(body.birthdate)
          if (!isNaN(date.getTime())) {
            formattedBirthdate = body.birthdate // Keep as YYYY-MM-DD string for MySQL DATE
          }
        } catch (e) {
          console.warn('Invalid birthdate format:', body.birthdate)
        }
      }
      
      const updateParams = [
        body.first_name || '',
        body.last_name || '',
        body.phone || '',
        formattedBirthdate,
        body.gender || '',
        body.bio || '',
        body.avatar_url || '',
        preferencesString || JSON.stringify({
          newsletter: true,
          sms_notifications: false,
          email_notifications: true,
          preferred_language: 'en',
          currency: 'PHP'
        }),
        currentTimestamp,
        user.id
      ]
      
      console.log('💾 API: Updating existing profile with params:', updateParams)
      result = await executeQuery(updateQuery, updateParams)
    } else {
      // Create new profile
      const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const insertQuery = `
        INSERT INTO profiles (id, first_name, last_name, phone, birthdate, gender, bio, avatar_url, preferences, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      const insertParams = [
        user.id,
        body.first_name || '',
        body.last_name || '',
        body.phone || '',
        body.birthdate && body.birthdate.trim() !== '' ? body.birthdate : null,
        body.gender || '',
        body.bio || '',
        body.avatar_url || '',
        preferencesString || JSON.stringify({
          newsletter: true,
          sms_notifications: false,
          email_notifications: true,
          preferred_language: 'en',
          currency: 'PHP'
        }),
        currentTimestamp,
        currentTimestamp
      ]
      
      console.log('💾 API: Creating new profile with params:', insertParams)
      result = await executeQuery(insertQuery, insertParams)
    }
    
    console.log('✅ API: Operation result:', result)

    console.log('✅ API: Successfully updated profile')
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        ...body
      }
    })

  } catch (error) {
    console.error('❌ API: Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}