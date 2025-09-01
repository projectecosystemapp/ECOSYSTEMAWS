import { AppSyncResolverHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { DynamoDBClient, UpdateItemCommand, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { WebhookDeduplicationService } from '../../data/webhook-deduplication';
import { correlationTracker } from '../../../lib/resilience/correlation-tracker';
import { PerformanceTracker } from '../../../lib/resilience/performance-tracker';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const dynamodb = new DynamoDBClient({});
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE_NAME || 'UserProfile';
const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME || 'Booking';
const TRANSACTION_TABLE = process.env.TRANSACTION_TABLE_NAME || 'Transaction';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

const webhookDedup = new WebhookDeduplicationService();
const performanceTracker = new PerformanceTracker('ECOSYSTEMAWS/Webhooks');

/**
 * Stripe Webhook Handler
 * 
 * Processes incoming webhook events from Stripe with proper security verification.
 * Now integrated with AppSync and includes:
 * - Atomic deduplication using DynamoDB conditional writes
 * - Correlation ID tracking for distributed tracing
 * - Performance metrics collection
 * 
 * SECURITY MEASURES:
 * - Webhook signature verification via Lambda authorizer
 * - Event type validation ensures only expected events are processed
 * - Atomic idempotency checks prevent duplicate processing
 * - Structured error handling with appropriate status codes
 */
export const handler: AppSyncResolverHandler<any, any> = async (event) => {
  const startTime = Date.now();
  // Extract correlation context from AppSync event
  const correlationId = event.identity?.resolverContext?.correlationId || 
                        correlationTracker.generateCorrelationId();
  
  return correlationTracker.runWithCorrelation('stripe-webhook-processing', async () => {
    console.log('[StripeWebhook] Processing event', {
      correlationId,
      arguments: event.arguments,
    });

    try {
      const { body, signature } = event.arguments;
      
      if (!body || !signature) {
        console.error('[StripeWebhook] Missing body or signature');
        return {
          success: false,
          error: 'Missing required parameters',
        };
      }

      // Parse the Stripe event from the body
      let stripeEvent: Stripe.Event;
      try {
        stripeEvent = JSON.parse(body) as Stripe.Event;
      } catch (err) {
        console.error('[StripeWebhook] Failed to parse event body:', err);
        return {
          success: false,
          error: 'Invalid event body',
        };
      }

      // Attempt to acquire processing lock for this event
      const { acquired, existingRecord } = await webhookDedup.acquireProcessingLock(
        stripeEvent.id,
        stripeEvent.type,
        signature,
        'stripe'
      );

      if (!acquired) {
        console.log('[StripeWebhook] Event already processed or being processed', {
          eventId: stripeEvent.id,
          status: existingRecord?.status,
          correlationId,
        });
        
        // Return the existing result if available
        if (existingRecord?.status === 'COMPLETED' && existingRecord.result) {
          return {
            success: true,
            data: existingRecord.result,
            deduplicated: true,
          };
        }
        
        return {
          success: false,
          error: 'Event is being processed by another handler',
          deduplicated: true,
        };
      }

      console.log('[StripeWebhook] Processing new event', {
        id: stripeEvent.id,
        type: stripeEvent.type,
        created: stripeEvent.created,
        correlationId,
      });

      let processingResult: any;
      
      try {
        // Process the event based on type
        switch (stripeEvent.type) {
      case 'account.updated':
        await handleAccountUpdated(stripeEvent);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(stripeEvent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(stripeEvent);
        break;
        
      case 'payment_intent.created':
        await handlePaymentCreated(stripeEvent);
        break;
        
      case 'charge.succeeded':
        await handleChargeSucceeded(stripeEvent);
        break;
        
      case 'charge.dispute.created':
        await handleDisputeCreated(stripeEvent);
        break;
        
      case 'transfer.created':
      case 'transfer.updated':
        await handleTransferUpdated(stripeEvent);
        break;
        
      case 'payout.created':
      case 'payout.updated':
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutUpdated(stripeEvent);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(stripeEvent);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(stripeEvent);
        break;
        
        default:
          console.log('[StripeWebhook] Unhandled event type:', stripeEvent.type);
          processingResult = { unhandled: true, type: stripeEvent.type };
        }

        // Mark the webhook as successfully completed
        await webhookDedup.markCompleted(stripeEvent.id, processingResult);
        
        // Record success metrics
        const duration = Date.now() - startTime;
        performanceTracker.recordMetric(
          `webhook-${stripeEvent.type}`,
          duration,
          true,
          'appsync'
        );

        return {
          success: true,
          data: processingResult,
          eventId: stripeEvent.id,
          eventType: stripeEvent.type,
          duration,
        };
      } catch (processingError) {
        console.error('[StripeWebhook] Error processing event:', processingError);
        
        // Mark the webhook as failed
        await webhookDedup.markFailed(
          stripeEvent.id,
          processingError instanceof Error ? processingError.message : 'Unknown error',
          true // Allow retry
        );
        
        throw processingError;
      }
    } catch (error) {
      console.error('[StripeWebhook] Fatal error:', error);
      
      // Record failure metrics
      const duration = Date.now() - startTime;
      performanceTracker.recordMetric(
        'webhook-processing',
        duration,
        false,
        'appsync',
        error instanceof Error ? error.constructor.name : 'UnknownError'
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
        duration,
      };
    }
  });
};

/**
 * Handle Stripe Connect account updates
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  
  console.log('Processing account update:', {
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });

  const providerId = account.metadata?.providerId || null;
  
  if (providerId) {
    // Determine account status
    let accountStatus = 'PENDING';
    if (account.charges_enabled && account.payouts_enabled) {
      accountStatus = 'ACTIVE';
    } else if (account.requirements && account.requirements.disabled_reason) {
      accountStatus = 'RESTRICTED';
    }

    await dynamodb.send(
      new UpdateItemCommand({
        TableName: USER_PROFILE_TABLE,
        Key: {
          id: { S: providerId },
        },
        UpdateExpression: `
          SET stripeOnboardingComplete = :complete, 
              stripeAccountStatus = :status, 
              stripeChargesEnabled = :chargesEnabled,
              stripePayoutsEnabled = :payoutsEnabled,
              stripeDetailsSubmitted = :detailsSubmitted,
              stripeRequirements = :requirements,
              stripeCapabilities = :capabilities,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ':complete': { BOOL: account.charges_enabled && account.payouts_enabled },
          ':status': { S: accountStatus },
          ':chargesEnabled': { BOOL: account.charges_enabled || false },
          ':payoutsEnabled': { BOOL: account.payouts_enabled || false },
          ':detailsSubmitted': { BOOL: account.details_submitted || false },
          ':requirements': { S: JSON.stringify(account.requirements || {}) },
          ':capabilities': { S: JSON.stringify(account.capabilities || {}) },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })
    );
    
    console.log('Updated provider account status:', {
      providerId,
      status: accountStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  }
}

/**
 * Handle successful payment intents
 */
async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log('Payment succeeded:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    bookingId: paymentIntent.metadata.bookingId,
  });

  const bookingId = paymentIntent.metadata?.bookingId || null;
  const customerId = paymentIntent.metadata?.customerId || null;
  const providerId = paymentIntent.metadata?.providerId || null;

  if (bookingId) {
    // Update booking status to confirmed
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: BOOKING_TABLE,
        Key: {
          id: { S: bookingId },
        },
        UpdateExpression: `
          SET #status = :status, 
              paymentStatus = :paymentStatus,
              paymentIntentId = :paymentIntentId,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: 'CONFIRMED' },
          ':paymentStatus': { S: 'ESCROW_HELD' },
          ':paymentIntentId': { S: paymentIntent.id },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })
    );

    // Create transaction record
    await createTransactionRecord({
      bookingId,
      customerId,
      providerId,
      paymentIntent,
      type: 'PAYMENT',
    });

    console.log('Updated booking and created transaction record:', bookingId);
  }
}

/**
 * Handle failed payment intents
 */
async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log('Payment failed:', {
    paymentIntentId: paymentIntent.id,
    lastPaymentError: paymentIntent.last_payment_error?.message || 'No error message',
    bookingId: paymentIntent.metadata.bookingId,
  });

  // Handle failed payment (notify customer, update booking status, etc.)
  // Implementation depends on your business logic
}

/**
 * Handle dispute creation
 */
async function handleDisputeCreated(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute;
  
  console.log('Dispute created:', {
    disputeId: dispute.id,
    amount: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
  });

  // Handle dispute (notify provider, gather evidence, etc.)
  // Implementation depends on your dispute management process
}

/**
 * Handle payment intent creation
 */
async function handlePaymentCreated(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log('Payment intent created:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    bookingId: paymentIntent.metadata.bookingId,
  });

  const bookingId = paymentIntent.metadata?.bookingId || null;
  if (bookingId) {
    // Update booking with payment intent ID
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: BOOKING_TABLE,
        Key: {
          id: { S: bookingId },
        },
        UpdateExpression: 'SET paymentIntentId = :paymentIntentId, paymentStatus = :paymentStatus, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':paymentIntentId': { S: paymentIntent.id },
          ':paymentStatus': { S: 'PENDING' },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })
    );
  }
}

/**
 * Handle successful charges
 */
async function handleChargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  
  console.log('Charge succeeded:', {
    chargeId: charge.id,
    amount: charge.amount,
    paymentIntentId: charge.payment_intent,
  });

  // Update transaction record with charge ID
  if (charge.payment_intent) {
    // Find and update the transaction record
    const transactionId = `txn_${charge.payment_intent}`;
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: TRANSACTION_TABLE,
        Key: {
          id: { S: transactionId },
        },
        UpdateExpression: 'SET chargeId = :chargeId, #status = :status, processedAt = :processedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':chargeId': { S: charge.id },
          ':status': { S: 'COMPLETED' },
          ':processedAt': { S: new Date().toISOString() },
        },
      })
    );
  }
}

/**
 * Handle transfer updates
 */
async function handleTransferUpdated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  
  console.log('Transfer updated:', {
    transferId: transfer.id,
    amount: transfer.amount,
    destinationAccount: transfer.destination,
  });

  // Update booking with transfer information
  if (transfer.metadata?.bookingId) {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: BOOKING_TABLE,
        Key: {
          id: { S: transfer.metadata.bookingId },
        },
        UpdateExpression: 'SET transferId = :transferId, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':transferId': { S: transfer.id },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })
    );
  }
}

/**
 * Handle payout updates
 */
async function handlePayoutUpdated(event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout;
  
  console.log('Payout updated:', {
    payoutId: payout.id,
    amount: payout.amount,
    status: payout.status,
    arrivalDate: payout.arrival_date,
  });

  // Create payout transaction record
  if (payout.metadata?.providerId) {
    await createTransactionRecord({
      bookingId: null, // Payout might be for multiple bookings
      customerId: null,
      providerId: payout.metadata.providerId,
      payoutData: payout,
      type: 'PAYOUT',
    });
  }
}

/**
 * Handle invoice payment success (for subscriptions)
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  
  console.log('Invoice payment succeeded:', {
    invoiceId: invoice.id,
    subscriptionId: (invoice as any).subscription || null,
    amount: invoice.amount_paid,
  });

  // Update subscription record if needed
  const subscriptionId = (invoice as any).subscription;
  if (subscriptionId && invoice.metadata?.customerId) {
    // This would update UserSubscription table
    // Implementation depends on subscription tracking needs
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log('Subscription updated:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || 'unknown',
  });

  // Update UserSubscription table based on Stripe subscription changes
  // Implementation depends on subscription model
}

/**
 * Create transaction record helper
 */
async function createTransactionRecord(params: {
  bookingId: string | null;
  customerId: string | null;
  providerId: string | null;
  paymentIntent?: Stripe.PaymentIntent;
  payoutData?: Stripe.Payout;
  type: 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'FEE';
}) {
  const { bookingId, customerId, providerId, paymentIntent, payoutData, type } = params;
  
  let transactionId: string;
  let amount: number;
  let platformFee = 0;
  let description = '';
  let metadata: any = {};

  if (paymentIntent) {
    transactionId = `txn_${paymentIntent.id}`;
    amount = paymentIntent.amount / 100; // Convert from cents
    platformFee = paymentIntent.application_fee_amount ? paymentIntent.application_fee_amount / 100 : 0;
    description = `Payment for booking ${bookingId}`;
    metadata = paymentIntent.metadata;
  } else if (payoutData) {
    transactionId = `payout_${payoutData.id}`;
    amount = payoutData.amount / 100; // Convert from cents
    description = `Payout to provider`;
    metadata = payoutData.metadata;
  } else {
    transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    amount = 0;
  }

  await dynamodb.send(
    new PutItemCommand({
      TableName: TRANSACTION_TABLE,
      Item: {
        id: { S: transactionId },
        bookingId: bookingId ? { S: bookingId } : { NULL: true },
        customerId: customerId ? { S: customerId } : { NULL: true },
        providerId: providerId ? { S: providerId } : { NULL: true },
        type: { S: type },
        amount: { N: amount.toString() },
        currency: { S: 'USD' },
        paymentIntentId: paymentIntent ? { S: paymentIntent.id } : { NULL: true },
        status: { S: 'COMPLETED' },
        platformFee: { N: platformFee.toString() },
        netAmount: { N: (amount - platformFee).toString() },
        description: { S: description },
        metadata: { S: JSON.stringify(metadata) },
        createdAt: { S: new Date().toISOString() },
        processedAt: { S: new Date().toISOString() },
      },
    })
  );

  console.log('Created transaction record:', transactionId);
}