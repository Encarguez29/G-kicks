import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'
import jwt from 'jsonwebtoken'

interface JWTPayload {
  id: number
  email: string
  is_admin: boolean
}

async function getUserFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// PUT - Update product stock/variants
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { color, size, quantity } = body

    if (!color || !size || quantity === undefined) {
      return NextResponse.json(
        { error: 'Color, size, and quantity are required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Updating product stock:', productId, color, size, quantity)

    // Get current product data
    const productResult = await executeQuery(
      'SELECT variants, stock_quantity FROM products WHERE id = ?',
      [productId]
    )

    if (!productResult || (Array.isArray(productResult) && productResult.length === 0)) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

const product = Array.isArray(productResult) ? productResult[0] : productResult
    let variants: Record<string, Record<string, number>>
    
    try {
      variants = (product as any).variants ? JSON.parse((product as any).variants) : {}
    } catch (e) {
      console.warn('Failed to parse variants for product', productId, ':', e)
      variants = {}
    }

    // Update variants with stock validation
    const variantsAny = variants as any
    if (!variantsAny[color]) variantsAny[color] = {}
    const currentStock = variantsAny[color][size] || 0
    
    // Validate stock availability to prevent overselling
    if (quantity > 0 && currentStock < quantity) {
      return NextResponse.json(
        { 
          error: 'Insufficient stock', 
          message: `Only ${currentStock} items available for ${color} ${size}`,
          availableStock: currentStock,
          requestedQuantity: quantity
        },
        { status: 400 }
      )
    }
    
    const newStock = Math.max(currentStock - quantity, 0)
    variantsAny[color][size] = newStock
    variants = variantsAny

    // Calculate total stock
    let totalStock = 0
    Object.values(variants).forEach((sizeStocks) => {
      const stocks = sizeStocks as Record<string, number>
      totalStock += Object.values(stocks).reduce((sum, qty) => sum + qty, 0)
    })

    // Update database
    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const result = await executeQuery(
      'UPDATE products SET variants = ?, stock_quantity = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(variants), totalStock, currentTimestamp, productId]
    )

    if ((result as any).changes === 0) {
      return NextResponse.json(
        { error: 'Failed to update product stock' },
        { status: 500 }
      )
    }

    console.log('✅ API: Successfully updated product stock')
    return NextResponse.json({
      success: true,
      variants,
      totalStock,
      message: 'Product stock updated successfully'
    })

  } catch (error) {
    console.error('❌ API: Error updating product stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}