require('dotenv').config({ path: '.env.production' });
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

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

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
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

// Test full registration flow
async function testRegistrationFlow() {
  try {
    console.log('🔍 Testing full registration flow...');
    
    const testData = {
      email: 'testfull@gmail.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks',
      port: process.env.MYSQL_PORT || 3306
    });
    
    console.log('✅ Database connected');
    
    // Check if user exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [testData.email]
    );
    
    if (existingUsers.length > 0) {
      console.log('⚠️ User already exists, deleting for test...');
      await connection.execute('DELETE FROM users WHERE email = ?', [testData.email]);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testData.password, 12);
    console.log('✅ Password hashed');
    
    // Create user
    const [insertResult] = await connection.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name, is_admin, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [testData.email, hashedPassword, testData.firstName, testData.lastName, false, false]
    );
    
    const userId = insertResult.insertId;
    console.log('✅ User created with ID:', userId);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Store verification token
    await connection.execute(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, verificationToken, expiresAt]
    );
    
    console.log('✅ Verification token stored');
    
    // Send verification email
    const emailSent = await sendVerificationEmail(testData.email, testData.firstName, verificationToken);
    
    await connection.end();
    
    console.log('🎉 Registration flow completed successfully!');
    console.log('📧 Email sent:', emailSent);
    
  } catch (error) {
    console.error('❌ Registration flow failed:', error);
  }
}

testRegistrationFlow();