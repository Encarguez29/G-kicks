import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/mysql';

export async function GET(request: NextRequest) {
  try {
    // Check if pricing_settings table exists and get current settings
    const result = await executeQuery(`
      SELECT admin_fee, markup_percentage 
      FROM pricing_settings 
      WHERE id = 1
    `);
    
    if (!Array.isArray(result) || result.length === 0) {
      // Initialize with default values if no settings exist
      await executeQuery(`
        INSERT INTO pricing_settings (id, admin_fee, markup_percentage)
        VALUES (1, 0, 0)
        ON DUPLICATE KEY UPDATE id = id
      `);
      
      return NextResponse.json({ 
        admin_fee: 0, 
        markup_percentage: 0 
      });
    }
    
    // Convert string values from MySQL to numbers
    const settings = result[0];
    return NextResponse.json({
      admin_fee: parseFloat(settings.admin_fee) || 0,
      markup_percentage: parseFloat(settings.markup_percentage) || 0
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin_fee, markup_percentage } = body;
    
    // Validate input
    if (typeof admin_fee !== 'number' || typeof markup_percentage !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: admin_fee and markup_percentage must be numbers' },
        { status: 400 }
      );
    }
    
    if (admin_fee < 0 || markup_percentage < 0) {
      return NextResponse.json(
        { error: 'Values cannot be negative' },
        { status: 400 }
      );
    }
    
    // Update or insert pricing settings
    await executeQuery(`
      INSERT INTO pricing_settings (id, admin_fee, markup_percentage)
      VALUES (1, ?, ?)
      ON DUPLICATE KEY UPDATE 
        admin_fee = VALUES(admin_fee),
        markup_percentage = VALUES(markup_percentage)
    `, [admin_fee, markup_percentage]);
    
    return NextResponse.json({ 
      success: true, 
      admin_fee, 
      markup_percentage 
    });
  } catch (error) {
    console.error('Error saving pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing settings' },
      { status: 500 }
    );
  }
}