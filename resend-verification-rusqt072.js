const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.production' });

async function resendVerificationEmail() {
  let connection;
  
  try {
    // Database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    });
    
    console.log('🔍 Connected to database');
    
    // Find user
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, email_verified FROM users WHERE email = ?',
      ['rusqt072@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log(`✅ User found: ${user.email} ID: ${user.id}`);
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Delete any existing tokens for this user
    await connection.execute(
      'DELETE FROM email_verification_tokens WHERE user_id = ?',
      [user.id]
    );
    
    // Insert new verification token (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await connection.execute(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, verificationToken, expiresAt]
    );
    
    // Update user email_verified status
    await connection.execute(
      'UPDATE users SET email_verified = 0 WHERE id = ?',
      [user.id]
    );
    
    console.log('✅ New verification token generated');
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
      },
    });
    
    // Test SMTP connection
    console.log('🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    // Create verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
    
    // Email content
    const mailOptions = {
      from: process.env.SMTP_FROM || `"GKICKS Shop" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email Address - GKICKS Shop',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to GKICKS Shop!</h1>
              <p>Your premium sneaker destination</p>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name}!</h2>
              <p>Thank you for creating an account with GKICKS Shop. To complete your registration and start shopping for premium sneakers, please verify your email address.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
              
              <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
              
              <p>If you didn't create an account with GKICKS Shop, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 GKICKS Shop. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to GKICKS Shop!
        
        Hi ${user.first_name}!
        
        Thank you for creating an account with GKICKS Shop. To complete your registration, please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours for security reasons.
        
        If you didn't create an account with GKICKS Shop, please ignore this email.
        
        © 2024 GKICKS Shop. All rights reserved.
      `
    };
    
    // Send email
    console.log('📧 Sending verification email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Verification email sent successfully!');
    console.log(`📧 Message ID: <${info.messageId}>`);
    console.log(`🔗 Verification URL: ${verificationUrl}`);
    console.log('📬 Check your Gmail inbox and spam folder!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resendVerificationEmail();