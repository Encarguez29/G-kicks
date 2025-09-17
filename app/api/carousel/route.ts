import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

// GET - Fetch active carousel slides for public display
export async function GET() {
  try {
    // Create carousel_slides table if it doesn't exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS carousel_slides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        ctaText VARCHAR(100) NOT NULL,
        bgGradient VARCHAR(255) NOT NULL,
        image VARCHAR(255) NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        is_archived BOOLEAN DEFAULT 0,
        display_order INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    
    // Check if table is empty and seed with default data
    const countResult: any = await executeQuery('SELECT COUNT(*) as count FROM carousel_slides')
    const count = Array.isArray(countResult) ? countResult[0].count : countResult.count
    if (count === 0) {
      const defaultSlides = [
        {
          title: 'Unlock Exclusive Deals',
          subtitle: 'Join GKICKS Today!',
          description: 'Get access to member-only discounts, early access to new releases, and personalized recommendations.',
          ctaText: 'Sign Up Now',
          bgGradient: 'from-yellow-400 via-orange-500 to-red-500',
          image: '/images/air-jordan-main.png',
          order: 1
        },
        {
          title: 'Premium Shopping Experience',
          subtitle: 'Elevate Your Style',
          description: 'Enjoy wishlist functionality, order tracking, personalized size recommendations, and exclusive member events.',
          ctaText: 'Create Account',
          bgGradient: 'from-blue-500 via-purple-500 to-pink-500',
          image: '/images/ultraboost-23.png',
          order: 2
        },
        {
          title: 'Join Our Community',
          subtitle: '50K+ Happy Customers',
          description: 'Connect with sneaker enthusiasts, share reviews, get styling tips, and be part of the GKICKS family.',
          ctaText: 'Join Community',
          bgGradient: 'from-green-400 via-teal-500 to-blue-500',
          image: '/images/air-force-1.png',
          order: 3
        },
        {
          title: 'Lightning Fast Checkout',
          subtitle: 'Shop in Seconds',
          description: 'Save your payment methods, shipping addresses, and preferences for the fastest checkout experience.',
          ctaText: 'Get Started',
          bgGradient: 'from-purple-500 via-indigo-500 to-blue-600',
          image: '/images/chuck-70-high-top.png',
          order: 4
        }
      ]
      
      for (const slide of defaultSlides) {
        await executeQuery(`
          INSERT INTO carousel_slides (title, subtitle, description, ctaText, bgGradient, image, isActive, display_order)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `, [slide.title, slide.subtitle, slide.description, slide.ctaText, slide.bgGradient, slide.image, slide.order])
      }
    }
    
    // Fetch all slides for public display (exclude archived slides)
    const slides: any = await executeQuery(`
      SELECT id, title, subtitle, description, ctaText, bgGradient, image, isActive, display_order as \`order\`
      FROM carousel_slides 
      WHERE isActive = 1 AND (is_archived = 0 OR is_archived IS NULL)
      ORDER BY display_order ASC, id ASC
    `)
    
    return NextResponse.json(slides)
  } catch (error) {
    console.error('Error fetching carousel slides:', error)
    return NextResponse.json(
      { error: 'Failed to fetch carousel slides' },
      { status: 500 }
    )
  }
}

// POST - Create a new carousel slide
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, subtitle, description, ctaText, bgGradient, image, isActive = true, order = 1 } = body

    if (!title || !subtitle || !description || !ctaText || !bgGradient || !image) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result: any = await executeQuery(`
      INSERT INTO carousel_slides (title, subtitle, description, ctaText, bgGradient, image, isActive, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, subtitle, description, ctaText, bgGradient, image, isActive ? 1 : 0, order])

    return NextResponse.json({ 
      id: result.insertId,
      title,
      subtitle,
      description,
      ctaText,
      bgGradient,
      image,
      isActive,
      order
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating carousel slide:', error)
    return NextResponse.json(
      { error: 'Failed to create carousel slide' },
      { status: 500 }
    )
  }
}

// PUT - Update an existing carousel slide
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, title, subtitle, description, ctaText, bgGradient, image, isActive, order } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Slide ID is required' },
        { status: 400 }
      )
    }

    if (!title || !subtitle || !description || !ctaText || !bgGradient || !image) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await executeQuery(`
      UPDATE carousel_slides 
      SET title = ?, subtitle = ?, description = ?, ctaText = ?, bgGradient = ?, image = ?, isActive = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, subtitle, description, ctaText, bgGradient, image, isActive ? 1 : 0, order, id])

    return NextResponse.json({ 
      id,
      title,
      subtitle,
      description,
      ctaText,
      bgGradient,
      image,
      isActive,
      order
    })
  } catch (error) {
    console.error('Error updating carousel slide:', error)
    return NextResponse.json(
      { error: 'Failed to update carousel slide' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a carousel slide
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Slide ID is required' },
        { status: 400 }
      )
    }

    await executeQuery('DELETE FROM carousel_slides WHERE id = ?', [id])

    return NextResponse.json({ message: 'Slide deleted successfully' })
  } catch (error) {
    console.error('Error deleting carousel slide:', error)
    return NextResponse.json(
      { error: 'Failed to delete carousel slide' },
      { status: 500 }
    )
  }
}