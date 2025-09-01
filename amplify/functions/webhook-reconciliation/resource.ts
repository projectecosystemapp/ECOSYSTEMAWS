/**
 * Webhook Reconciliation Lambda Resource
 * 
 * Scheduled function that ensures data consistency between Stripe and our database.
 * Runs daily to check for missed webhooks, retry failures, and alert on discrepancies.
 */

import { defineFunction, secret } from '@aws-amplify/backend';

export const webhookReconciliation = defineFunction({
  name: 'webhook-reconciliation',
  runtime: 20,
  timeoutSeconds: 300, // 5 minutes for thorough reconciliation
  memoryMB: 512,
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    BOOKING_TABLE_NAME: process.env.BOOKING_TABLE_NAME || 'Booking',
    USER_PROFILE_TABLE_NAME: process.env.USER_PROFILE_TABLE_NAME || 'UserProfile',
    TRANSACTION_TABLE_NAME: process.env.TRANSACTION_TABLE_NAME || 'Transaction',
    WEBHOOK_DEDUP_TABLE: process.env.WEBHOOK_DEDUP_TABLE || 'ProcessedWebhooks',
    ALERT_TOPIC_ARN: process.env.ALERT_TOPIC_ARN || '',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  },
  handler: 'handler.handler',
});