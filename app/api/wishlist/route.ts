import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚫 WISHLIST: No valid authorization header found')
      return null
    }

    const token = authHeader.substring(7)
    console.log('🔍 WISHLIST: Token received:', token.substring(0, 50) + '...')
    console.log('🔍 WISHLIST: Token length:', token.length)
    console.log('🔍 WISHLIST: Token parts:', token.split('.').length)
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    console.log('✅ WISHLIST: Token verified successfully for user:', decoded.userId)
    return { id: decoded.userId, email: decoded.email }
  } catch (error) {
    console.error('❌ WISHLIST: Token verification failed:', error)
    console.error('❌ WISHLIST: Token that failed:', authHeader?.substring(7, 57) + '...')
    return null
  }
}

// Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id

    console.log('🔍 API: Fetching wishlist for user:', userId)

    const query = `
      SELECT 
        w.id as wishlist_id,
        w.created_at as added_date,
        p.id,
        p.name,
        p.brand,
        p.price,
        p.original_price,
        p.image_url as image,
        p.colors,
        p.category_id as category,
        p.rating,
        p.sizes
      FROM wishlist_items w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ? AND p.is_active = 1
      ORDER BY w.created_at DESC
    `

    const results = await executeQuery(query, [userId]) as any[]
    
    console.log('🔍 API: Raw wishlist data from database:', results.map(item => ({ id: item.id, name: item.name, image: item.image, hasImage: !!item.image })))
    console.log('🔍 API: Total wishlist items found:', results.length)
    
    // Transform the data to match the WishlistItem interface
    const wishlistItems = results.map((item: any) => {
      let colors = []
      let sizes = []
      
      try {
        colors = item.colors ? JSON.parse(item.colors) : []
      } catch (e) {
        colors = []
      }
      
      try {
        sizes = item.sizes ? JSON.parse(item.sizes) : []
      } catch (e) {
        sizes = []
      }
      
      console.log(`🔍 API: Wishlist item ${item.id} - ${item.name}:`, {
        id: item.id,
        name: item.name,
        image: item.image,
        hasImage: !!item.image,
        imageLength: item.image ? item.image.length : 0
      })
      
      return {
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        originalPrice: item.original_price,
        image: item.image,
        colors,
        category: item.category,
        addedDate: item.added_date,
        sizes,
        rating: item.rating
      }
    })

    console.log(`✅ API: Successfully fetched ${wishlistItems.length} wishlist items for user`)
    return NextResponse.json(wishlistItems)
    
  } catch (error) {
    console.error('❌ API: Error fetching wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

// Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id
    
    const { productId } = await request.json()
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    console.log('🔍 API: Adding product to wishlist:', { userId, productId })

    // Check if item already exists in wishlist
    const checkQuery = 'SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?'
    const existing = await executeQuery(checkQuery, [userId, productId]) as any[]
    
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Item already in wishlist' }, { status: 200 })
    }

    // Add to wishlist
    const insertQuery = 'INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)'
    await executeQuery(insertQuery, [userId, productId])

    console.log('✅ API: Successfully added item to wishlist')
    return NextResponse.json({ message: 'Item added to wishlist' }, { status: 201 })
    
  } catch (error) {
    console.error('❌ API: Error adding to wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

// Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id
    
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    console.log('🔍 API: Removing product from wishlist:', { userId, productId })

    const deleteQuery = 'DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?'
    const result = await executeQuery(deleteQuery, [userId, productId])

    console.log('✅ API: Successfully removed item from wishlist')
    return NextResponse.json({ message: 'Item removed from wishlist' })
    
  } catch (error) {
    console.error('❌ API: Error removing from wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}