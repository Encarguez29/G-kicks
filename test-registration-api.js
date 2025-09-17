require('dotenv').config({ path: '.env.production' });
const express = require('express');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gkicks',
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined,
  connectionLimit: 10,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Execute query function
async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('❌ MySQL query failed:', error);
    throw error;
  }
}

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Send verification email
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"GKICKS Shop" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address - GKICKS Shop',
      html: `
        <h1>Welcome to GKICKS Shop!</h1>
        <p>Hi ${firstName}!</p>
        <p>Thank you for creating an account. Please verify your email address:</p>
        <a href="${verificationUrl}">Verify Email Address</a>
        <p>Link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `,
      text: `Welcome to GKICKS Shop! Hi ${firstName}! Please verify your email: ${verificationUrl}`
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
};

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  console.log('🔍 Registration request received');
  console.log('📋 Request body:', req.body);
  
  try {
    const { email, password, firstName, lastName } = req.body;
    console.log('📝 Extracted fields:', { email, firstName, lastName, passwordLength: password?.length });

    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ error: 'Invalid email format' });
    }
    console.log('✅ Email format valid');

    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const existingUserArray = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUserArray.length > 0) {
      console.log('❌ User already exists');
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    console.log('✅ User does not exist, proceeding...');

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed successfully');

    // Create user
    console.log('👤 Creating user...');
    const insertResult = await executeQuery(
      'INSERT INTO users (email, password_hash, first_name, last_name, is_admin, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [email, hashedPassword, firstName, lastName, false, false]
    );
    const userId = insertResult.insertId;
    console.log('✅ User created with ID:', userId);

    // Generate verification token
    console.log('🎫 Generating verification token...');
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    console.log('✅ Verification token generated');

    // Store verification token
    console.log('💾 Storing verification token...');
    await executeQuery(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, verificationToken, expiresAt]
    );
    console.log('✅ Verification token stored');

    // Send verification email
    console.log('📧 Sending verification email...');
    const emailSent = await sendVerificationEmail(email, firstName, verificationToken);
    if (!emailSent) {
      console.warn('⚠️ Failed to send verification email, but user was created');
    }

    console.log('🎉 Registration completed successfully!');
    
    // Return success response
    const response = {
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        email_verified: false
      },
      requiresVerification: true,
      emailSent
    };
    
    console.log('📤 Sending response:', response);
    return res.json(response);

  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test registration server running on port ${PORT}`);
  console.log(`📋 Database config:`, {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    passwordSet: !!dbConfig.password
  });
});