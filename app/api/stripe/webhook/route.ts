import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/resource';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Create client for database operations
    const client = generateClient<Schema>();

    console.log('Processing webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, client);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, client);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account, client);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, client);
        break;

      case 'payout.created':
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutEvent(event.data.object as Stripe.Payout, event.type, client);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, client: any) {
  try {
    const { metadata } = paymentIntent;
    
    if (!metadata?.bookingId) {
      console.error('No booking ID in payment intent metadata');
      return;
    }

    // Update booking status
    await client.models.Booking.update({
      id: metadata.bookingId,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentCompletedAt: new Date().toISOString(),
    }, { authMode: 'apiKey' });

    // Create transaction record
    await client.models.Transaction.create({
      bookingId: metadata.bookingId,
      customerId: metadata.customerId,
      providerId: metadata.providerId,
      type: 'PAYMENT',
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency.toUpperCase(),
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string,
      status: 'COMPLETED',
      platformFee: parseFloat(metadata.platformFee || '0'),
      netAmount: parseFloat(metadata.providerAmount || '0'),
      processedAt: new Date().toISOString(),
    }, { authMode: 'apiKey' });

    console.log(`Payment succeeded for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, client: any) {
  try {
    const { metadata } = paymentIntent;
    
    if (!metadata?.bookingId) {
      return;
    }

    // Update booking status
    await client.models.Booking.update({
      id: metadata.bookingId,
      status: 'PAYMENT_FAILED',
      paymentStatus: 'FAILED',
    }, { authMode: 'apiKey' });

    console.log(`Payment failed for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleAccountUpdated(account: Stripe.Account, client: any) {
  try {
    // Find user profile by Stripe account ID
    const { data: profiles } = await client.models.UserProfile.list();
    const profile = profiles?.find((p: any) => p.stripeAccountId === account.id);

    if (!profile) {
      console.log(`No profile found for Stripe account ${account.id}`);
      return;
    }

    // Update account status
    await client.models.UserProfile.update({
      id: profile.id,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      stripeAccountStatus: account.charges_enabled ? 'ACTIVE' : 'PENDING',
      stripeOnboardingComplete: account.charges_enabled && account.payouts_enabled,
    }, { authMode: 'apiKey' });

    console.log(`Account updated for profile ${profile.id}`);
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge, client: any) {
  try {
    const { metadata } = charge;
    
    if (!metadata?.bookingId) {
      return;
    }

    // Update booking status
    await client.models.Booking.update({
      id: metadata.bookingId,
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      refundedAt: new Date().toISOString(),
    }, { authMode: 'apiKey' });

    // Create refund transaction
    await client.models.Transaction.create({
      bookingId: metadata.bookingId,
      customerId: metadata.customerId,
      providerId: metadata.providerId,
      type: 'REFUND',
      amount: (charge.amount_refunded || 0) / 100,
      currency: charge.currency.toUpperCase(),
      chargeId: charge.id,
      refundId: charge.refunds?.data[0]?.id,
      status: 'COMPLETED',
      processedAt: new Date().toISOString(),
    }, { authMode: 'apiKey' });

    console.log(`Refund processed for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling refund:', error);
  }
}

async function handlePayoutEvent(payout: Stripe.Payout, eventType: string, client: any) {
  try {
    // Extract provider ID from metadata or description
    const providerId = payout.metadata?.providerId;
    
    if (!providerId) {
      console.log('No provider ID in payout metadata');
      return;
    }

    const status = eventType === 'payout.paid' ? 'COMPLETED' : 
                   eventType === 'payout.failed' ? 'FAILED' : 'PROCESSING';

    // Create payout transaction
    await client.models.Transaction.create({
      providerId: providerId,
      type: 'PAYOUT',
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      status: status,
      description: `Payout to provider ${providerId}`,
      processedAt: new Date().toISOString(),
    }, { authMode: 'apiKey' });

    console.log(`Payout ${eventType} for provider ${providerId}`);
  } catch (error) {
    console.error('Error handling payout event:', error);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
}