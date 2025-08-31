import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { generateClient } from 'aws-amplify/data/server';
import { type Schema } from '@/amplify/data/resource';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

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

    console.log(`Processing webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
        
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;
        
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;
        
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
        
      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;
        
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'refund.created':
        await handleRefundCreated(event.data.object as Stripe.Refund);
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

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  try {
    const bookingId = paymentIntent.metadata?.bookingId;
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata');
      return;
    }

    // Update booking status
    await client.models.Booking.update({
      id: bookingId,
      status: 'CONFIRMED',
      paymentStatus: 'ESCROW_HELD',
      paymentIntentId: paymentIntent.id,
    });

    // Create transaction record
    await client.models.Transaction.create({
      bookingId: bookingId,
      customerId: paymentIntent.metadata.customerId,
      providerId: paymentIntent.metadata.providerId,
      type: 'PAYMENT',
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string,
      status: 'COMPLETED',
      platformFee: paymentIntent.application_fee_amount ? paymentIntent.application_fee_amount / 100 : 0,
      netAmount: (paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) / 100,
      description: `Payment for booking ${bookingId}`,
      metadata: paymentIntent.metadata,
    });

    // Create notification for provider
    await client.models.Notification.create({
      userId: paymentIntent.metadata.providerId,
      type: 'PAYMENT_RECEIVED',
      title: 'New Booking Payment Received',
      message: `You have received a payment of $${(paymentIntent.amount / 100).toFixed(2)} for a new booking`,
      bookingId: bookingId,
    });

    console.log(`Payment processed for booking ${bookingId}`);
  } catch (error) {
    console.error('Error processing payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  try {
    const bookingId = paymentIntent.metadata?.bookingId;
    if (!bookingId) return;

    // Update booking status
    await client.models.Booking.update({
      id: bookingId,
      status: 'CANCELLED',
      paymentStatus: 'FAILED',
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'Payment failed',
    });

    // Notify customer
    await client.models.Notification.create({
      userId: paymentIntent.metadata.customerId,
      type: 'BOOKING_CANCELLED',
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again or use a different payment method.',
      bookingId: bookingId,
    });
  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Stripe account updated:', account.id);
  
  try {
    // Find user profile by Stripe account ID
    const { data: profiles } = await client.models.UserProfile.list({
      filter: { stripeAccountId: { eq: account.id } }
    });

    const profile = profiles?.[0];
    if (!profile) {
      console.error('No profile found for Stripe account:', account.id);
      return;
    }

    // Update provider profile with latest Stripe status
    await client.models.UserProfile.update({
      id: profile.id,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      stripeAccountStatus: account.charges_enabled ? 'ACTIVE' : 'PENDING',
      stripeRequirements: account.requirements as any,
      stripeCapabilities: account.capabilities as any,
    });

    // If account just became fully enabled, notify the provider
    if (account.charges_enabled && account.payouts_enabled && !profile.stripeChargesEnabled) {
      await client.models.Notification.create({
        userId: profile.id,
        type: 'SYSTEM_ALERT',
        title: 'Payment Account Activated!',
        message: 'Your payment account is now active. You can start accepting bookings and payments.',
      });
    }

    console.log(`Updated profile ${profile.id} with Stripe account status`);
  } catch (error) {
    console.error('Error updating account status:', error);
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log('Capability updated:', capability);
  // Similar to account.updated, update the provider's capabilities
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log('Charge succeeded:', charge.id);
  // Already handled by payment_intent.succeeded for most cases
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log('Payout paid:', payout.id);
  
  try {
    // Find the provider by the Stripe account
    const accountId = payout.destination as string;
    const { data: profiles } = await client.models.UserProfile.list({
      filter: { stripeAccountId: { eq: accountId } }
    });

    const profile = profiles?.[0];
    if (!profile) return;

    // Create transaction record for the payout
    await client.models.Transaction.create({
      bookingId: '', // Payouts are aggregated, not per booking
      customerId: '',
      providerId: profile.id,
      type: 'PAYOUT',
      amount: payout.amount / 100,
      currency: payout.currency,
      transferId: payout.id,
      status: 'COMPLETED',
      description: `Payout to bank account`,
      metadata: {
        arrivalDate: payout.arrival_date,
        method: payout.method,
        destination: payout.destination,
      },
    });

    // Notify provider
    await client.models.Notification.create({
      userId: profile.id,
      type: 'PAYMENT_RECEIVED',
      title: 'Payout Processed',
      message: `A payout of $${(payout.amount / 100).toFixed(2)} has been sent to your bank account`,
    });
  } catch (error) {
    console.error('Error processing payout:', error);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log('Payout failed:', payout.id);
  
  try {
    const accountId = payout.destination as string;
    const { data: profiles } = await client.models.UserProfile.list({
      filter: { stripeAccountId: { eq: accountId } }
    });

    const profile = profiles?.[0];
    if (!profile) return;

    // Notify provider of failed payout
    await client.models.Notification.create({
      userId: profile.id,
      type: 'SYSTEM_ALERT',
      title: 'Payout Failed',
      message: `A payout of $${(payout.amount / 100).toFixed(2)} failed. Please check your bank account information.`,
    });
  } catch (error) {
    console.error('Error processing payout failure:', error);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log('Transfer created:', transfer.id);
  // Transfers to connected accounts are tracked
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  try {
    const customerId = subscription.metadata?.customerId;
    const providerId = subscription.metadata?.providerId;
    const serviceId = subscription.metadata?.serviceId;

    if (!customerId || !providerId || !serviceId) {
      console.error('Missing metadata in subscription');
      return;
    }

    // Create subscription record
    await client.models.UserSubscription.create({
      customerId,
      providerId,
      serviceId,
      stripeSubscriptionId: subscription.id,
      status: 'ACTIVE',
      frequency: subscription.items.data[0]?.price?.recurring?.interval?.toUpperCase() as any || 'MONTHLY',
      startDate: new Date(subscription.current_period_start * 1000).toISOString(),
      nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
      amount: (subscription.items.data[0]?.price?.unit_amount || 0) / 100,
      currency: subscription.currency,
    });
  } catch (error) {
    console.error('Error creating subscription record:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  try {
    const { data: subscriptions } = await client.models.UserSubscription.list({
      filter: { stripeSubscriptionId: { eq: subscription.id } }
    });

    const sub = subscriptions?.[0];
    if (!sub) return;

    // Update subscription status
    await client.models.UserSubscription.update({
      id: sub.id,
      status: subscription.status === 'active' ? 'ACTIVE' : 
              subscription.status === 'canceled' ? 'CANCELLED' : 
              subscription.status === 'paused' ? 'PAUSED' : 'EXPIRED',
      nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  try {
    const { data: subscriptions } = await client.models.UserSubscription.list({
      filter: { stripeSubscriptionId: { eq: subscription.id } }
    });

    const sub = subscriptions?.[0];
    if (!sub) return;

    // Mark subscription as cancelled
    await client.models.UserSubscription.update({
      id: sub.id,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
  }
}

async function handleRefundCreated(refund: Stripe.Refund) {
  console.log('Refund created:', refund.id);
  
  try {
    const bookingId = refund.metadata?.bookingId;
    if (!bookingId) return;

    // Update booking status
    await client.models.Booking.update({
      id: bookingId,
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
    });

    // Create refund transaction
    await client.models.Transaction.create({
      bookingId,
      customerId: refund.metadata?.customerId || '',
      providerId: refund.metadata?.providerId || '',
      type: 'REFUND',
      amount: refund.amount / 100,
      currency: refund.currency,
      refundId: refund.id,
      paymentIntentId: refund.payment_intent as string,
      status: 'COMPLETED',
      description: `Refund for booking ${bookingId}`,
      metadata: refund.metadata,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
  }
}