import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

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
        
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
        
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
        
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId, customerId, providerId } = paymentIntent.metadata;
  
  console.log('Payment succeeded for booking:', bookingId);
  
  try {
    // Update booking status to CONFIRMED
    // This would typically update your database
    // For now, just log the success
    console.log('Booking confirmed:', {
      bookingId,
      customerId,
      providerId,
      amount: paymentIntent.amount / 100,
    });
    
    // You could also send confirmation emails here
    // await sendBookingConfirmationEmail(bookingId);
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId, customerId } = paymentIntent.metadata;
  
  console.log('Payment failed for booking:', bookingId);
  
  try {
    // Update booking status or send notification
    console.log('Payment failed:', {
      bookingId,
      customerId,
      amount: paymentIntent.amount / 100,
      lastPaymentError: paymentIntent.last_payment_error,
    });
    
    // You could send failure notification emails here
    // await sendPaymentFailureEmail(bookingId);
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Stripe account updated:', account.id);
  
  try {
    // Update provider onboarding status if account is now fully enabled
    if (account.charges_enabled && account.payouts_enabled) {
      console.log('Provider account fully enabled:', {
        accountId: account.id,
        providerId: account.metadata?.providerId,
      });
      
      // Update provider status in database
      // await updateProviderStripeStatus(account.metadata.providerId, true);
    }
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log('Capability updated:', {
    account: capability.account,
    capability: capability.id,
    status: capability.status,
  });
  
  // Handle capability status changes
  // This can help track onboarding progress
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log('Dispute created:', dispute.id);
  
  // Freeze escrow funds if applicable
  // Notify provider and admin
  console.log('Dispute details:', {
    amount: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
    paymentIntent: dispute.payment_intent,
  });
  
  // TODO: Create dispute case in database
  // TODO: Send notifications to all parties
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log('Transfer created:', transfer.id);
  
  const { bookingId, escrowRelease } = transfer.metadata;
  
  if (escrowRelease === 'true') {
    // Escrow funds released to provider
    console.log('Escrow released:', {
      bookingId,
      amount: transfer.amount,
      destination: transfer.destination,
    });
    // TODO: Update booking status to COMPLETED
    // TODO: Trigger review request
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log('Payout paid:', payout.id);
  
  // Update provider balance and send confirmation
  console.log('Payout details:', {
    amount: payout.amount,
    arrivalDate: payout.arrival_date,
    destination: payout.destination,
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  // Create recurring booking in database
  console.log('Subscription details:', {
    customerId: subscription.customer,
    status: subscription.status,
    currentPeriodEnd: (subscription as any).current_period_end,
    items: subscription.items.data,
  });
  
  // TODO: Create recurring booking schedule
  // TODO: Notify provider of new subscription
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Process recurring payment
  console.log('Invoice details:', {
    subscriptionId: (invoice as any).subscription,
    customerId: invoice.customer,
    amountPaid: (invoice as any).amount_paid,
    periodStart: (invoice as any).period_start,
    periodEnd: (invoice as any).period_end,
  });
  
  // TODO: Create next booking instance
  // TODO: Update provider earnings
}