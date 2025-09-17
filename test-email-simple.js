require('dotenv').config({ path: '.env.production' });
const nodemailer = require('nodemailer');

async function testEmailSending() {
  try {
    console.log('🔍 Testing email configuration...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
      },
    });
    
    console.log('📧 SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      from: process.env.SMTP_FROM
    });
    
    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection verified!');
    
    // Send test verification email
    const testEmail = 'test@gmail.com';
    const verificationToken = 'test-token-123';
    const verificationUrl = `http://localhost:3001/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"GKICKS Shop" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: testEmail,
      subject: 'Test Verification Email - GKICKS Shop',
      html: `
        <h1>Test Verification Email</h1>
        <p>Hi Test User!</p>
        <p>This is a test verification email.</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>Link: ${verificationUrl}</p>
      `,
      text: `Test verification email. Link: ${verificationUrl}`
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmailSending();