import { NextRequest, NextResponse } from 'next/server';
import { getStripeLambdaUrl, isLambdaAvailable } from '@/lib/stripe-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'CREATE_PAYMENT_INTENT' } = body;
    
    // Validate required fields for payment intent
    if (action === 'CREATE_PAYMENT_INTENT') {
      const { amount, bookingId, customerId, providerId, providerStripeAccountId, serviceTitle } = body;
      
      if (!amount || !bookingId || !customerId || !providerId || !providerStripeAccountId || !serviceTitle) {
        return NextResponse.json(
          { error: 'Missing required fields for payment intent' },
          { status: 400 }
        );
      }
    }
    
    // Use development mode if Lambda not available
    if (!isLambdaAvailable()) {
      return handleDevelopmentMode(body);
    }
    
    // Forward request to Lambda function
    const lambdaBody = { action, ...body };
    const lambdaUrl = getStripeLambdaUrl();
    const response = await fetch(lambdaUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY || ''}`,
      },
      body: JSON.stringify(lambdaBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lambda function returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Development mode handler for testing without Lambda
async function handleDevelopmentMode(body: any) {
  const { action, amount = 100, bookingId = 'dev-booking' } = body;
  
  switch (action) {
    case 'CREATE_PAYMENT_INTENT':
      return NextResponse.json({
        clientSecret: `pi_dev_${Date.now()}_secret_dev`,
        paymentIntentId: `pi_dev_${Date.now()}`,
        amount,
        platformFee: Math.round(amount * 0.08),
        providerAmount: Math.round(amount * 0.92),
      });
      
    case 'PROCESS_REFUND':
      return NextResponse.json({
        refundId: `re_dev_${Date.now()}`,
        amount: body.amount || amount,
        status: 'succeeded',
      });
      
    case 'CREATE_PAYOUT':
      return NextResponse.json({
        payoutId: `po_dev_${Date.now()}`,
        amount: body.amount || amount,
        arrivalDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
        status: 'in_transit',
      });
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}