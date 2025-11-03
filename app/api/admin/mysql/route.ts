import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database/mysql';
import { sendAccountCreationSuccessEmail } from '@/lib/email/email-service';

// Admin user interface
interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// GET - Fetch all admin users
export async function GET() {
  try {
    const query = 'SELECT id, first_name, last_name, email, phone, is_admin, is_active, created_at, updated_at FROM users WHERE is_admin = 1 ORDER BY created_at DESC';
    const [rows] = await pool.execute(query);
    
    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('MySQL Admin API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch admin users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new admin user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.email || !body.password || !body.first_name || !body.last_name) {
      return NextResponse.json(
        { error: 'Email, password, first name, and last name are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [body.email]
    );
    const existingUsersArray = existingUsers as any[];
    
    if (existingUsersArray.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);
    
    // Insert new admin user
    const [result] = await pool.execute(
      `INSERT INTO users (
         first_name, last_name, email, phone, password_hash, 
         is_admin, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.first_name,
        body.last_name,
        body.email,
        body.phone || null,
        hashedPassword,
        true, // is_admin = true
        true  // is_active = true
      ]
    );
    const insertResult = result as any;
    
    // Send account creation success email
    const emailSent = await sendAccountCreationSuccessEmail(
      body.email,
      body.first_name,
      'admin'
    );
    if (!emailSent) {
      console.warn('⚠️ Failed to send account creation email, but admin user was created successfully');
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: insertResult.insertId,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone || null,
        is_active: true
      },
      emailSent
    }, { status: 201 });
  } catch (error) {
    console.error('MySQL Admin API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create admin user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update admin user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Admin user ID is required' },
        { status: 400 }
      );
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (updateData.first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(updateData.first_name);
    }
    
    if (updateData.last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(updateData.last_name);
    }
    
    if (updateData.email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      
      // Check if email already exists for other users
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updateData.email, id]
      );
      const existingUsersArray = existingUsers as any[];
      
      if (existingUsersArray.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
      
      updateFields.push('email = ?');
      updateValues.push(updateData.email);
    }
    
    if (updateData.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(updateData.phone);
    }
    
    if (updateData.password !== undefined) {
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(updateData.password, saltRounds);
      updateFields.push('password_hash = ?');
      updateValues.push(hashedPassword);
    }
    
    if (updateData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(updateData.is_active);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Add updated_at
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);
    
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND is_admin = 1`;
    
    const [result] = await pool.execute(updateQuery, updateValues);
    const updateResult = result as any;
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Admin user not found or update failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin user updated successfully'
    });
  } catch (error) {
    console.error('MySQL Admin API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update admin user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate admin user (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Admin user ID is required' },
        { status: 400 }
      );
    }
    
    // Deactivate admin user (set is_active to false)
    const [result] = await pool.execute(
      'UPDATE users SET is_active = 0 WHERE id = ? AND is_admin = 1',
      [id]
    );
    const deleteResult = result as any;
    
    if (deleteResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Admin user not found or already deactivated' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin user deactivated successfully'
    });
  } catch (error) {
    console.error('MySQL Admin API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to deactivate admin user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}