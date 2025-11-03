import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚫 No valid authorization header found')
      return null
    }

    const token = authHeader.substring(7)
    console.log('🔍 Token received:', token.substring(0, 50) + '...')
    console.log('🔍 Token length:', token.length)
    console.log('🔍 Token parts:', token.split('.').length)
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    console.log('✅ Token verified successfully for user:', decoded.userId)
    return { id: decoded.userId, email: decoded.email }
  } catch (error) {
    console.error('❌ Token verification failed:', error)
    console.error('❌ Token that failed:', authHeader ? authHeader.substring(7, 57) + '...' : 'No token')
    return null
  }
}

// GET - Fetch user addresses
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔍 API: Fetching addresses for user:', user.id)
    
    const [addresses] = await pool.execute(
      `SELECT * FROM addresses 
       WHERE user_id = ? 
       ORDER BY is_default DESC, created_at DESC`,
      [user.id]
    )

    // Convert is_default from 0/1 to boolean
    const formattedAddresses = (addresses as any[]).map(address => ({
      ...address,
      is_default: Boolean(address.is_default)
    }))

    console.log(`✅ API: Successfully fetched ${formattedAddresses.length} addresses`)
    return NextResponse.json(formattedAddresses)

  } catch (error) {
    console.error('❌ API: Error fetching addresses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new address
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      first_name,
      last_name,
      phone,
      is_default,
      shipping_region,
      barangay
    } = body

    // Validate required fields
    if (!address_line_1 || !city || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Address line 1, city, first name, and last name are required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Creating new address for user:', user.id)

    // If this is set as default, unset other default addresses
    if (is_default) {
      await pool.execute(
        `UPDATE addresses SET is_default = 0 WHERE user_id = ?`,
        [user.id]
      )
    }

    const [result] = await pool.execute(
      `INSERT INTO addresses (
         user_id, first_name, last_name, address_line_1, address_line_2,
         city, barangay, state, postal_code, country, phone, is_default, shipping_region
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        first_name,
        last_name,
        address_line_1,
        address_line_2 || '',
        city,
        barangay || '',
        state || '',
        postal_code || '',
        country || 'Philippines',
        phone || '',
        is_default ? 1 : 0,
        shipping_region || 'Luzon'
      ]
    )

    // Fetch the created address
    const [newAddress] = await pool.execute(
      `SELECT * FROM addresses WHERE id = ?`,
      [(result as any).insertId]
    )

    // Convert is_default from 0/1 to boolean
    const formattedAddress = {
      ...(newAddress as any[])[0],
      is_default: Boolean((newAddress as any[])[0].is_default)
    }

    console.log('✅ API: Successfully created address')
    return NextResponse.json(formattedAddress, { status: 201 })

  } catch (error) {
    console.error('❌ API: Error creating address:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update address
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
    const {
      id,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      first_name,
      last_name,
      phone,
      is_default,
      shipping_region,
      barangay
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!address_line_1 || !city || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Address line 1, city, first name, and last name are required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Updating address:', id, 'for user:', user.id)

    // Check if address exists and belongs to user
    const [existingAddress] = await pool.execute(
      `SELECT * FROM addresses WHERE id = ? AND user_id = ?`,
      [id, user.id]
    )

    if (!existingAddress || (existingAddress as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }

    // If this is set as default, unset other default addresses
    if (is_default) {
      await pool.execute(
        `UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?`,
        [user.id, id]
      )
    }

    const [result] = await pool.execute(
      `UPDATE addresses SET 
         first_name = ?, last_name = ?, address_line_1 = ?, address_line_2 = ?,
         city = ?, barangay = ?, state = ?, postal_code = ?, country = ?, phone = ?, is_default = ?, shipping_region = ?
       WHERE id = ? AND user_id = ?`,
      [
        first_name,
        last_name,
        address_line_1,
        address_line_2 || '',
        city,
        barangay || '',
        state || '',
        postal_code || '',
        country || 'Philippines',
        phone || '',
        is_default ? 1 : 0,
        shipping_region || 'Luzon',
        id,
        user.id
      ]
    )

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Address not found or unauthorized' },
        { status: 404 }
      )
    }

    // Fetch the updated address
    const [updatedAddress] = await pool.execute(
      `SELECT * FROM addresses WHERE id = ? AND user_id = ?`,
      [id, user.id]
    )

    // Convert is_default from 0/1 to boolean
    const formattedAddress = {
      ...(updatedAddress as any[])[0],
      is_default: Boolean((updatedAddress as any[])[0].is_default)
    }

    console.log('✅ API: Successfully updated address')
    return NextResponse.json(formattedAddress)

  } catch (error) {
    console.error('❌ API: Error updating address:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const addressId = searchParams.get('id')

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Deleting address:', addressId, 'for user:', user.id)

    const [result] = await pool.execute(
      `DELETE FROM addresses WHERE id = ? AND user_id = ?`,
      [addressId, user.id]
    )

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Address not found or unauthorized' },
        { status: 404 }
      )
    }

    console.log('✅ API: Successfully deleted address')
    return NextResponse.json({ message: 'Address deleted successfully' })

  } catch (error) {
    console.error('❌ API: Error deleting address:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}