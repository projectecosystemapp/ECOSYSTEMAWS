import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const PLATFORM_FEE_PERCENT = 8; // 8% commission for early adopters

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, providerId, ...params } = body;
    
    switch (action) {
      case 'CREATE_ACCOUNT':
        return await createConnectAccount(providerId);
        
      case 'CREATE_ACCOUNT_LINK':
        return await createAccountLink(params.accountId);
        
      case 'CHECK_ACCOUNT_STATUS':
        return await checkAccountStatus(params.accountId);
        
      case 'CREATE_PAYMENT_INTENT':
        return await createPaymentIntent(params);
        
      case 'CREATE_ESCROW_PAYMENT':
        return await createEscrowPayment(params);
        
      case 'RELEASE_ESCROW':
        return await releaseEscrowPayment(params);
        
      case 'PROCESS_REFUND':
        return await processRefund(params);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Stripe Connect API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function createConnectAccount(providerId: string) {
  try {
    // Create Express account for onboarding
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // TODO: Make this dynamic based on user location
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // TODO: Allow business accounts
      metadata: {
        providerId,
        platform: 'ecosystem',
        commissionRate: PLATFORM_FEE_PERCENT.toString(),
      },
    });
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?success=true`,
      type: 'account_onboarding',
    });
    
    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    console.error('Create account error:', error);
    throw error;
  }
}

async function createAccountLink(accountId: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/dashboard`,
      type: 'account_onboarding',
    });
    
    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Create account link error:', error);
    throw error;
  }
}

async function checkAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    return NextResponse.json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
      capabilities: account.capabilities,
    });
  } catch (error) {
    console.error('Check account status error:', error);
    throw error;
  }
}

async function createPaymentIntent(params: any) {
  const { amount, currency = 'usd', connectedAccountId, customerId, serviceId, bookingId } = params;
  
  try {
    // Calculate platform fee (8%)
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata: {
        serviceId,
        bookingId,
        customerId,
        platform: 'ecosystem',
      },
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      platformFee,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    throw error;
  }
}

async function createEscrowPayment(params: any) {
  const { amount, currency = 'usd', connectedAccountId, customerId, serviceId, bookingId } = params;
  
  try {
    // For escrow, we capture the payment but don't transfer immediately
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: 'manual', // Hold funds in escrow
      metadata: {
        serviceId,
        bookingId,
        customerId,
        connectedAccountId,
        platformFee: platformFee.toString(),
        escrow: 'true',
        platform: 'ecosystem',
      },
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      platformFee,
      escrowEnabled: true,
    });
  } catch (error) {
    console.error('Create escrow payment error:', error);
    throw error;
  }
}

async function releaseEscrowPayment(params: any) {
  const { paymentIntentId, connectedAccountId } = params;
  
  try {
    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    // Create transfer to connected account
    const platformFee = parseInt(paymentIntent.metadata.platformFee || '0');
    const transferAmount = paymentIntent.amount - platformFee;
    
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: paymentIntent.currency,
      destination: connectedAccountId,
      transfer_group: paymentIntentId,
      metadata: {
        bookingId: paymentIntent.metadata.bookingId,
        serviceId: paymentIntent.metadata.serviceId,
        escrowRelease: 'true',
      },
    });
    
    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      amountTransferred: transferAmount,
      platformFee,
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    throw error;
  }
}

async function processRefund(params: any) {
  const { paymentIntentId, amount, reason } = params;
  
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // Optional: partial refund
      reason: reason || 'requested_by_customer',
    });
    
    return NextResponse.json({
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    console.error('Process refund error:', error);
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}