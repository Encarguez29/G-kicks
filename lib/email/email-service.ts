import nodemailer from 'nodemailer'
import crypto from 'crypto'

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
    },
  })
}

// Generate verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationToken: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    
    const verificationUrl = `http://72.60.211.237/verify-email?token=${verificationToken}`
    
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
              <p>© 2024-2025 GKICKS Shop. All rights reserved.</p>
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
        
        © 2024-2025 GKICKS Shop. All rights reserved.
      `
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Verification email sent successfully to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
    return false
  }
}

// Send welcome email after verification
export const sendWelcomeEmail = async (
  email: string,
  firstName: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"GKICKS Shop" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Welcome to GKICKS Shop! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to GKICKS</title>
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
              <h1>🎉 Welcome to GKICKS Shop!</h1>
              <p>Your journey to premium sneakers starts here</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>Congratulations! Your email has been verified and your GKICKS Shop account is now active.</p>
              
              <p>You can now:</p>
              <ul>
                <li>Browse our premium sneaker collection</li>
                <li>Add items to your wishlist</li>
                <li>Make secure purchases</li>
                <li>Track your orders</li>
                <li>Manage your profile</li>
              </ul>
              
              <a href="http://72.60.211.237" class="button">Start Shopping</a>
              
              <p>Thank you for choosing GKICKS Shop for your sneaker needs!</p>
            </div>
            <div class="footer">
              <p>© 2024-2025 GKICKS Shop. All rights reserved.</p>
              <p>Need help? Contact us at kurab1983@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to GKICKS Shop!
        
        Hi ${firstName}!
        
        Congratulations! Your email has been verified and your GKICKS Shop account is now active.
        
        You can now browse our premium sneaker collection, add items to your wishlist, make secure purchases, track your orders, and manage your profile.
        
        Visit: http://72.60.211.237
        
        Thank you for choosing GKICKS Shop!
        
        © 2024-2025 GKICKS Shop. All rights reserved.
      `
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Welcome email sent successfully to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    return false
  }
}