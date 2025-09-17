import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database/mysql';

// User interface for gkicks users table
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_admin: boolean;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

// GET - Fetch all users from gkicks users table
export async function GET() {
  try {
    const query = `
      SELECT id, email, first_name, last_name, phone, 
             is_admin, is_active, email_verified, 
             created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query);
    
    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('GKicks Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new user in gkicks users table
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
    
    // Check if email already exists in users table
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
    
    // Insert new user
    const [result] = await pool.execute(
      `INSERT INTO users (
         email, password_hash, first_name, last_name, phone, 
         is_admin, is_active, email_verified
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.email,
        hashedPassword,
        body.first_name,
        body.last_name,
        body.phone || null,
        body.is_admin || false,
        true, // is_active
        false // email_verified
      ]
    );
    
    const insertResult = result as any;
    
    return NextResponse.json({
      success: true,
      data: {
        id: insertResult.insertId,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        is_admin: body.is_admin || false,
        is_active: true
      },
      message: 'User created successfully'
    });
    
  } catch (error) {
    console.error('GKicks Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (body.first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(body.first_name);
    }
    
    if (body.last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(body.last_name);
    }
    
    if (body.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(body.phone);
    }
    
    if (body.is_admin !== undefined) {
      updateFields.push('is_admin = ?');
      updateValues.push(body.is_admin);
    }
    
    if (body.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(body.is_active);
    }
    
    if (body.email_verified !== undefined) {
      updateFields.push('email_verified = ?');
      updateValues.push(body.email_verified);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(body.id);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, updateValues);
    const updateResult = result as any;
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('GKicks Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Soft delete by setting is_active to false
    const [result] = await pool.execute(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    const deleteResult = result as any;
    
    if (deleteResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    });
    
  } catch (error) {
    console.error('GKicks Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}