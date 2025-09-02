import { defineFunction } from '@aws-amplify/backend';
import { stripeSecrets } from '../../security/stripe-secrets.js';

/**
 * Stripe Webhook Lambda Function
 * 
 * Processes incoming webhooks from Stripe with proper security verification.
 * Handles all payment-related events and updates application state accordingly.
 * 
 * SECURITY FEATURES:
 * - Webhook signature verification
 * - All secrets from AWS Secrets Manager
 * - Structured logging for audit compliance
 * - Idempotency handling for webhook events
 */
export const stripeWebhook = defineFunction({
  name: 'stripe-webhook',
  entry: './handler.ts',
  runtime: 20,
  
  // Performance Configuration
  timeoutSeconds: 60,      // Sufficient for webhook processing
  memoryMB: 512,          // Adequate for database operations
  
  // Security Configuration
  environment: {
    // Stripe Configuration
    STRIPE_SECRET_KEY: stripeSecrets.secretKey,
    STRIPE_WEBHOOK_SECRET: stripeSecrets.webhookSecret,
    
    // Application Configuration
    APP_URL: stripeSecrets.appUrl,
    USER_PROFILE_TABLE_NAME: stripeSecrets.userProfileTableName,
    SERVICE_TABLE_NAME: stripeSecrets.serviceTableName,
    BOOKING_TABLE_NAME: stripeSecrets.bookingTableName,
    TRANSACTION_TABLE_NAME: stripeSecrets.transactionTableName,
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});