import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 POS INVENTORY API: Request received - fetching data from MySQL database...')
    
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
        console.log('🔍 POS INVENTORY API: JWT authenticated -', userEmail, 'role:', userRole)
      } catch (error) {
        console.error('JWT verification failed:', error)
      }
    }

    // Fallback to NextAuth session if JWT not found or invalid
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions)
      console.log('🔍 POS INVENTORY API: Session check -', session?.user ? 'authenticated' : 'not authenticated', 'role:', (session?.user as any)?.role)
      if (session?.user) {
        userEmail = session.user.email
        userRole = (session.user as any)?.role
        isAuthenticated = true
      }
    }

    if (!isAuthenticated || !userEmail || (userRole !== 'admin' && userRole !== 'staff')) {
      console.log('❌ POS INVENTORY API: Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch active products with stock information
    const inventoryQuery = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.brand,
        p.price,
        p.original_price,
        p.image_url,
        p.gallery_images,
        p.description,
        p.is_new,
        p.is_sale,
        p.is_active,
        p.stock_quantity,
        p.colors,
        p.sizes,
        p.variants
      FROM products p
      WHERE p.is_active = 1 AND p.stock_quantity > 0
      ORDER BY p.name ASC
    `
    
    const inventory = await executeQuery(inventoryQuery)
    
    // Format the inventory data for POS use
    const inventoryArray = Array.isArray(inventory) ? inventory : []
    const formattedInventory = await Promise.all(inventoryArray.map(async (product: any) => {
      const colors = product.colors ? JSON.parse(product.colors) : []
      const sizes = product.sizes ? JSON.parse(product.sizes) : []
      const galleryImages = product.gallery_images ? JSON.parse(product.gallery_images) : []
      
      // Get actual variants from product_variants table or use JSON variants
      let variants: { [color: string]: { [size: string]: number } } = {}
      
      try {
        // First try to get variants from the variants JSON field
        if (product.variants) {
          const parsedVariants = typeof product.variants === 'string' 
            ? JSON.parse(product.variants) 
            : product.variants
          variants = parsedVariants
        } else {
          // Fallback: get variants from product_variants table
          const variantResults = await executeQuery(
            'SELECT size, color, stock_quantity FROM product_variants WHERE product_id = ? AND is_active = TRUE',
            [product.id]
          ) as { size: string; color: string; stock_quantity: number }[]
          
          variantResults.forEach((variant) => {
            if (!variants[variant.color]) {
              variants[variant.color] = {}
            }
            variants[variant.color][variant.size] = variant.stock_quantity || 0
          })
        }
        
        // If no variants found, create default structure
        if (Object.keys(variants).length === 0) {
          colors.forEach((color: string) => {
            variants[color] = {}
            sizes.forEach((size: string) => {
              const stockPerVariant = Math.floor(product.stock_quantity / (colors.length * sizes.length)) || 0
              variants[color][size] = stockPerVariant
            })
          })
        }
      } catch (error) {
        console.error('Error parsing variants for product', product.id, ':', error)
        // Create fallback variants structure
        colors.forEach((color: string) => {
          variants[color] = {}
          sizes.forEach((size: string) => {
            const stockPerVariant = Math.floor(product.stock_quantity / (colors.length * sizes.length)) || 0
            variants[color][size] = stockPerVariant
          })
        })
      }
      
      return {
        id: product.id,
        name: product.name,
        category: product.category || 'Other',
        brand: product.brand || 'Unknown',
        price: parseFloat(product.price) || 0,
        originalPrice: parseFloat(product.original_price) || parseFloat(product.price) || 0,
        image_url: product.image_url,
        gallery_images: galleryImages,
        description: product.description,
        is_new: Boolean(product.is_new),
        is_sale: Boolean(product.is_sale),
        is_active: Boolean(product.is_active),
        stock_quantity: parseInt(product.stock_quantity) || 0,
        colors: colors,
        sizes: sizes,
        variants: variants
      }
    }))
    
    console.log(`✅ API: Successfully returned ${formattedInventory.length} inventory items`)
    
    return NextResponse.json(formattedInventory)
  } catch (error) {
    console.error('❌ API: Error fetching POS inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    )
  }
}

// PUT - Update stock quantity
export async function PUT(request: NextRequest) {
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
    
    const { productId, quantity, operation } = await request.json()
    
    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      )
    }
    
    let updateQuery: string
    let params: any[]
    
    if (operation === 'set') {
      // Set absolute quantity
      updateQuery = `
        UPDATE products 
        SET stock_quantity = ?, updated_at = NOW()
        WHERE id = ?
      `
      params = [quantity, productId]
    } else if (operation === 'decrease') {
      // Decrease quantity (for sales)
      updateQuery = `
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - ?), updated_at = NOW()
        WHERE id = ? AND stock_quantity >= ?
      `
      params = [quantity, productId, quantity]
    } else {
      // Default: increase quantity
      updateQuery = `
        UPDATE products 
        SET stock_quantity = stock_quantity + ?, updated_at = NOW()
        WHERE id = ?
      `
      params = [quantity, productId]
    }
    
    const result = await executeQuery(updateQuery, params)
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Product not found or insufficient stock' },
        { status: 404 }
      )
    }
    
    // Get updated stock quantity
    const updatedProduct = await executeQuery(
      'SELECT stock_quantity FROM products WHERE id = ?',
      [productId]
    )
    
    return NextResponse.json({
      success: true,
      productId,
      newQuantity: (updatedProduct as any[])[0]?.stock_quantity || 0
    })
  } catch (error) {
    console.error('❌ API: Error updating stock:', error)
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    )
  }
}