require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  try {
    console.log('🧪 Testing email configuration with local credentials...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    await transporter.verify();
    console.log('✅ Email configuration is valid!');
    
    // Send a test verification email
    const verificationToken = 'test-token-' + Date.now();
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://72.60.211.237'}/verify-email?token=${verificationToken}`;
    
    const testEmail = {
      from: `"GKICKS Shop" <${process.env.GMAIL_USER}>`,
      to: 'gkcksdmn@gmail.com',
      subject: 'Email Verification Test - GKICKS Shop',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">🎉 Email Verification Test</h2>
          <p>This is a test email to verify that the GKICKS Shop email verification system is working properly.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email (Test)
            </a>
          </div>
          <p><strong>Verification URL:</strong> ${verificationUrl}</p>
          <p><strong>Server:</strong> ${process.env.NEXT_PUBLIC_BASE_URL || 'http://72.60.211.237'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Status:</strong> ✅ Email delivery is functional</p>
        </div>
      `
    };
    
    await transporter.sendMail(testEmail);
    console.log('📧 Test verification email sent successfully to gkcksdmn@gmail.com');
    console.log('🔗 Verification URL:', verificationUrl);
    console.log('📬 Please check your inbox and spam folder');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmailConfig();