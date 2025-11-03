import nodemailer from 'nodemailer';

// Email configuration interface
interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    barangay?: string;
  };
}

// Create transporter with environment variables
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Generate HTML for order receipt
function generateOrderReceiptHTML(orderData: OrderEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Receipt - GKICKS</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
      </div>

      <!-- Order Info -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin-top: 0; color: #333;">Order Details</h2>
        <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderData.orderDate}</p>
        <p style="margin: 5px 0;"><strong>Customer:</strong> ${orderData.customerName}</p>
      </div>

      <!-- Items -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Items Ordered</h3>
        ${orderData.items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 5px 0; color: #333;">${item.name}</h4>
              <p style="margin: 0; color: #666; font-size: 14px;">Quantity: ${item.quantity}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: bold; color: #667eea;">₱${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Order Summary -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin-top: 0; color: #333;">Order Summary</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>Subtotal:</span>
          <span>₱${orderData.subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>Tax:</span>
          <span>₱${orderData.tax.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span>Shipping:</span>
          <span>₱${orderData.shipping.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #667eea; border-top: 2px solid #ddd; padding-top: 15px;">
          <span>Total:</span>
          <span>₱${orderData.total.toFixed(2)}</span>
        </div>
      </div>

      <!-- Shipping Address -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin-top: 0; color: #333;">Shipping Address</h3>
        <p style="margin: 5px 0;">${orderData.shippingAddress.street}</p>
        ${orderData.shippingAddress.barangay ? `<p style="margin: 5px 0;">${orderData.shippingAddress.barangay}</p>` : ''}
        <p style="margin: 5px 0;">${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}</p>
        <p style="margin: 5px 0;">${orderData.shippingAddress.country}</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; color: #666;">
        <p style="margin: 0 0 10px 0;">Thank you for choosing GKICKS!</p>
        <p style="margin: 0; font-size: 14px;">If you have any questions, please contact us at kurab1983@gmail.com</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin: 0; font-size: 12px; color: #999;">© 2024 GKICKS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send order receipt email
export async function sendOrderReceipt(orderData: OrderEmailData): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    // Verify transporter configuration
    await transporter.verify();
    
    const mailOptions = {
      from: {
        name: 'GKICKS',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gkicks.com',
      },
      to: orderData.customerEmail,
      subject: `Order Confirmation - ${orderData.orderNumber} | GKICKS`,
      html: generateOrderReceiptHTML(orderData),
      text: `
Order Confirmation - GKICKS

Thank you for your purchase, ${orderData.customerName}!

Order Number: ${orderData.orderNumber}
Order Date: ${orderData.orderDate}
Subtotal: ₱${orderData.subtotal.toFixed(2)}
Tax: ₱${orderData.tax.toFixed(2)}
Shipping: ₱${orderData.shipping.toFixed(2)}
Total: ₱${orderData.total.toFixed(2)}

Your order has been successfully placed and is being processed.

Thank you for choosing GKICKS!
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order receipt email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send order receipt email:', error);
    return false;
  }
}

// Send order status update notification email
export async function sendOrderStatusUpdateEmail(
  customerEmail: string, 
  orderNumber: string, 
  status: string,
  trackingNumber?: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    // Verify transporter configuration
    await transporter.verify();

    // Get status-specific configuration
    const getStatusConfig = (status: string) => {
      switch (status.toLowerCase()) {
        case 'pending':
          return {
            emoji: '⏳',
            title: 'Order Received',
            message: 'We have received your order and it is being reviewed.',
            color: '#ffa726',
            nextSteps: [
              'Your order is being verified',
              'Payment confirmation is being processed',
              'You will receive an update once confirmed'
            ]
          };
        case 'confirmed':
          return {
            emoji: '✅',
            title: 'Order Confirmed',
            message: 'Your order has been confirmed and is being prepared.',
            color: '#66bb6a',
            nextSteps: [
              'Your order is now in our fulfillment queue',
              'Items are being picked and packed',
              'You will receive shipping details soon'
            ]
          };
        case 'processing':
          return {
            emoji: '📦',
            title: 'Order Processing',
            message: 'Your order is currently being processed and prepared for shipment.',
            color: '#42a5f5',
            nextSteps: [
              'Items are being carefully packed',
              'Quality check is being performed',
              'Shipping label is being prepared'
            ]
          };
        case 'shipped':
          return {
            emoji: '🚚',
            title: 'Order Shipped',
            message: 'Great news! Your order has been shipped and is on its way to you.',
            color: '#667eea',
            nextSteps: [
              'Your package is in transit',
              'Track your package using the tracking number',
              'Mark as delivered once you receive it'
            ]
          };
        case 'cancelled':
          return {
            emoji: '❌',
            title: 'Order Cancelled',
            message: 'Your order has been cancelled as requested.',
            color: '#ef5350',
            nextSteps: [
              'Refund will be processed within 3-5 business days',
              'You will receive a refund confirmation email',
              'Contact us if you have any questions'
            ]
          };
        default:
          return {
            emoji: '📋',
            title: 'Order Update',
            message: `Your order status has been updated to: ${status}`,
            color: '#78909c',
            nextSteps: [
              'Check your order details for more information',
              'Contact us if you have any questions'
            ]
          };
      }
    };

    const config = getStatusConfig(status);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Update - GKICKS</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); border-radius: 10px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${config.emoji} ${config.title}</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">${config.message}</p>
        </div>

        <!-- Order Info -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="margin-top: 0; color: #333;">Order Details</h2>
          <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="background: ${config.color}20; color: ${config.color}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${status.toUpperCase()}</span></p>
          ${trackingNumber && status.toLowerCase() === 'shipped' ? `<p style="margin: 5px 0;"><strong>Tracking Number:</strong> <span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${trackingNumber}</span></p>` : ''}
        </div>

        <!-- What's Next -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="margin-top: 0; color: #333;">What's Next?</h3>
          <div style="margin-bottom: 15px;">
            ${config.nextSteps.map((step, index) => `
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="background: ${config.color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: bold;">${index + 1}</span>
                <span>${step}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/orders" 
             style="display: inline-block; background: ${config.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">
            View Order Details
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; color: #666;">
          <p style="margin: 0 0 10px 0;">Thank you for choosing GKICKS!</p>
          <p style="margin: 0; font-size: 14px;">If you have any questions, please contact us at kurab1983@gmail.com</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="margin: 0; font-size: 12px; color: #999;">© 2024 GKICKS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'GKICKS',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gkicks.com',
      },
      to: customerEmail,
      subject: `${config.emoji} Order ${orderNumber} - ${config.title} | GKICKS`,
      html: htmlContent,
      text: `
Order Update - GKICKS

${config.title}
${config.message}

Order Number: ${orderNumber}
Status: ${status.toUpperCase()}
${trackingNumber && status.toLowerCase() === 'shipped' ? `Tracking Number: ${trackingNumber}` : ''}

What's Next:
${config.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Visit your orders page to view more details: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/orders

Thank you for choosing GKICKS!
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order status update email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send order status update email:', error);
    return false;
  }
}

// Send order shipped notification email
export async function sendOrderShippedEmail(customerEmail: string, orderNumber: string, trackingNumber?: string): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    // Verify transporter configuration
    await transporter.verify();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped - GKICKS</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📦 Order Shipped!</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your package is on its way</p>
        </div>

        <!-- Order Info -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="margin-top: 0; color: #333;">Order Details</h2>
          <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
          ${trackingNumber ? `<p style="margin: 5px 0;"><strong>Tracking Number:</strong> <span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${trackingNumber}</span></p>` : ''}
        </div>

        <!-- What's Next -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="margin-top: 0; color: #333;">What's Next?</h3>
          <div style="margin-bottom: 15px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: bold;">1</span>
              <span>Your package is being prepared for delivery</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: bold;">2</span>
              <span>Track your package using the tracking number above</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; font-weight: bold;">3</span>
              <span>Once delivered, mark it as received in your account</span>
            </div>
          </div>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/orders" 
             style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">
            View Order Details
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; color: #666;">
          <p style="margin: 0 0 10px 0;">Thank you for choosing GKICKS!</p>
          <p style="margin: 0; font-size: 14px;">If you have any questions, please contact us at kurab1983@gmail.com</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="margin: 0; font-size: 12px; color: #999;">© 2024 GKICKS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'GKICKS',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gkicks.com',
      },
      to: customerEmail,
      subject: `📦 Your Order ${orderNumber} Has Been Shipped! | GKICKS`,
      html: htmlContent,
      text: `
Your Order Has Been Shipped! - GKICKS

Great news! Your order ${orderNumber} has been shipped and is on its way to you.

${trackingNumber ? `Tracking Number: ${trackingNumber}` : ''}

You can now track your package and mark it as delivered once you receive it.

Visit your orders page to view more details: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/orders

Thank you for choosing GKICKS!
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order shipped email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send order shipped email:', error);
    return false;
  }
}

// Send delivery confirmation email to admin/staff
export async function sendDeliveryConfirmationEmail(adminEmail: string, orderNumber: string, customerName: string): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminEmail,
      subject: `🚚 Order ${orderNumber} Delivered - GKICKS`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Order Delivered - GKICKS Admin</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">📦 Order Delivered</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GKICKS Admin Notification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #28a745; margin-top: 0;">✅ Delivery Confirmed</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #333;">Order Details:</h3>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">DELIVERED</span></p>
              <p><strong>Delivered On:</strong> ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

Admin Actions Completed:
- Order status updated to "Delivered"
- Customer notified of successful delivery
- Order marked as complete in system

View order details in admin panel: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/admin/orders

GKICKS Admin System
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Delivery confirmation email sent to admin successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send delivery confirmation email to admin:', error);
    return false;
  }
}

// Send staff notification email for new orders
export async function sendStaffNotification(notificationData: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  itemCount: number;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
}): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const staffEmail = process.env.STAFF_EMAIL || process.env.SMTP_USER;
    if (!staffEmail) {
      console.error('Staff email not configured');
      return false;
    }

    const itemsHTML = notificationData.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; text-align: left;">${item.name}</td>
        <td style="padding: 10px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; text-align: center;">${item.size || 'N/A'}</td>
        <td style="padding: 10px; text-align: center;">${item.color || 'N/A'}</td>
        <td style="padding: 10px; text-align: right;">₱${item.price.toFixed(2)}</td>
      </tr>
    `).join('');
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: staffEmail,
      subject: `🛍️ New Order #${notificationData.orderNumber} - GKICKS`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Order Notification - GKICKS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🛍️ New Order Received</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GKICKS Staff Notification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #007bff; margin-top: 0;">Order Summary</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0; color: #333;">Order Information:</h3>
              <p><strong>Order Number:</strong> ${notificationData.orderNumber}</p>
              <p><strong>Customer:</strong> ${notificationData.customerName}</p>
              <p><strong>Email:</strong> ${notificationData.customerEmail}</p>
              <p><strong>Order Date:</strong> ${notificationData.orderDate}</p>
              <p><strong>Total Items:</strong> ${notificationData.itemCount}</p>
              <p><strong>Total Amount:</strong> <span style="color: #28a745; font-weight: bold; font-size: 18px;">₱${notificationData.total.toFixed(2)}</span></p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Items Ordered:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Color</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="margin-top: 0; color: #1976d2;">Next Steps:</h3>
              <p style="margin: 10px 0;">1. Process the order in your admin panel</p>
              <p style="margin: 10px 0;">2. Prepare items for shipping</p>
              <p style="margin: 10px 0;">3. Update order status when shipped</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/admin/orders" 
                 style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold;">
                View Order in Admin Panel
              </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                This is an automated notification from GKICKS Order Management System
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Staff notification email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send staff notification email:', error);
    return false;
  }
}

// Send email recovery notification
export async function sendEmailRecoveryNotification(
  email: string,
  firstName: string,
  userEmail: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'GKICKS',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gkicks.com',
      },
      to: email,
      subject: '🔐 Account Recovery Information - GKICKS',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Account Recovery - GKICKS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Account Recovery</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GKICKS Account Information</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #28a745; margin-top: 0;">Account Found!</h2>
            
            <p>Hi ${firstName},</p>
            
            <p>We found your GKICKS account associated with this email address:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <p style="margin: 0; font-size: 16px;"><strong>Email:</strong> ${userEmail}</p>
            </div>
            
            <p>If you need to reset your password, please visit our password reset page and use this email address.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/auth/reset-password" 
                 style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
              If you didn't request this information, please ignore this email or contact our support team.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Account Recovery - GKICKS

Hi ${firstName},

We found your GKICKS account associated with this email address: ${userEmail}

If you need to reset your password, please visit our password reset page and use this email address.

Reset Password: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/auth/reset-password

If you didn't request this information, please ignore this email or contact our support team.

Thank you,
GKICKS Team
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email recovery notification sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email recovery notification:', error);
    return false;
  }
}

// Send email not found notification
export async function sendEmailNotFoundNotification(email: string): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'GKICKS',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gkicks.com',
      },
      to: email,
      subject: '❓ Account Not Found - GKICKS',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Account Not Found - GKICKS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">❓ Account Not Found</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GKICKS Account Search</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #ffc107; margin-top: 0;">No Account Found</h2>
            
            <p>Hello,</p>
            
            <p>We couldn't find a GKICKS account associated with this email address: <strong>${email}</strong></p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 16px;">This could mean:</p>
              <ul style="margin: 10px 0;">
                <li>You might have used a different email address</li>
                <li>You haven't created an account with us yet</li>
                <li>There might be a typo in the email address</li>
              </ul>
            </div>
            
            <p>Would you like to create a new account with us?</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/auth/register" 
                 style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
                Create Account
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/contact" 
                 style="display: inline-block; background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Contact Support
              </a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
              If you believe this is an error, please contact our support team for assistance.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Account Not Found - GKICKS

Hello,

We couldn't find a GKICKS account associated with this email address: ${email}

This could mean:
- You might have used a different email address
- You haven't created an account with us yet
- There might be a typo in the email address

Would you like to create a new account with us?

Create Account: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/auth/register
Contact Support: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}/contact

If you believe this is an error, please contact our support team for assistance.

Thank you,
GKICKS Team
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email not found notification sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email not found notification:', error);
    return false;
  }
}

// Send POS receipt email
export async function sendPOSReceiptEmail(
  receiptData: any,
  pdfBuffer: Buffer
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'GKICKS',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gkicks.com',
      },
      to: receiptData.customerEmail,
      subject: `🧾 Receipt #${receiptData.transactionId} - GKICKS`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt - GKICKS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🧾 Purchase Receipt</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GKICKS Point of Sale</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #28a745; margin-top: 0;">Thank you for your purchase!</h2>
            
            <p>Hi ${receiptData.customerName || 'Valued Customer'},</p>
            
            <p>Thank you for shopping with GKICKS! Your receipt is attached to this email as a PDF.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <p style="margin: 0; font-size: 16px;"><strong>Transaction ID:</strong> ${receiptData.transactionId}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${receiptData.transactionDate}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Total:</strong> ₱${receiptData.total}</p>
              ${receiptData.cashierName ? `<p style="margin: 5px 0; font-size: 16px;"><strong>Cashier:</strong> ${receiptData.cashierName}</p>` : ''}
            </div>
            
            <p>We appreciate your business and hope to see you again soon!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}" 
                 style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Visit Our Store
              </a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
              If you have any questions about your purchase, please contact our support team.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Purchase Receipt - GKICKS

Hi ${receiptData.customerName || 'Valued Customer'},

Thank you for shopping with GKICKS! Your receipt is attached to this email as a PDF.

Transaction Details:
- Transaction ID: ${receiptData.transactionId}
- Date: ${receiptData.transactionDate}
- Total: ₱${receiptData.total}
${receiptData.cashierName ? `- Cashier: ${receiptData.cashierName}` : ''}

We appreciate your business and hope to see you again soon!

Visit Our Store: ${process.env.NEXT_PUBLIC_APP_URL || 'https://gkicks.com'}

If you have any questions about your purchase, please contact our support team.

Thank you,
GKICKS Team
      `,
      attachments: [
        {
          filename: `receipt-${receiptData.transactionId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('POS receipt email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send POS receipt email:', error);
    return false;
  }
}