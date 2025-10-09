import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPOSReceiptEmail } from '@/lib/email-service';
import { generatePOSReceiptPDF } from '@/lib/pdf-receipt-generator';
import { executeQuery } from '@/lib/database/mysql';

interface SendReceiptRequest {
  transactionId: string;
  customerEmail: string;
  customerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    const session = await getServerSession(authOptions);
    
    let isAuthenticated = false;
    let userRole = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && (decoded.role === 'admin' || decoded.role === 'staff')) {
          isAuthenticated = true;
          userRole = decoded.role;
        }
      } catch (error) {
        console.error('JWT verification failed:', error);
      }
    }

    if (!isAuthenticated && session?.user) {
      const userEmail = session.user.email;
      if (userEmail) {
        const userResult = await executeQuery(
          'SELECT role FROM admin_users WHERE email = ?',
          [userEmail]
        );
        if (userResult.length > 0 && (userResult[0].role === 'admin' || userResult[0].role === 'staff')) {
          isAuthenticated = true;
          userRole = userResult[0].role;
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or staff access required.' },
        { status: 401 }
      );
    }

    const body: SendReceiptRequest = await request.json();
    const { transactionId, customerEmail, customerName } = body;

    // Validate required fields
    if (!transactionId || !customerEmail) {
      return NextResponse.json(
        { error: 'Transaction ID and customer email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Fetch transaction details
    const transactionResult = await executeQuery(`
      SELECT 
        pt.*,
        au.name as cashier_name
      FROM pos_transactions pt
      LEFT JOIN admin_users au ON pt.admin_user_id = au.id
      WHERE pt.transaction_id = ?
    `, [transactionId]);

    if (transactionResult.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction = transactionResult[0];

    // Fetch transaction items
    const itemsResult = await executeQuery(`
      SELECT 
        pti.*,
        p.name as product_name,
        p.brand,
        pv.size,
        pv.color
      FROM pos_transaction_items pti
      JOIN products p ON pti.product_id = p.id
      LEFT JOIN product_variants pv ON pti.variant_id = pv.id
      WHERE pti.transaction_id = ?
    `, [transactionId]);

    if (itemsResult.length === 0) {
      return NextResponse.json(
        { error: 'Transaction items not found' },
        { status: 404 }
      );
    }

    // Prepare receipt data
    const receiptData = {
      receiptNumber: transaction.receipt_number,
      transactionId: transaction.transaction_id,
      customerName: customerName || transaction.customer_name || 'Valued Customer',
      customerEmail: customerEmail,
      items: itemsResult.map((item: any) => ({
        name: item.product_name,
        brand: item.brand || 'GKICKS',
        size: item.size || 'N/A',
        color: item.color || 'N/A',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price)
      })),
      subtotal: parseFloat(transaction.total_amount),
      total: parseFloat(transaction.total_amount),
      paymentMethod: transaction.payment_method,
      paymentReference: transaction.payment_reference,
      cashReceived: transaction.cash_received ? parseFloat(transaction.cash_received) : undefined,
      changeGiven: transaction.change_given ? parseFloat(transaction.change_given) : undefined,
      transactionDate: transaction.created_at,
      cashierName: transaction.cashier_name
    };

    // Generate PDF receipt
    console.log('Generating PDF receipt for transaction:', transactionId);
    const pdfBuffer = await generatePOSReceiptPDF(receiptData);
    console.log('PDF generated successfully. Size:', pdfBuffer.length, 'bytes');

    // Send email with PDF attachment
    console.log('Sending email to:', customerEmail);
    const emailSent = await sendPOSReceiptEmail(receiptData, pdfBuffer);
    console.log('Email sent result:', emailSent);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send receipt email' },
        { status: 500 }
      );
    }

    // Update transaction with email sent status (optional)
    try {
      await executeQuery(`
        UPDATE pos_transactions 
        SET customer_email = ?, email_sent_at = NOW() 
        WHERE transaction_id = ?
      `, [customerEmail, transactionId]);
    } catch (updateError) {
      console.error('Failed to update transaction with email status:', updateError);
      // Don't fail the request if this update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt sent successfully',
      receiptNumber: transaction.receipt_number,
      customerEmail: customerEmail
    });

  } catch (error) {
    console.error('Error sending POS receipt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}