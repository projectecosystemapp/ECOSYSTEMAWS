import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Create payment intent with marketplace commission
export async function createPaymentIntent({
  amount,
  isGuest = false,
  providerId,
  bookingId,
  customerEmail,
}: {
  amount: number; // Base amount in cents
  isGuest?: boolean;
  providerId: string;
  bookingId: string;
  customerEmail: string;
}) {
  const platformFee = Math.round(amount * 0.1); // 10% commission
  const guestSurcharge = isGuest ? Math.round(amount * 0.1) : 0; // 10% guest surcharge
  const totalAmount = amount + guestSurcharge;

  return await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'usd',
    application_fee_amount: platformFee + guestSurcharge,
    transfer_data: {
      destination: providerId, // Provider's Stripe Connect account
    },
    metadata: {
      bookingId,
      providerId,
      baseAmount: amount.toString(),
      platformFee: platformFee.toString(),
      guestSurcharge: guestSurcharge.toString(),
      isGuest: isGuest.toString(),
    },
    receipt_email: customerEmail,
  });
}

// Create Stripe Connect account link for provider onboarding
export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

// Create Stripe Connect account
export async function createConnectAccount(providerId: string, email: string) {
  return await stripe.accounts.create({
    type: 'express',
    email,
    metadata: {
      providerId,
    },
  });
}

// Process refund with commission handling
export async function processRefund({
  paymentIntentId,
  refundAmount,
  reason = 'requested_by_customer',
}: {
  paymentIntentId: string;
  refundAmount: number;
  reason?: string;
}) {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refundAmount,
    reason,
  });
}

// Get account status for provider
export async function getAccountStatus(accountId: string) {
  return await stripe.accounts.retrieve(accountId);
}

export { stripe };