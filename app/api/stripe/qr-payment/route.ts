import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import QRCode from 'qrcode';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const PLATFORM_FEE_PERCENT = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    switch (action) {
      case 'CREATE_QR_PAYMENT':
        return await createQRPayment(params);
        
      case 'VERIFY_QR_PAYMENT':
        return await verifyQRPayment(params);
        
      case 'PROCESS_QR_PAYMENT':
        return await processQRPayment(params);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('QR Payment API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function createQRPayment(params: any) {
  const { 
    providerId,
    serviceId,
    amount,
    currency = 'usd',
    description,
    connectedAccountId,
    escrowEnabled = false,
    expiresIn = 3600 // 1 hour default
  } = params;
  
  try {
    // Calculate platform fee
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: escrowEnabled ? 'manual' : 'automatic',
      metadata: {
        providerId,
        serviceId,
        qrPayment: 'true',
        escrow: escrowEnabled.toString(),
        platformFee: platformFee.toString(),
        connectedAccountId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
      ...(connectedAccountId && !escrowEnabled && {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: connectedAccountId,
        },
      }),
    });
    
    // Create payment link for the QR code
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: description || 'Service Payment',
            description: `Payment to provider ${providerId}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        metadata: paymentIntent.metadata,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?payment_intent=${paymentIntent.id}`,
        },
      },
    });
    
    // Generate QR code data URL
    const qrCodeData = {
      type: 'ECOSYSTEM_PAYMENT',
      paymentIntentId: paymentIntent.id,
      providerId,
      serviceId,
      amount,
      currency,
      paymentUrl: paymentLink.url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
    
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    // Also generate a simple text QR code for mobile scanning
    const simpleQRCode = await QRCode.toDataURL(paymentLink.url, {
      width: 400,
      margin: 2,
    });
    
    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      paymentLinkUrl: paymentLink.url,
      qrCodeDataUrl: qrCodeUrl,
      simpleQRCodeUrl: simpleQRCode,
      amount,
      platformFee,
      expiresAt: qrCodeData.expiresAt,
      escrowEnabled,
    });
  } catch (error) {
    console.error('Create QR payment error:', error);
    throw error;
  }
}

async function verifyQRPayment(params: any) {
  const { paymentIntentId, qrCode } = params;
  
  try {
    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Check if payment is expired
    const expiresAt = paymentIntent.metadata.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'QR code has expired',
      });
    }
    
    // Verify QR code matches payment intent
    if (paymentIntent.metadata.qrPayment !== 'true') {
      return NextResponse.json({
        valid: false,
        error: 'Invalid QR payment',
      });
    }
    
    // Parse QR code data if provided
    let qrData = null;
    if (qrCode) {
      try {
        qrData = JSON.parse(qrCode);
        if (qrData.paymentIntentId !== paymentIntentId) {
          return NextResponse.json({
            valid: false,
            error: 'QR code does not match payment',
          });
        }
      } catch (e) {
        // QR code might be a simple URL, that's okay
      }
    }
    
    return NextResponse.json({
      valid: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
      },
      qrData,
    });
  } catch (error) {
    console.error('Verify QR payment error:', error);
    throw error;
  }
}

async function processQRPayment(params: any) {
  const { 
    paymentIntentId,
    paymentMethodId,
    customerId,
    customerEmail,
    confirmPayment = true
  } = params;
  
  try {
    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Check if payment is expired
    const expiresAt = paymentIntent.metadata.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'QR payment has expired',
      });
    }
    
    // Update payment intent with customer info
    const updatedPaymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      payment_method: paymentMethodId,
      metadata: {
        ...paymentIntent.metadata,
        customerId,
        customerEmail,
        qrScannedAt: new Date().toISOString(),
      },
    });
    
    // Confirm payment if requested
    if (confirmPayment && updatedPaymentIntent.status === 'requires_confirmation') {
      const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntentId);
      
      // If escrow is enabled, payment will be captured manually later
      if (paymentIntent.metadata.escrow === 'true') {
        return NextResponse.json({
          success: true,
          paymentIntentId: confirmedPayment.id,
          status: confirmedPayment.status,
          escrowEnabled: true,
          message: 'Payment authorized and held in escrow',
        });
      }
      
      // For non-escrow payments with connected accounts
      if (paymentIntent.metadata.connectedAccountId) {
        // Transfer is handled automatically via application_fee_amount
        return NextResponse.json({
          success: true,
          paymentIntentId: confirmedPayment.id,
          status: confirmedPayment.status,
          message: 'Payment processed and transferred to provider',
        });
      }
      
      return NextResponse.json({
        success: true,
        paymentIntentId: confirmedPayment.id,
        status: confirmedPayment.status,
        message: 'Payment processed successfully',
      });
    }
    
    return NextResponse.json({
      success: true,
      paymentIntentId: updatedPaymentIntent.id,
      status: updatedPaymentIntent.status,
      requiresConfirmation: updatedPaymentIntent.status === 'requires_confirmation',
    });
  } catch (error) {
    console.error('Process QR payment error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const paymentIntentId = searchParams.get('payment_intent');
  
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 });
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return NextResponse.json({
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    console.error('Get payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}