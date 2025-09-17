const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixStaffJWTToken() {
  let connection;
  
  try {
    console.log('🔧 Fixing Staff JWT Token...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gkicks'
    });

    console.log('✅ Database connected');

    // Check staff user in admin_users table
    const [adminUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE email = ? AND is_active = 1',
      ['gkicksstaff@gmail.com']
    );

    if (adminUsers.length === 0) {
      console.log('❌ Staff user not found in admin_users table');
      return;
    }

    const staffUser = adminUsers[0];
    console.log('✅ Staff user found:', {
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      is_active: staffUser.is_active
    });

    // Verify password
    const isValidPassword = await bcrypt.compare('gkicksstaff_123', staffUser.password_hash);
    console.log('✅ Password verification:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return;
    }

    // Generate JWT token with correct staff role
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      {
        userId: staffUser.id,
        email: staffUser.email,
        role: staffUser.role // This should be 'staff'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎫 JWT Token generated successfully');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verification successful');
    console.log('Decoded payload:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      exp: new Date(decoded.exp * 1000).toLocaleString()
    });

    console.log('\n🔑 COPY THIS TOKEN TO YOUR BROWSER:');
    console.log('1. Open browser console (F12)');
    console.log('2. Run: localStorage.setItem("auth_token", "' + token + '")');
    console.log('3. Refresh the POS page');
    console.log('\nOR use the debug-token-flow.html page to generate it automatically.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixStaffJWTToken();