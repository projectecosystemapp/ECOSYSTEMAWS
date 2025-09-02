// SECURITY FIX: CWE-20, CWE-89, CWE-117
// Risk: Improper input validation, injection flaws, insufficient logging
// Mitigation: Zod validation, proper error handling, structured logging
// Validated: All inputs validated before processing

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import {
  StripeConnectRequestSchema,
  type StripeConnectRequest,
  type PaymentIntentParams,
  type EscrowPaymentParams,
  type ReleaseEscrowParams,
  type RefundParams,
  type ApiResponse,
  sanitizeString,
  validateAndSanitizeInput,
  isValidAmount,
  isValidCurrency,
} from '@/lib/api-types';

// Validate environment variables at startup
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
}

// Initialize Stripe with the correct API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

const PLATFORM_FEE_PERCENT = 8;
const MAX_AMOUNT = 10000000; // $100,000 in cents
const MIN_AMOUNT = 50; // $0.50 in cents

// SECURITY FIX: CWE-20
// Risk: Improper validation of payment parameters
// Mitigation: Strict validation functions for all parameter types
// Validated: Type-safe parameter validation with business rules

function validatePaymentIntentParams(params: Partial<StripeConnectRequest>): PaymentIntentParams {
  if (!params.amount || !isValidAmount(params.amount)) {
    throw new Error('Valid amount is required');
  }
  if (params.amount < MIN_AMOUNT || params.amount > MAX_AMOUNT) {
    throw new Error(`Amount must be between $${MIN_AMOUNT/100} and $${MAX_AMOUNT/100}`);
  }
  if (!params.connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  if (!params.customerId) {
    throw new Error('Customer ID is required');
  }
  if (!params.serviceId) {
    throw new Error('Service ID is required');
  }
  if (!params.bookingId) {
    throw new Error('Booking ID is required');
  }

  return {
    amount: params.amount,
    currency: params.currency && isValidCurrency(params.currency) ? params.currency : 'usd',
    connectedAccountId: sanitizeString(params.connectedAccountId),
    customerId: sanitizeString(params.customerId),
    serviceId: sanitizeString(params.serviceId),
    bookingId: sanitizeString(params.bookingId),
  };
}

function validateEscrowPaymentParams(params: Partial<StripeConnectRequest>): EscrowPaymentParams {
  // Same validation as payment intent
  return validatePaymentIntentParams(params);
}

function validateReleaseEscrowParams(params: Partial<StripeConnectRequest>): ReleaseEscrowParams {
  if (!params.paymentIntentId) {
    throw new Error('Payment intent ID is required');
  }
  if (!params.connectedAccountId) {
    throw new Error('Connected account ID is required');
  }

  return {
    paymentIntentId: sanitizeString(params.paymentIntentId),
    connectedAccountId: sanitizeString(params.connectedAccountId),
  };
}

function validateRefundParams(params: Partial<StripeConnectRequest>): RefundParams {
  if (!params.paymentIntentId) {
    throw new Error('Payment intent ID is required');
  }

  const validated: RefundParams = {
    paymentIntentId: sanitizeString(params.paymentIntentId),
  };

  if (params.amount) {
    if (!isValidAmount(params.amount)) {
      throw new Error('Invalid refund amount');
    }
    if (params.amount < MIN_AMOUNT || params.amount > MAX_AMOUNT) {
      throw new Error('Refund amount out of allowed range');
    }
    validated.amount = params.amount;
  }

  if (params.reason) {
    validated.reason = sanitizeString(params.reason, 200);
  }

  return validated;
}

// SECURITY FIX: CWE-287, CWE-863
// Risk: Improper authentication and authorization
// Mitigation: Strict input validation, role-based access control, audit logging
// Validated: Multi-layer security checks with structured error handling

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  // Generate correlation ID for request tracking
  const correlationId = `stripe-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    
    // 1. Authenticate the user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.warn(`[${correlationId}] Unauthorized access attempt`);
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // 2. Authorize: Must be in the 'Providers' group
    if (!user.groups.includes('Providers')) {
      console.warn(`[${correlationId}] Access denied for user ${user.userId} - missing Providers group`);
      return NextResponse.json(
        { error: 'Forbidden: Provider access required' }, 
        { status: 403 }
      );
    }

    // 3. Validate and sanitize input
    let validatedBody: StripeConnectRequest;
    try {
      const rawBody = await request.json();
      validatedBody = validateAndSanitizeInput(rawBody, StripeConnectRequestSchema);
    } catch (validationError) {
      console.warn(`[${correlationId}] Input validation failed:`, validationError);
      return NextResponse.json(
        { 
          error: 'Invalid request format', 
          details: validationError instanceof Error ? validationError.message : 'Validation failed'
        },
        { status: 400 }
      );
    }

    const { action, providerId, ...params } = validatedBody;

    // 4. Security Check: Ensure providerId matches authenticated user (if provided)
    if (providerId && providerId !== user.userId) {
      console.warn(`[${correlationId}] Provider ID mismatch: ${providerId} !== ${user.userId}`);
      return NextResponse.json(
        { error: 'Forbidden: Provider ID mismatch' }, 
        { status: 403 }
      );
    }

    console.info(`[${correlationId}] Processing ${action} for user ${user.userId}`);
    
    // 5. Delegate to action handler
    const result = await handleStripeAction(action, params, user.userId, correlationId);
    
    const duration = Date.now() - startTime;
    console.info(`[${correlationId}] Request completed in ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${correlationId}] Stripe Connect API error after ${duration}ms:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        correlationId
      },
      { status: 500 }
    );
  }
}

// SECURITY FIX: CWE-20
// Risk: Improper input validation in action handling
// Mitigation: Type-safe action handling with validation
// Validated: All actions validated against whitelist

async function handleStripeAction(
  action: string, 
  params: Partial<StripeConnectRequest>, 
  userId: string,
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  try {
    switch (action) {
      case 'CREATE_ACCOUNT':
        return await createConnectAccount(userId, correlationId);
        
      case 'CREATE_ACCOUNT_LINK':
        if (!params.accountId) {
          return NextResponse.json({ error: 'accountId required for account link creation' }, { status: 400 });
        }
        return await createAccountLink(sanitizeString(params.accountId), correlationId);
        
      case 'CHECK_ACCOUNT_STATUS':
        if (!params.accountId) {
          return NextResponse.json({ error: 'accountId required for status check' }, { status: 400 });
        }
        return await checkAccountStatus(sanitizeString(params.accountId), correlationId);
        
      case 'CREATE_PAYMENT_INTENT':
        return await createPaymentIntent(
          validatePaymentIntentParams(params), 
          correlationId
        );
        
      case 'CREATE_ESCROW_PAYMENT':
        return await createEscrowPayment(
          validateEscrowPaymentParams(params), 
          correlationId
        );
        
      case 'RELEASE_ESCROW':
        return await releaseEscrowPayment(
          validateReleaseEscrowParams(params), 
          correlationId
        );
        
      case 'PROCESS_REFUND':
        return await processRefund(
          validateRefundParams(params), 
          correlationId
        );
        
      default:
        console.warn(`[${correlationId}] Invalid action attempted: ${action}`);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(`[${correlationId}] Action handler error:`, error);
    throw error; // Re-throw to be handled by main error handler
  }
}

// SECURITY FIX: CWE-117, CWE-209
// Risk: Information exposure through error messages
// Mitigation: Structured logging with correlation IDs, sanitized error responses
// Validated: All external inputs sanitized, internal errors logged securely

async function createConnectAccount(
  providerId: string, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  try {
    console.info(`[${correlationId}] Creating Stripe Express account for provider ${providerId}`);
    
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
        providerId: sanitizeString(providerId),
        platform: 'ecosystem',
        commissionRate: PLATFORM_FEE_PERCENT.toString(),
        createdAt: new Date().toISOString(),
        correlationId,
      },
    });
    
    console.info(`[${correlationId}] Stripe account created: ${account.id}`);
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?success=true`,
      type: 'account_onboarding',
    });
    
    console.info(`[${correlationId}] Account link created for ${account.id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Create account error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      providerId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to create Stripe account', code: error.code },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

async function createAccountLink(
  accountId: string, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  try {
    console.info(`[${correlationId}] Creating account link for ${accountId}`);
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/dashboard`,
      type: 'account_onboarding',
    });
    
    console.info(`[${correlationId}] Account link created for ${accountId}`);
    
    return NextResponse.json({
      success: true,
      data: { url: accountLink.url },
    });
  } catch (error) {
    console.error(`[${correlationId}] Create account link error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      accountId,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to create account link', code: error.code },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

async function checkAccountStatus(
  accountId: string, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  try {
    console.info(`[${correlationId}] Checking account status for ${accountId}`);
    
    const account = await stripe.accounts.retrieve(accountId);
    
    const statusData = {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
      capabilities: {
        card_payments: account.capabilities?.card_payments,
        transfers: account.capabilities?.transfers,
      },
    };
    
    console.info(`[${correlationId}] Account status retrieved for ${accountId}:`, {
      chargesEnabled: statusData.chargesEnabled,
      payoutsEnabled: statusData.payoutsEnabled,
      detailsSubmitted: statusData.detailsSubmitted,
    });
    
    return NextResponse.json({
      success: true,
      data: statusData,
    });
  } catch (error) {
    console.error(`[${correlationId}] Check account status error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      accountId,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to retrieve account status', code: error.code },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

async function createPaymentIntent(
  params: PaymentIntentParams, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  const { amount, currency, connectedAccountId, customerId, serviceId, bookingId } = params;
  
  try {
    console.info(`[${correlationId}] Creating payment intent:`, {
      amount,
      currency,
      serviceId,
      bookingId,
    });
    
    // Calculate platform fee (8%)
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata: {
        serviceId,
        bookingId,
        customerId,
        platform: 'ecosystem',
        correlationId,
        createdAt: new Date().toISOString(),
      },
    });
    
    console.info(`[${correlationId}] Payment intent created: ${paymentIntent.id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformFee,
        amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Create payment intent error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      amount,
      serviceId,
      bookingId,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to create payment intent', code: error.code },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

async function createEscrowPayment(
  params: EscrowPaymentParams, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  const { amount, currency, connectedAccountId, customerId, serviceId, bookingId } = params;
  
  try {
    console.info(`[${correlationId}] Creating escrow payment:`, {
      amount,
      currency,
      serviceId,
      bookingId,
    });
    
    // For escrow, we capture the payment but don't transfer immediately
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      capture_method: 'manual', // Hold funds in escrow
      metadata: {
        serviceId,
        bookingId,
        customerId,
        connectedAccountId,
        platformFee: platformFee.toString(),
        escrow: 'true',
        platform: 'ecosystem',
        correlationId,
        createdAt: new Date().toISOString(),
      },
    });
    
    console.info(`[${correlationId}] Escrow payment intent created: ${paymentIntent.id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformFee,
        escrowEnabled: true,
        amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Create escrow payment error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      amount,
      serviceId,
      bookingId,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to create escrow payment', code: error.code },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

async function releaseEscrowPayment(
  params: ReleaseEscrowParams, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  const { paymentIntentId, connectedAccountId } = params;
  
  try {
    console.info(`[${correlationId}] Releasing escrow payment: ${paymentIntentId}`);
    
    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    // Create transfer to connected account
    const platformFeeStr = paymentIntent.metadata.platformFee;
    const platformFee = platformFeeStr ? parseInt(platformFeeStr, 10) : 0;
    const transferAmount = paymentIntent.amount - platformFee;
    
    if (transferAmount <= 0) {
      throw new Error('Invalid transfer amount after platform fee');
    }
    
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: paymentIntent.currency,
      destination: connectedAccountId,
      transfer_group: paymentIntentId,
      metadata: {
        bookingId: paymentIntent.metadata.bookingId || '',
        serviceId: paymentIntent.metadata.serviceId || '',
        escrowRelease: 'true',
        correlationId,
        releasedAt: new Date().toISOString(),
      },
    });
    
    console.info(`[${correlationId}] Escrow released - Transfer created: ${transfer.id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        transferId: transfer.id,
        amountTransferred: transferAmount,
        platformFee,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Release escrow error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentIntentId,
      connectedAccountId,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to release escrow payment', code: error.code },
        { status: 400 }
      );
    }
    
    throw error;
  }
}

async function processRefund(
  params: RefundParams, 
  correlationId: string
): Promise<NextResponse<ApiResponse>> {
  const { paymentIntentId, amount, reason } = params;
  
  try {
    console.info(`[${correlationId}] Processing refund:`, {
      paymentIntentId,
      amount,
      reason,
    });
    
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: (reason ?? 'requested_by_customer') as Stripe.RefundCreateParams.Reason,
      metadata: {
        correlationId,
        processedAt: new Date().toISOString(),
      },
    };
    
    if (amount) {
      refundData.amount = amount;
    }
    
    const refund = await stripe.refunds.create(refundData);
    
    console.info(`[${correlationId}] Refund processed: ${refund.id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        currency: refund.currency,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Process refund error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentIntentId,
      amount,
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Failed to process refund', code: error.code },
        { status: 400 }
      );
    }
    
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