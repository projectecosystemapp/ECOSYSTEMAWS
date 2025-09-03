import Stripe from 'stripe';
import { env } from '$amplify/env/stripe-connect';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

const PLATFORM_FEE_PERCENT = 8;

export const handler = async (event: any) => {
  console.log('Stripe Connect Lambda received:', JSON.stringify(event));

  try {
    // AppSync passes arguments in event.arguments
    const { action, providerId, ...params } = event.arguments;

    // Execute the requested action
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
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error: any) {
    console.error('Stripe Connect Lambda error:', error);
    throw new Error(`Stripe operation failed: ${error.message}`);
  }
};

async function createConnectAccount(providerId: string) {
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
  
  const accountLink = await stripe.accountLinks.create({
    account: nullableToString(account.id),
    refresh_url: `${env.APP_URL}/provider/onboarding?refresh=true`,
    return_url: `${env.APP_URL}/provider/onboarding?success=true`,
    type: 'account_onboarding',
  });
  
  return {
    accountId: nullableToString(account.id),
    onboardingUrl: nullableToString(accountLink.url),
  };
}

async function createAccountLink(accountId: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${env.APP_URL}/provider/onboarding?refresh=true`,
    return_url: `${env.APP_URL}/provider/dashboard`,
    type: 'account_onboarding',
  });
  
  return { url: accountLink.url };
}

async function checkAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  
  return {
    accountId: nullableToString(account.id),
    chargesEnabled: nullableToString(account.charges_enabled),
    payoutsEnabled: nullableToString(account.payouts_enabled),
    detailsSubmitted: nullableToString(account.details_submitted),
    requirements: nullableToString(account.requirements),
    capabilities: nullableToString(account.capabilities),
  };
}

async function createPaymentIntent(params: any) {
  const { amount, currency = 'usd', connectedAccountId, customerId, serviceId, bookingId } = params;
  
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
  
  return {
    clientSecret: nullableToString(paymentIntent.client_secret),
    paymentIntentId: nullableToString(paymentIntent.id),
    platformFee,
  };
}

async function createEscrowPayment(params: any) {
  const { amount, currency = 'usd', connectedAccountId, customerId, serviceId, bookingId } = params;
  
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    capture_method: 'manual',
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
  
  return {
    clientSecret: nullableToString(paymentIntent.client_secret),
    paymentIntentId: nullableToString(paymentIntent.id),
    platformFee,
    escrowEnabled: true,
  };
}

async function releaseEscrowPayment(params: any) {
  const { paymentIntentId, connectedAccountId } = params;
  
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
  
  const platformFee = parseInt(paymentIntent.metadata.platformFee || '0');
  const transferAmount = paymentIntent.amount - platformFee;
  
  const transfer = await stripe.transfers.create({
    amount: transferAmount,
    currency: nullableToString(paymentIntent.currency),
    destination: connectedAccountId,
    transfer_group: paymentIntentId,
    metadata: {
      bookingId: nullableToString(paymentIntent.metadata.bookingId),
      serviceId: nullableToString(paymentIntent.metadata.serviceId),
      escrowRelease: 'true',
    },
  });
  
  return {
    success: true,
    transferId: nullableToString(transfer.id),
    amountTransferred: transferAmount,
    platformFee,
  };
}

async function processRefund(params: any) {
  const { paymentIntentId, amount, reason } = params;
  
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount,
    reason: reason || 'requested_by_customer',
  });
  
  return {
    refundId: nullableToString(refund.id),
    amount: nullableToString(refund.amount),
    status: nullableToString(refund.status),
  };
}