import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

// Interface for POS transaction data
export interface POSReceiptData {
  transactionId: string;
  receiptNumber: string;
  customerName?: string;
  customerEmail?: string;
  items: Array<{
    name: string;
    brand: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  paymentReference?: string;
  cashReceived?: number;
  changeGiven?: number;
  transactionDate: string;
  cashierName?: string;
}

// Generate HTML template for the receipt
function generateReceiptHTML(data: POSReceiptData): string {
  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GKICKS Receipt - ${data.receiptNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f8f9fa;
          padding: 20px;
          color: #333;
        }
        
        .receipt-container {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .receipt-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        
        .logo {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 8px;
          letter-spacing: 2px;
        }
        
        .tagline {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 20px;
        }
        
        .receipt-info {
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .receipt-info div {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .receipt-body {
          padding: 25px 20px;
        }
        
        .customer-info {
          margin-bottom: 25px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        
        .customer-info h3 {
          color: #667eea;
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .items-section {
          margin-bottom: 25px;
        }
        
        .items-header {
          background: #667eea;
          color: white;
          padding: 12px 15px;
          border-radius: 8px 8px 0 0;
          font-weight: bold;
          font-size: 16px;
        }
        
        .items-list {
          border: 2px solid #667eea;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        
        .item {
          padding: 15px;
          border-bottom: 1px solid #e9ecef;
          transition: background-color 0.2s;
        }
        
        .item:hover {
          background: #f8f9fa;
        }
        
        .item:last-child {
          border-bottom: none;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .item-name {
          font-weight: bold;
          color: #333;
          font-size: 15px;
          flex: 1;
        }
        
        .item-total {
          font-weight: bold;
          color: #667eea;
          font-size: 15px;
        }
        
        .item-details {
          font-size: 13px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .item-pricing {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #666;
        }
        
        .totals-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 15px;
        }
        
        .total-row.final {
          border-top: 2px solid #667eea;
          padding-top: 12px;
          margin-top: 12px;
          font-weight: bold;
          font-size: 18px;
          color: #667eea;
        }
        
        .payment-section {
          background: #e8f2ff;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          border: 1px solid #b3d9ff;
        }
        
        .payment-section h3 {
          color: #667eea;
          margin-bottom: 12px;
          font-size: 16px;
        }
        
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 14px;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }
        
        .thank-you {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 10px;
        }
        
        .footer-text {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
        }
        
        .contact-info {
          margin-top: 15px;
          font-size: 12px;
          color: #888;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          
          .receipt-container {
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="logo">GKICKS</div>
          <div class="tagline">Your Premium Shoe Destination</div>
          
          <div class="receipt-info">
            <div>
              <span>Receipt #:</span>
              <span><strong>${data.receiptNumber}</strong></span>
            </div>
            <div>
              <span>Transaction ID:</span>
              <span>${data.transactionId}</span>
            </div>
            <div>
              <span>Date & Time:</span>
              <span>${formatDate(data.transactionDate)}</span>
            </div>
            ${data.cashierName ? `
            <div>
              <span>Cashier:</span>
              <span>${data.cashierName}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="receipt-body">
          ${data.customerName ? `
          <div class="customer-info">
            <h3>Customer Information</h3>
            <div><strong>Name:</strong> ${data.customerName}</div>
            ${data.customerEmail ? `<div><strong>Email:</strong> ${data.customerEmail}</div>` : ''}
          </div>
          ` : ''}
          
          <div class="items-section">
            <div class="items-header">
              Items Purchased
            </div>
            <div class="items-list">
              ${data.items.map(item => `
                <div class="item">
                  <div class="item-header">
                    <div class="item-name">${item.name}</div>
                    <div class="item-total">${formatCurrency(item.totalPrice)}</div>
                  </div>
                  <div class="item-details">
                    <strong>Brand:</strong> ${item.brand} | 
                    <strong>Size:</strong> ${item.size} | 
                    <strong>Color:</strong> ${item.color}
                  </div>
                  <div class="item-pricing">
                    <span>Qty: ${item.quantity}</span>
                    <span>Unit Price: ${formatCurrency(item.unitPrice)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(data.subtotal)}</span>
            </div>
            ${data.tax ? `
            <div class="total-row">
              <span>Tax:</span>
              <span>${formatCurrency(data.tax)}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span>Total Amount:</span>
              <span>${formatCurrency(data.total)}</span>
            </div>
          </div>
          
          <div class="payment-section">
            <h3>Payment Information</h3>
            <div class="payment-row">
              <span>Payment Method:</span>
              <span><strong>${data.paymentMethod.toUpperCase()}</strong></span>
            </div>
            ${data.paymentReference ? `
            <div class="payment-row">
              <span>Reference:</span>
              <span>${data.paymentReference}</span>
            </div>
            ` : ''}
            ${data.cashReceived ? `
            <div class="payment-row">
              <span>Cash Received:</span>
              <span>${formatCurrency(data.cashReceived)}</span>
            </div>
            ` : ''}
            ${data.changeGiven ? `
            <div class="payment-row">
              <span>Change Given:</span>
              <span>${formatCurrency(data.changeGiven)}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="footer">
          <div class="thank-you">Thank you for your purchase!</div>
          <div class="footer-text">
            We appreciate your business and hope you enjoy your new shoes.
            <br>
            Please keep this receipt for your records.
          </div>
          <div class="contact-info">
            For support or inquiries, please contact us at support@gkicks.com
            <br>
            Visit us online at www.gkicks.com
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF receipt
export async function generatePOSReceiptPDF(data: POSReceiptData): Promise<Buffer> {
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set the HTML content
    const html = generateReceiptHTML(data);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      printBackground: true
    });

    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    throw new Error('Failed to generate PDF receipt');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Save PDF to file system (optional)
export async function savePOSReceiptPDF(data: POSReceiptData, outputPath?: string): Promise<string> {
  try {
    const pdfBuffer = await generatePOSReceiptPDF(data);
    
    // Create receipts directory if it doesn't exist
    const receiptsDir = path.join(process.cwd(), 'public', 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }
    
    // Generate filename if not provided
    const filename = outputPath || `receipt-${data.receiptNumber}-${Date.now()}.pdf`;
    const fullPath = path.join(receiptsDir, filename);
    
    // Write PDF to file
    fs.writeFileSync(fullPath, pdfBuffer);
    
    return fullPath;
  } catch (error) {
    console.error('Error saving PDF receipt:', error);
    throw new Error('Failed to save PDF receipt');
  }
}