import { generateClient } from 'aws-amplify/data';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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
        await handlePaymentSucceeded(event.data.object, client);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, client);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object, client);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, client);
        break;

      case 'payout.created':
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutEvent(event.data.object, event.type, client);
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

    // Update booking status and payment status (funds held in escrow)
    await client.models.Booking.update({
      id: metadata.bookingId,
      status: 'CONFIRMED',
      paymentStatus: 'ESCROW_HELD',
    }, { authMode: 'apiKey' });

    // Create transaction record
    await client.models.Transaction.create({
      bookingId: metadata.bookingId,
      customerId: metadata.customerId,
      providerId: metadata.providerId,
      type: 'PAYMENT',
      amountCents: paymentIntent.amount, // Already cents
      currency: paymentIntent.currency.toUpperCase(),
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string,
      status: 'COMPLETED',
      platformFeeCents: metadata.platformFeeCents ? parseInt(metadata.platformFeeCents, 10) : undefined,
      netAmountCents: metadata.providerAmountCents ? parseInt(metadata.providerAmountCents, 10) : undefined,
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

    // Update only payment status
    await client.models.Booking.update({
      id: metadata.bookingId,
      paymentStatus: 'FAILED',
    }, { authMode: 'apiKey' });

    console.log(`Payment failed for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleAccountUpdated(account: Stripe.Account, client: any) {
  try {
    // Find provider by Stripe account ID
    const { data: providers } = await client.models.ProviderProfile.list({
      filter: { stripeAccountId: { eq: account.id } }
    });
    const provider = providers?.[0];

    if (!provider) {
      console.log(`No provider found for Stripe account ${account.id}`);
      return;
    }

    // Update provider status fields
    await client.models.ProviderProfile.update({
      id: provider.id,
      payoutsEnabled: account.payouts_enabled || false,
      stripeOnboardingStatus: account.charges_enabled && account.payouts_enabled ? 'COMPLETE' : 'IN_PROGRESS',
      requiresAction: (account.requirements?.currently_due?.length || 0) > 0,
      stripeDisabledReason: account.disabled_reason || undefined,
      missingRequirements: account.requirements || undefined,
      updatedAt: new Date().toISOString(),
    }, { authMode: 'apiKey' });

    console.log(`Account updated for provider ${provider.id}`);
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

    // Create refund transaction (cents)
    await client.models.Transaction.create({
      bookingId: metadata.bookingId,
      customerId: metadata.customerId,
      providerId: metadata.providerId,
      type: 'REFUND',
      amountCents: (charge.amount_refunded || 0),
      currency: charge.currency.toUpperCase(),
      chargeId: charge.id,
      refundId: charge.refunds?.data[0]?.id,
      status: 'COMPLETED',
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

    // Skip creating payout Transaction here (schema links payouts via booking context)

    console.log(`Payout ${eventType} for provider ${providerId}`);
  } catch (error) {
    console.error('Error handling payout event:', error);
  }
}

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
}