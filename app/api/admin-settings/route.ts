import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks'
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

function getAdminFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - Retrieve admin settings
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    const admin = getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const settingKey = searchParams.get('key');
    
    connection = await getConnection();
    
    let query: string;
    let params: any[];
    
    if (settingKey) {
      // Get specific setting
      query = 'SELECT setting_key, setting_value FROM admin_settings WHERE admin_user_id = ? AND setting_key = ?';
      params = [admin.id, settingKey];
    } else {
      // Get all settings for admin
      query = 'SELECT setting_key, setting_value FROM admin_settings WHERE admin_user_id = ?';
      params = [admin.id];
    }
    
    const [rows] = await connection.execute(query, params);
    
    if (settingKey) {
      const setting = (rows as any[])[0];
      if (!setting) {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
      }
      return NextResponse.json({
        key: setting.setting_key,
        value: setting.setting_value
      });
    } else {
      // Return all settings as an object
      const settings: Record<string, any> = {};
      (rows as any[]).forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      return NextResponse.json({ settings });
    }
    
  } catch (error) {
    console.error('Error retrieving admin settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// POST - Save admin settings
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    const admin = getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }
    
    connection = await getConnection();
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both insert and update
    const query = `
      INSERT INTO admin_settings (admin_user_id, setting_key, setting_value) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      setting_value = VALUES(setting_value), 
      updated_at = CURRENT_TIMESTAMP
    `;
    
    await connection.execute(query, [admin.id, key, JSON.stringify(value)]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin setting saved successfully',
      key,
      value
    });
    
  } catch (error) {
    console.error('Error saving admin setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// PUT - Update multiple admin settings at once
export async function PUT(request: NextRequest) {
  let connection;
  
  try {
    const admin = getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { settings } = body;
    
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }
    
    connection = await getConnection();
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      const query = `
        INSERT INTO admin_settings (admin_user_id, setting_key, setting_value) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value), 
        updated_at = CURRENT_TIMESTAMP
      `;
      
      for (const [key, value] of Object.entries(settings)) {
        await connection.execute(query, [admin.id, key, JSON.stringify(value)]);
      }
      
      await connection.commit();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin settings saved successfully',
        count: Object.keys(settings).length
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error saving admin settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// DELETE - Delete a specific admin setting
export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    const admin = getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const settingKey = searchParams.get('key');
    
    if (!settingKey) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }
    
    connection = await getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM admin_settings WHERE admin_user_id = ? AND setting_key = ?',
      [admin.id, settingKey]
    );
    
    const affectedRows = (result as any).affectedRows;
    
    if (affectedRows === 0) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin setting deleted successfully',
      key: settingKey
    });
    
  } catch (error) {
    console.error('Error deleting admin setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}