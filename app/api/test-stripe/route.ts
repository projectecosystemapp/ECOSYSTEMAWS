import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey || stripeSecretKey.includes('your_secret_key_here')) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured in environment variables' },
        { status: 500 }
      );
    }

    // Initialize Stripe with your secret key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Test the connection by retrieving account details
    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      success: true,
      accountId: account.id,
      country: account.country,
      currency: account.default_currency,
      message: 'Stripe connection successful!',
    });
  } catch (error: any) {
    console.error('Stripe test error:', error);
    
    // Check if it's an authentication error
    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { error: 'Invalid Stripe API key. Please check your credentials.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to connect to Stripe',
        type: error.type,
      },
      { status: 500 }
    );
  }
}