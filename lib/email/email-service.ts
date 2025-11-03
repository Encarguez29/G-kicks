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

// Generate short verification code (6 digits)
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send verification email with code
export const sendVerificationEmailWithCode = async (
  email: string,
  firstName: string,
  verificationCode: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    
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
            .code-box { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; }
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
              
              <p>Enter this verification code on the website:</p>
              
              <div class="code-box">${verificationCode}</div>
              
              <p><strong>Important:</strong> This verification code will expire in 24 hours for security reasons.</p>
              
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
        
        Thank you for creating an account with GKICKS Shop. To complete your registration, please verify your email address using this code:
        
        Verification Code: ${verificationCode}
        
        This verification code will expire in 24 hours for security reasons.
        
        If you didn't create an account with GKICKS Shop, please ignore this email.
        
        © 2024-2025 GKICKS Shop. All rights reserved.
      `
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Verification email with code sent successfully to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending verification email with code:', error)
    return false
  }
}

// Send verification email with token
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

// Send password reset code email
export const sendPasswordResetCodeEmail = async (
  email: string,
  firstName: string,
  resetCode: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"GKICKS Shop" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Code - GKICKS Shop',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
              <p>GKICKS Shop</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>We received a request to reset your password for your GKICKS Shop account.</p>
              
              <div class="code-box">
                <p><strong>Your password reset code is:</strong></p>
                <div class="code">${resetCode}</div>
              </div>
              
              <p>Enter this code on the password reset page to create a new password.</p>
              
              <div class="warning">
                <p><strong>⚠️ Important:</strong></p>
                <ul>
                  <li>This code will expire in 10 minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this code with anyone</li>
                </ul>
              </div>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>Best regards,<br>The GKICKS Shop Team</p>
            </div>
            <div class="footer">
              <p>© 2024-2025 GKICKS Shop. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Code - GKICKS Shop
        
        Hi ${firstName}!
        
        We received a request to reset your password for your GKICKS Shop account.
        
        Your password reset code is: ${resetCode}
        
        Enter this code on the password reset page to create a new password.
        
        Important:
        - This code will expire in 10 minutes
        - If you didn't request this reset, please ignore this email
        - Never share this code with anyone
        
        If you have any questions, please contact our support team.
        
        Best regards,
        The GKICKS Shop Team
        
        © 2024-2025 GKICKS Shop. All rights reserved.
      `
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Password reset code email sent successfully to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending password reset code email:', error)
    return false
  }
}

// Send account creation success email
export const sendAccountCreationSuccessEmail = async (
  email: string,
  firstName: string,
  accountType: 'user' | 'admin' = 'user'
): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    
    const isAdmin = accountType === 'admin'
    const accountTypeText = isAdmin ? 'Admin Account' : 'Account'
    const welcomeMessage = isAdmin 
      ? 'Your admin account has been successfully created! You now have access to the GKICKS Shop admin panel.'
      : 'Your account has been successfully created! Welcome to GKICKS Shop - your premium sneaker destination.'
    
    const adminFeatures = isAdmin ? `
      <p>As an admin user, you now have access to:</p>
      <ul>
        <li>Admin Dashboard</li>
        <li>User Management</li>
        <li>Order Management</li>
        <li>Inventory Management</li>
        <li>Analytics and Reports</li>
        <li>POS System</li>
      </ul>
    ` : `
      <p>You can now:</p>
      <ul>
        <li>Browse our premium sneaker collection</li>
        <li>Add items to your wishlist</li>
        <li>Make secure purchases</li>
        <li>Track your orders</li>
        <li>Manage your profile</li>
      </ul>
    `
    
    const loginUrl = isAdmin ? 'http://72.60.211.237/admin/login' : 'http://72.60.211.237/auth'
    const buttonText = isAdmin ? 'Access Admin Panel' : 'Start Shopping'
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"GKICKS Shop" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: email,
      subject: `${accountTypeText} Created Successfully - GKICKS Shop`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Created Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ${accountTypeText} Created!</h1>
              <p>GKICKS Shop</p>
            </div>
            <div class="content">
              <div class="success-badge">✅ Success!</div>
              
              <h2>Hi ${firstName}!</h2>
              <p>${welcomeMessage}</p>
              
              ${adminFeatures}
              
              <div class="info-box">
                <p><strong>📧 Account Details:</strong></p>
                <p>Email: ${email}</p>
                <p>Account Type: ${isAdmin ? 'Administrator' : 'Customer'}</p>
                <p>Status: Active</p>
              </div>
              
              <a href="${loginUrl}" class="button">${buttonText}</a>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Thank you for choosing GKICKS Shop!</p>
              
              <p>Best regards,<br>The GKICKS Shop Team</p>
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
        ${accountTypeText} Created Successfully - GKICKS Shop
        
        Hi ${firstName}!
        
        ${welcomeMessage}
        
        Account Details:
        - Email: ${email}
        - Account Type: ${isAdmin ? 'Administrator' : 'Customer'}
        - Status: Active
        
        ${isAdmin ? 'Access your admin panel at: ' + loginUrl : 'Start shopping at: ' + loginUrl}
        
        If you have any questions or need assistance, please contact our support team.
        
        Thank you for choosing GKICKS Shop!
        
        Best regards,
        The GKICKS Shop Team
        
        © 2024-2025 GKICKS Shop. All rights reserved.
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`✅ Account creation success email sent successfully to: ${email} (${accountType})`)
    return true
  } catch (error) {
    console.error('❌ Error sending account creation success email:', error)
    return false
  }
}