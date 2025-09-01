import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';

// Initialize Stripe with the correct API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const PLATFORM_FEE_PERCENT = 8;

// Type definitions for all action parameters
interface CreateAccountLinkParams {
  accountId: string;
}

interface CheckAccountStatusParams {
  accountId: string;
}

interface PaymentIntentParams {
  amount: number;
  currency?: string;
  connectedAccountId: string;
  customerId: string;
  serviceId: string;
  bookingId: string;
}

interface EscrowPaymentParams {
  amount: number;
  currency?: string;
  connectedAccountId: string;
  customerId: string;
  serviceId: string;
  bookingId: string;
}

interface ReleaseEscrowParams {
  paymentIntentId: string;
  connectedAccountId: string;
}

interface RefundParams {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

interface RequestBody {
  action: string;
  providerId?: string;
  accountId?: string;
  amount?: number;
  currency?: string;
  connectedAccountId?: string;
  customerId?: string;
  serviceId?: string;
  bookingId?: string;
  paymentIntentId?: string;
  reason?: string;
}

// Main POST handler with reduced complexity
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate the user
    const user = await getAuthenticatedUser(request);
    if (user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorize: Must be in the 'Providers' group
    if (!user.groups.includes('Providers')) {
      return NextResponse.json({ error: 'Forbidden: Provider access required' }, { status: 403 });
    }

    const body = await request.json() as RequestBody;
    const { action, providerId, ...params } = body;

    // 3. Security Check: Ensure providerId matches authenticated user
    if (providerId !== undefined && providerId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden: Mismatch in provider ID' }, { status: 403 });
    }

    // Delegate to action handler
    return await handleStripeAction(action, params, user.userId);
  } catch (error) {
    console.error('Stripe Connect API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Separate action handler to reduce complexity
async function handleStripeAction(
  action: string, 
  params: Partial<RequestBody>, 
  userId: string
): Promise<NextResponse> {
  switch (action) {
    case 'CREATE_ACCOUNT':
      return await createConnectAccount(userId);
      
    case 'CREATE_ACCOUNT_LINK':
      if (!params.accountId) {
        return NextResponse.json({ error: 'accountId required' }, { status: 400 });
      }
      return await createAccountLink(params.accountId);
      
    case 'CHECK_ACCOUNT_STATUS':
      if (!params.accountId) {
        return NextResponse.json({ error: 'accountId required' }, { status: 400 });
      }
      return await checkAccountStatus(params.accountId);
      
    case 'CREATE_PAYMENT_INTENT':
      return await createPaymentIntent(params as PaymentIntentParams);
      
    case 'CREATE_ESCROW_PAYMENT':
      return await createEscrowPayment(params as EscrowPaymentParams);
      
    case 'RELEASE_ESCROW':
      return await releaseEscrowPayment(params as ReleaseEscrowParams);
      
    case 'PROCESS_REFUND':
      return await processRefund(params as RefundParams);
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function createConnectAccount(providerId: string): Promise<NextResponse> {
  try {
    // Create Express account for onboarding
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
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

async function createAccountLink(accountId: string): Promise<NextResponse> {
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

async function checkAccountStatus(accountId: string): Promise<NextResponse> {
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

async function createPaymentIntent(params: PaymentIntentParams): Promise<NextResponse> {
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

async function createEscrowPayment(params: EscrowPaymentParams): Promise<NextResponse> {
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

async function releaseEscrowPayment(params: ReleaseEscrowParams): Promise<NextResponse> {
  const { paymentIntentId, connectedAccountId } = params;
  
  try {
    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    // Create transfer to connected account
    const platformFeeStr = paymentIntent.metadata.platformFee;
    const platformFee = platformFeeStr ? parseInt(platformFeeStr, 10) : 0;
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

async function processRefund(params: RefundParams): Promise<NextResponse> {
  const { paymentIntentId, amount, reason } = params;
  
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: (reason ?? 'requested_by_customer') as Stripe.RefundCreateParams.Reason,
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

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}