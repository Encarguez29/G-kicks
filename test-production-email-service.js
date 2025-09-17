// Test the actual email service used by the application
require('dotenv').config({ path: '.env.production' });

// Import the actual email service (we'll use require for JS compatibility)
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Replicate the createTransporter function from the TypeScript service
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

// Send verification email (replicate the actual function)
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"GKICKS Shop" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: email,
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
              <h2>Hi ${firstName}!</h2>
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
        
        Hi ${firstName}!
        
        Thank you for creating an account with GKICKS Shop. To complete your registration, please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours for security reasons.
        
        If you didn't create an account with GKICKS Shop, please ignore this email.
        
        © 2024 GKICKS Shop. All rights reserved.
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
};

// Test the email service
async function testProductionEmailService() {
  console.log('🧪 Testing Production Email Service');
  console.log('===================================');
  
  console.log('📋 Environment Variables:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('GMAIL_USER:', process.env.GMAIL_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
  console.log('');
  
  const testEmail = 'creeck2@gmail.com';
  const testFirstName = 'Test User';
  const testToken = generateVerificationToken();
  
  console.log('Test Email:', testEmail);
  console.log('Test Token:', testToken);
  console.log('\nSending verification email...');
  
  const result = await sendVerificationEmail(testEmail, testFirstName, testToken);
  
  if (result) {
    console.log('\n✅ Production email service test PASSED!');
    console.log('Check your Gmail inbox for the verification email.');
  } else {
    console.log('\n❌ Production email service test FAILED!');
  }
  
  process.exit(result ? 0 : 1);
}

// Run the test
testProductionEmailService();