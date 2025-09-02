import { generateClient } from 'aws-amplify/data';
import { NextRequest, NextResponse } from 'next/server';

import { type Schema } from '@/amplify/data/resource';

// Get the Lambda function URL from environment
const STRIPE_LAMBDA_URL = process.env.STRIPE_CONNECT_LAMBDA_URL || process.env.NEXT_PUBLIC_STRIPE_LAMBDA_URL;

export async function POST(request: NextRequest) {
  try {
    const client = generateClient<Schema>();
    
    const body = await request.json();
    const { action = 'CREATE_PAYMENT_INTENT' } = body;
    
    // Validate we have the Lambda URL configured
    if (!STRIPE_LAMBDA_URL) {
      console.error('Stripe Lambda URL not configured');
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 503 }
      );
    }
    
    // For CREATE_PAYMENT_INTENT, ensure we have provider's Stripe account
    if (action === 'CREATE_PAYMENT_INTENT') {
      const { providerId, amountCents, bookingId } = body;
      // Validate cents usage
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive integer in cents' },
          { status: 400 }
        );
      }
      
      if (!providerId || !amountCents || !bookingId) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
      
      // Get provider's Stripe account ID from database
      const { data: provider } = await client.models.UserProfile.get({ id: providerId });
      
      if (!provider?.stripeAccountId) {
        return NextResponse.json(
          { error: 'Provider has not completed payment setup' },
          { status: 400 }
        );
      }
      
      // Add the Stripe account ID to the request
      body.providerStripeAccountId = provider.stripeAccountId;
    }
    
    // Forward request to Lambda function
    const lambdaResponse = await fetch(STRIPE_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.AWS_API_KEY || '',
      },
      body: JSON.stringify({
        ...body,
        action,
      }),
    });
    
    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error('Lambda function error:', errorText);
      return NextResponse.json(
        { error: 'Payment processing failed', details: errorText },
        { status: lambdaResponse.status }
      );
    }
    
    const result = await lambdaResponse.json();
    
    // If it's a successful payment intent creation, update the booking
    if (action === 'CREATE_PAYMENT_INTENT' && result.paymentIntentId) {
      const { bookingId, amountCents } = body;
      
      // Update booking with payment intent ID
      await client.models.Booking.update({
        id: bookingId,
        paymentIntentId: result.paymentIntentId,
        paymentStatus: 'PENDING',
        amountCents,
        platformFeeCents: result.platformFeeCents,
      });
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { 
        error: 'Payment processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}