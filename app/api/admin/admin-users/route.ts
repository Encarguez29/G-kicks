import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database/mysql';
import { sendAccountCreationSuccessEmail } from '@/lib/email/email-service';

// Admin user interface for admin_users table
interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'staff' | 'manager';
  permissions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// GET - Fetch all admin users from admin_users table
export async function GET() {
  try {
    const query = `
      SELECT id, username, email, first_name, last_name, role, permissions, 
             is_active, last_login_at, created_at, updated_at 
      FROM admin_users 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query);
    
    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Admin Users API Error:', error);
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

// POST - Create new admin user in admin_users table
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
    
    // Check if email already exists in admin_users table
    const [existingUsers] = await pool.execute(
      'SELECT id FROM admin_users WHERE email = ?',
      [body.email]
    );
    const existingUsersArray = existingUsers as any[];
    
    if (existingUsersArray.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists in admin users' },
        { status: 409 }
      );
    }
    
    // Generate username from email if not provided
    const username = body.username || body.email.split('@')[0];
    
    // Check if username already exists
    const [existingUsernames] = await pool.execute(
      'SELECT id FROM admin_users WHERE username = ?',
      [username]
    );
    const existingUsernamesArray = existingUsernames as any[];
    
    if (existingUsernamesArray.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);
    
    // Set default permissions based on role
    let permissions = {};
    const role = body.role || 'staff';
    
    switch (role) {
      case 'admin':
        permissions = { all: true };
        break;
      case 'staff':
        permissions = { orders: true, pos: true };
        break;
      case 'manager':
        permissions = { orders: true, pos: true, inventory: true, analytics: true };
        break;
      default:
        permissions = { orders: true, pos: true };
    }
    
    // Insert new admin user
    const [result] = await pool.execute(
      `INSERT INTO admin_users (
         username, email, password_hash, first_name, last_name, 
         role, permissions, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        body.email,
        hashedPassword,
        body.first_name,
        body.last_name,
        role,
        JSON.stringify(permissions),
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
        username: username,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        role: role,
        permissions: permissions,
        is_active: true
      },
      message: 'Admin user created successfully',
      emailSent
    });
    
  } catch (error) {
    console.error('Admin Users API Error:', error);
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
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Admin user ID is required' },
        { status: 400 }
      );
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (body.first_name) {
      updateFields.push('first_name = ?');
      updateValues.push(body.first_name);
    }
    
    if (body.last_name) {
      updateFields.push('last_name = ?');
      updateValues.push(body.last_name);
    }
    
    if (body.email) {
      updateFields.push('email = ?');
      updateValues.push(body.email);
    }
    
    if (body.role) {
      updateFields.push('role = ?');
      updateValues.push(body.role);
    }
    
    if (body.permissions) {
      updateFields.push('permissions = ?');
      updateValues.push(JSON.stringify(body.permissions));
    }
    
    if (body.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(body.is_active);
    }
    
    if (body.password) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(body.password, saltRounds);
      updateFields.push('password_hash = ?');
      updateValues.push(hashedPassword);
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(body.id);
    
    const query = `UPDATE admin_users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, updateValues);
    const updateResult = result as any;
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin user updated successfully'
    });
    
  } catch (error) {
    console.error('Admin Users API Error:', error);
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

// DELETE - Soft delete admin user
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
    
    // Soft delete by setting is_active to false
    const [result] = await pool.execute(
      'UPDATE admin_users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    const deleteResult = result as any;
    
    if (deleteResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin user deactivated successfully'
    });
    
  } catch (error) {
    console.error('Admin Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete admin user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}