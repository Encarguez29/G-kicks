import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { applyPricingToProducts } from '@/lib/pricing-utils'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// GET - Fetch real-time stock levels for POS products
export async function GET(request: NextRequest) {
  try {
    // Check for JWT token in Authorization header first
    const authHeader = request.headers.get('authorization')
    let userEmail = null
    let userRole = null
    let isAuthenticated = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        userEmail = decoded.email
        userRole = decoded.role
        isAuthenticated = true
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to JWT in auth-token cookie
    if (!isAuthenticated) {
      const cookieToken = request.cookies.get('auth-token')?.value
      if (cookieToken) {
        try {
          const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET || 'fallback-secret') as any
          userEmail = decoded.email
          userRole = decoded.role
          isAuthenticated = true
        } catch (error) {
          console.error('Cookie JWT verification failed:', error)
        }
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productIds = searchParams.get('productIds')?.split(',') || []

    let whereClause = 'WHERE p.is_active = 1'
    const params: any[] = []

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',')
      whereClause += ` AND p.id IN (${placeholders})`
      params.push(...productIds)
    }

    // Get products with current stock levels
    const stockQuery = `
      SELECT 
        p.id,
        p.name,
        p.brand,
        p.price,
        p.image_url,
        p.variants,
        p.stock_quantity,
        p.gallery_images
      FROM products p
      ${whereClause}
      ORDER BY p.name ASC
    `

    const products = await executeQuery(stockQuery, params) as any[]

    // Format the response with real-time stock data
    const stockData = products.map(product => {
      let variants = {}
      try {
        variants = product.variants ? JSON.parse(product.variants) : {}
      } catch (error) {
        console.error('Error parsing variants for product', product.id, ':', error)
        variants = {}
      }

      // Calculate total stock from variants
      let totalStock = 0
      Object.values(variants).forEach((colorVariant: any) => {
        if (colorVariant && typeof colorVariant === 'object') {
          Object.values(colorVariant).forEach((sizeStock: any) => {
            if (typeof sizeStock === 'number') {
              totalStock += sizeStock
            }
          })
        }
      })

      // Parse gallery images
      let galleryImages = []
      try {
        galleryImages = product.gallery_images ? JSON.parse(product.gallery_images) : []
      } catch (error) {
        galleryImages = []
      }

      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: parseFloat(product.price),
        image_url: product.image_url,
        gallery_images: galleryImages,
        variants: variants,
        stock_quantity: product.stock_quantity,
        total_variant_stock: totalStock
      }
    })

    // Apply pricing calculations to all stock data
    const stockDataWithPricing = await applyPricingToProducts(stockData)

    return NextResponse.json({
      success: true,
      products: stockDataWithPricing,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ API: Error fetching POS stock data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    )
  }
}