import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET - Fetch reviews for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Fetching reviews for product:', productId)
    
    // Fetch reviews for the product
    const reviews = await executeQuery(
      `SELECT 
        r.id,
        r.user_name,
        r.rating,
        r.comment,
        r.photos,
        r.is_verified_purchase,
        r.helpful_count,
        r.created_at,
        r.updated_at
      FROM reviews r 
      WHERE r.product_id = ? AND r.is_approved = TRUE 
      ORDER BY r.created_at DESC`,
      [productId]
    ) as any[]

    // Parse photos JSON for each review
    const processedReviews = reviews.map(review => ({
      ...review,
      photos: review.photos ? JSON.parse(review.photos) : []
    }))

    console.log('✅ API: Found', reviews.length, 'reviews for product', productId)
    
    return NextResponse.json({
      success: true,
      reviews: processedReviews,
      count: reviews.length
    })

  } catch (error) {
    console.error('❌ API: Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST - Submit a new review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    const { productId, rating, comment, userName, email, photos } = body

    // Validation
    if (!productId || !rating || !comment || !userName) {
      return NextResponse.json(
        { error: 'Product ID, rating, comment, and user name are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    console.log('📝 API: Submitting review for product:', productId, 'by user:', userName)
    
    // Get user ID if authenticated
    const userId = session?.user ? (session.user as any).id : null
    
    // Check if user already reviewed this product (if authenticated)
    if (userId) {
      const existingReviews = await executeQuery(
        'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
        [productId, userId]
      ) as any[]
      
      if (existingReviews.length > 0) {
        return NextResponse.json(
          { error: 'You have already reviewed this product' },
          { status: 409 }
        )
      }
    }
    
    // Insert the review
    const result = await executeQuery(
      `INSERT INTO reviews (
        product_id, user_id, user_name, user_email, rating, comment, photos, is_verified_purchase
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        userId,
        userName.trim(),
        email?.trim() || null,
        rating,
        comment.trim(),
        photos && photos.length > 0 ? JSON.stringify(photos) : null,
        userId ? true : false // Verified purchase if user is authenticated
      ]
    ) as any

    console.log('✅ API: Review submitted successfully with ID:', result.insertId)
    
    // Update product rating and review count
    await updateProductRating(productId)
    
    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      reviewId: result.insertId
    })

  } catch (error) {
    console.error('❌ API: Error submitting review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    )
  }
}

// Helper function to update product rating and review count
async function updateProductRating(productId: string) {
  try {
    // Calculate average rating and count
    const stats = await executeQuery(
      `SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as review_count
      FROM reviews 
      WHERE product_id = ? AND is_approved = TRUE`,
      [productId]
    ) as any[]
    
    if (stats.length > 0) {
      const avgRating = Math.round(stats[0].avg_rating * 10) / 10 // Round to 1 decimal
      const reviewCount = stats[0].review_count
      
      // Update product table
      await executeQuery(
        'UPDATE products SET rating = ?, reviews = ? WHERE id = ?',
        [avgRating, reviewCount, productId]
      )
      
      console.log('✅ API: Updated product rating:', avgRating, 'review count:', reviewCount)
    }
  } catch (error) {
    console.error('❌ API: Error updating product rating:', error)
  }
}