import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

// GET - Fetch all carousel slides
export async function GET() {
  try {
    const slides: any = await executeQuery(`
      SELECT id, title, subtitle, description, ctaText, bgGradient, image, isActive, display_order as \`order\`, created_at, updated_at
      FROM carousel_slides 
      WHERE is_archived = 0
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

// POST - Create new carousel slide
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, subtitle, description, ctaText, bgGradient, image, isActive, order } = body
    
    if (!title || !subtitle || !description || !ctaText || !bgGradient || !image) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
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
    
    const result: any = await executeQuery(`
      INSERT INTO carousel_slides (title, subtitle, description, ctaText, bgGradient, image, isActive, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, subtitle, description, ctaText, bgGradient, image, isActive ? 1 : 0, order || 1])
    
    return NextResponse.json(
      { id: result.insertId, message: 'Carousel slide created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating carousel slide:', error)
    return NextResponse.json(
      { error: 'Failed to create carousel slide' },
      { status: 500 }
    )
  }
}

// PATCH - Update carousel slide (for archiving)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Slide ID is required' },
        { status: 400 }
      )
    }

    const { is_archived } = body

    if (is_archived !== undefined) {
      await executeQuery(
        'UPDATE carousel_slides SET is_archived = ? WHERE id = ?',
        [is_archived ? 1 : 0, id]
      )

      return NextResponse.json({ 
        message: is_archived ? 'Slide archived successfully' : 'Slide unarchived successfully' 
      })
    }

    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating carousel slide:', error)
    return NextResponse.json(
      { error: 'Failed to update carousel slide' },
      { status: 500 }
    )
  }
}