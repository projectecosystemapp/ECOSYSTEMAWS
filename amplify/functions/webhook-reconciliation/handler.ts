/**
 * Webhook Reconciliation Lambda
 * 
 * Scheduled function that runs daily to reconcile webhook events and ensure
 * data consistency between Stripe and our database during the migration period.
 * 
 * Responsibilities:
 * - Check for missed webhook events
 * - Verify data consistency between Stripe and DynamoDB
 * - Process any failed webhooks that should be retried
 * - Generate reconciliation reports
 * - Alert on discrepancies
 */

import { ScheduledHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';
import { 
  DynamoDBClient, 
  QueryCommand, 
  ScanCommand,
  BatchGetItemCommand 
} from '@aws-sdk/client-dynamodb';
import { 
  CloudWatchClient, 
  PutMetricDataCommand,
  MetricDatum 
} from '@aws-sdk/client-cloudwatch';
import { 
  SNSClient, 
  PublishCommand 
} from '@aws-sdk/client-sns';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { env } from '$amplify/env/webhook-reconciliation';
import { WebhookDeduplicationService } from '../../data/webhook-deduplication';
import { correlationTracker } from '../../../lib/resilience/correlation-tracker';
import { processWebhook } from '../../../lib/amplify-client-wrapper';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

const dynamodb = new DynamoDBClient({
  region: env.AWS_REGION || 'us-east-1',
});

const cloudwatch = new CloudWatchClient({
  region: env.AWS_REGION || 'us-east-1',
});

const sns = new SNSClient({
  region: env.AWS_REGION || 'us-east-1',
});

const webhookDedup = new WebhookDeduplicationService();

// Configuration
const RECONCILIATION_WINDOW_HOURS = 24; // Look back 24 hours
const MAX_RETRY_ATTEMPTS = 3;
const CRITICAL_EVENT_TYPES = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.succeeded',
  'charge.failed',
  'charge.dispute.created',
  'transfer.created',
  'payout.paid',
  'payout.failed',
];

interface ReconciliationResult {
  totalEventsChecked: number;
  missedEvents: number;
  failedEvents: number;
  retriedEvents: number;
  successfulRetries: number;
  discrepancies: Array<{
    eventId: string;
    type: string;
    issue: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  duration: number;
}

export const handler: ScheduledHandler = async (event) => {
  const startTime = Date.now();
  
  return correlationTracker.runWithCorrelation('webhook-reconciliation', async () => {
    console.log('[WebhookReconciliation] Starting scheduled reconciliation', {
      eventTime: nullableToString(event.time),
      correlationId: correlationTracker.getCurrentCorrelationId(),
    });

    const result: ReconciliationResult = {
      totalEventsChecked: 0,
      missedEvents: 0,
      failedEvents: 0,
      retriedEvents: 0,
      successfulRetries: 0,
      discrepancies: [],
      duration: 0,
    };

    try {
      // Step 1: Fetch recent Stripe events
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - RECONCILIATION_WINDOW_HOURS);
      
      const stripeEvents = await fetchRecentStripeEvents(cutoffTime);
      result.totalEventsChecked = stripeEvents.length;
      
      console.log(`[WebhookReconciliation] Checking ${stripeEvents.length} Stripe events`);

      // Step 2: Check each event against our records
      for (const stripeEvent of stripeEvents) {
        const webhookRecord = await webhookDedup.getWebhookRecord(stripeEvent.id);
        
        if (!webhookRecord) {
          // Event was never processed
          result.missedEvents++;
          
          if (CRITICAL_EVENT_TYPES.includes(stripeEvent.type)) {
            result.discrepancies.push({
              eventId: nullableToString(stripeEvent.id),
              type: nullableToString(stripeEvent.type),
              issue: 'Event never processed',
              severity: 'CRITICAL',
            });
            
            // Attempt to process the missed event
            await processMissedEvent(stripeEvent, result);
          } else {
            result.discrepancies.push({
              eventId: nullableToString(stripeEvent.id),
              type: nullableToString(stripeEvent.type),
              issue: 'Event never processed',
              severity: 'MEDIUM',
            });
          }
        } else if (webhookRecord.status === 'FAILED') {
          // Event failed processing
          result.failedEvents++;
          
          if (webhookRecord.retryCount < MAX_RETRY_ATTEMPTS) {
            // Retry failed event
            await retryFailedEvent(stripeEvent, webhookRecord, result);
          } else {
            result.discrepancies.push({
              eventId: nullableToString(stripeEvent.id),
              type: nullableToString(stripeEvent.type),
              issue: `Failed after ${webhookRecord.retryCount} attempts: ${webhookRecord.error}`,
              severity: 'HIGH',
            });
          }
        } else if (webhookRecord.status === 'PROCESSING') {
          // Check if stuck in processing
          const processingDuration = Date.now() - (webhookRecord.processingStartedAt || 0);
          
          if (processingDuration > 300000) { // 5 minutes
            result.discrepancies.push({
              eventId: nullableToString(stripeEvent.id),
              type: nullableToString(stripeEvent.type),
              issue: `Stuck in processing for ${Math.floor(processingDuration / 60000)} minutes`,
              severity: 'HIGH',
            });
          }
        }
        
        // Additional data consistency checks based on event type
        if (webhookRecord?.status === 'COMPLETED') {
          await verifyDataConsistency(stripeEvent, webhookRecord, result);
        }
      }

      // Step 3: Check for orphaned database records
      await checkOrphanedRecords(cutoffTime, result);

      // Step 4: Send metrics to CloudWatch
      await sendMetrics(result);

      // Step 5: Send alert if critical issues found
      if (result.discrepancies.filter(d => d.severity === 'CRITICAL').length > 0) {
        await sendAlert(result);
      }

      result.duration = Date.now() - startTime;

      console.log('[WebhookReconciliation] Reconciliation completed', {
        ...result,
        correlationId: correlationTracker.getCurrentCorrelationId(),
      });

      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    } catch (error) {
      console.error('[WebhookReconciliation] Reconciliation failed', error);
      
      // Send critical alert
      await sendCriticalAlert(error);
      
      throw error;
    }
  });
};

/**
 * Fetch recent events from Stripe
 */
async function fetchRecentStripeEvents(since: Date): Promise<Stripe.Event[]> {
  const events: Stripe.Event[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.events.list({
      created: {
        gte: Math.floor(since.getTime() / 1000),
      },
      limit: 100,
      starting_after: startingAfter,
    });

    events.push(...batch.data);
    
    if (batch.has_more && batch.data.length > 0) {
      startingAfter = batch.data[batch.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  return events;
}

/**
 * Process a missed webhook event
 */
async function processMissedEvent(
  event: nullableToString(Stripe.Event),
  result: ReconciliationResult
): Promise<void> {
  try {
    console.log(`[WebhookReconciliation] Processing missed event: ${event.id} (${event.type})`);
    
    // Create a synthetic webhook signature for reconciliation
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(event);
    const signature = `t=${timestamp},v1=reconciliation_${event.id}`;

    const response = await processWebhook({
      body: payload,
      signature,
      provider: 'stripe',
    });

    if (response.success) {
      result.successfulRetries++;
      console.log(`[WebhookReconciliation] Successfully processed missed event: ${event.id}`);
    } else {
      console.error(`[WebhookReconciliation] Failed to process missed event: ${event.id}`, response.error);
    }
  } catch (error) {
    console.error(`[WebhookReconciliation] Error processing missed event: ${event.id}`, error);
  }
}

/**
 * Retry a failed webhook event
 */
async function retryFailedEvent(
  event: nullableToString(Stripe.Event),
  webhookRecord: any,
  result: ReconciliationResult
): Promise<void> {
  try {
    console.log(`[WebhookReconciliation] Retrying failed event: ${event.id} (attempt ${webhookRecord.retryCount + 1})`);
    
    result.retriedEvents++;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(event);
    const signature = `t=${timestamp},v1=retry_${event.id}`;

    const response = await processWebhook({
      body: payload,
      signature,
      provider: 'stripe',
    });

    if (response.success) {
      result.successfulRetries++;
      console.log(`[WebhookReconciliation] Successfully retried event: ${event.id}`);
    }
  } catch (error) {
    console.error(`[WebhookReconciliation] Error retrying event: ${event.id}`, error);
  }
}

/**
 * Verify data consistency between Stripe and our database
 */
async function verifyDataConsistency(
  stripeEvent: nullableToString(Stripe.Event),
  webhookRecord: any,
  result: ReconciliationResult
): Promise<void> {
  // Implementation depends on event type
  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
      await verifyPaymentIntentConsistency(stripeEvent, result);
      break;
    case 'charge.succeeded':
      await verifyChargeConsistency(stripeEvent, result);
      break;
    case 'transfer.created':
      await verifyTransferConsistency(stripeEvent, result);
      break;
    // Add more verification logic as needed
  }
}

/**
 * Verify payment intent consistency
 */
async function verifyPaymentIntentConsistency(
  event: nullableToString(Stripe.Event),
  result: ReconciliationResult
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  // Check if booking exists with this payment intent ID
  const response = await dynamodb.send(new QueryCommand({
    TableName: nullableToString(env.BOOKING_TABLE_NAME),
    IndexName: 'PaymentIntentIndex',
    KeyConditionExpression: 'paymentIntentId = :pid',
    ExpressionAttributeValues: marshall({
      ':pid': nullableToString(paymentIntent.id),
    }),
  }));

  if (!response.Items || response.Items.length === 0) {
    result.discrepancies.push({
      eventId: nullableToString(event.id),
      type: nullableToString(event.type),
      issue: `No booking found for payment intent ${paymentIntent.id}`,
      severity: 'HIGH',
    });
  }
}

/**
 * Verify charge consistency
 */
async function verifyChargeConsistency(
  event: nullableToString(Stripe.Event),
  result: ReconciliationResult
): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  
  // Verify charge amount matches booking amount
  if (charge.payment_intent) {
    const response = await dynamodb.send(new QueryCommand({
      TableName: nullableToString(env.BOOKING_TABLE_NAME),
      IndexName: 'PaymentIntentIndex',
      KeyConditionExpression: 'paymentIntentId = :pid',
      ExpressionAttributeValues: marshall({
        ':pid': nullableToString(charge.payment_intent),
      }),
    }));

    if (response.Items && response.Items.length > 0) {
      const booking = unmarshall(response.Items[0]);
      
      if (booking.amount * 100 !== charge.amount) { // Convert to cents
        result.discrepancies.push({
          eventId: nullableToString(event.id),
          type: nullableToString(event.type),
          issue: `Charge amount mismatch: Stripe=${charge.amount}, Booking=${booking.amount * 100}`,
          severity: 'CRITICAL',
        });
      }
    }
  }
}

/**
 * Verify transfer consistency
 */
async function verifyTransferConsistency(
  event: nullableToString(Stripe.Event),
  result: ReconciliationResult
): Promise<void> {
  const transfer = event.data.object as Stripe.Transfer;
  
  // Verify transfer destination and amount
  // Implementation depends on your business logic
}

/**
 * Check for orphaned database records
 */
async function checkOrphanedRecords(
  since: Date,
  result: ReconciliationResult
): Promise<void> {
  // Scan for bookings without corresponding Stripe records
  const response = await dynamodb.send(new ScanCommand({
    TableName: nullableToString(env.BOOKING_TABLE_NAME),
    FilterExpression: 'createdAt > :since AND paymentStatus = :status',
    ExpressionAttributeValues: marshall({
      ':since': since.toISOString(),
      ':status': 'pending',
    }),
  }));

  if (response.Items) {
    for (const item of response.Items) {
      const booking = unmarshall(item);
      
      if (booking.paymentIntentId) {
        try {
          // Check if payment intent exists in Stripe
          const paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
          
          if (paymentIntent.status === 'succeeded' && booking.paymentStatus === 'pending') {
            result.discrepancies.push({
              eventId: nullableToString(booking.id),
              type: 'booking',
              issue: `Booking ${booking.id} shows pending but Stripe shows succeeded`,
              severity: 'HIGH',
            });
          }
        } catch (error) {
          // Payment intent doesn't exist in Stripe
          result.discrepancies.push({
            eventId: nullableToString(booking.id),
            type: 'booking',
            issue: `Payment intent ${booking.paymentIntentId} not found in Stripe`,
            severity: 'CRITICAL',
          });
        }
      }
    }
  }
}

/**
 * Send metrics to CloudWatch
 */
async function sendMetrics(result: ReconciliationResult): Promise<void> {
  const metrics: MetricDatum[] = [
    {
      MetricName: 'WebhookReconciliation.EventsChecked',
      Value: nullableToString(result.totalEventsChecked),
      Unit: 'Count',
      Timestamp: new Date(),
    },
    {
      MetricName: 'WebhookReconciliation.MissedEvents',
      Value: nullableToString(result.missedEvents),
      Unit: 'Count',
      Timestamp: new Date(),
    },
    {
      MetricName: 'WebhookReconciliation.FailedEvents',
      Value: nullableToString(result.failedEvents),
      Unit: 'Count',
      Timestamp: new Date(),
    },
    {
      MetricName: 'WebhookReconciliation.SuccessfulRetries',
      Value: nullableToString(result.successfulRetries),
      Unit: 'Count',
      Timestamp: new Date(),
    },
    {
      MetricName: 'WebhookReconciliation.Discrepancies',
      Value: nullableToString(result.discrepancies.length),
      Unit: 'Count',
      Timestamp: new Date(),
    },
  ];

  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'ECOSYSTEMAWS/Webhooks',
    MetricData: metrics,
  }));
}

/**
 * Send alert for critical issues
 */
async function sendAlert(result: ReconciliationResult): Promise<void> {
  const criticalIssues = result.discrepancies.filter(d => d.severity === 'CRITICAL');
  
  const message = {
    Subject: '🚨 Critical Webhook Reconciliation Issues',
    Message: JSON.stringify({
      summary: `Found ${criticalIssues.length} critical issues during webhook reconciliation`,
      totalChecked: nullableToString(result.totalEventsChecked),
      missedEvents: nullableToString(result.missedEvents),
      failedEvents: nullableToString(result.failedEvents),
      criticalIssues,
      correlationId: correlationTracker.getCurrentCorrelationId(),
    }, null, 2),
  };

  if (env.ALERT_TOPIC_ARN) {
    await sns.send(new PublishCommand({
      TopicArn: nullableToString(env.ALERT_TOPIC_ARN),
      Subject: nullableToString(message.Subject),
      Message: nullableToString(message.Message),
    }));
  }

  console.error('[WebhookReconciliation] Critical alert sent:', message);
}

/**
 * Send critical system alert
 */
async function sendCriticalAlert(error: any): Promise<void> {
  const message = {
    Subject: '🔥 Webhook Reconciliation System Failure',
    Message: JSON.stringify({
      error: error?.message || 'Unknown error',
      stack: nullableToString(error?.stack),
      correlationId: correlationTracker.getCurrentCorrelationId(),
      timestamp: new Date().toISOString(),
    }, null, 2),
  };

  if (env.ALERT_TOPIC_ARN) {
    await sns.send(new PublishCommand({
      TopicArn: nullableToString(env.ALERT_TOPIC_ARN),
      Subject: nullableToString(message.Subject),
      Message: nullableToString(message.Message),
    }));
  }

  console.error('[WebhookReconciliation] System failure alert sent:', message);
}