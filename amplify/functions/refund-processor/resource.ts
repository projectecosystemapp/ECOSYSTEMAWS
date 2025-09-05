import { defineFunction } from '@aws-amplify/backend';
import { stripeSecrets } from '../../security/stripe-secrets.js';
import { secretToString } from "../../../lib/type-utils";

/**
 * Refund Processor Lambda Function
 * 
 * Handles refund processing for marketplace bookings with proper
 * commission handling and provider compensation logic.
 * 
 * SECURITY FEATURES:
 * - Transaction validation before processing
 * - All secrets from AWS Secrets Manager
 * - Comprehensive audit logging
 * - Idempotency handling
 */
export const refundProcessor = defineFunction({
  name: 'refund-processor',
  entry: './handler.ts',
  
  // Performance Configuration
  timeoutSeconds: 60,      // Sufficient for refund processing
  memoryMB: 512,          // Adequate for Stripe operations
  
  // Security Configuration
  environment: {
    // Stripe Configuration
    STRIPE_SECRET_KEY: secretToString(stripeSecrets.secretKey),
    STRIPE_WEBHOOK_SECRET: secretToString(stripeSecrets.webhookSecret),
    // Application Configuration
    APP_URL: secretToString(stripeSecrets.appUrl),
    USER_PROFILE_TABLE_NAME: secretToString(stripeSecrets.userProfileTableName),
    SERVICE_TABLE_NAME: secretToString(stripeSecrets.serviceTableName),
    BOOKING_TABLE_NAME: secretToString(stripeSecrets.bookingTableName),
    TRANSACTION_TABLE_NAME: secretToString(stripeSecrets.transactionTableName),
    // Environment Identification
    NODE_ENV: 'production',
  },
});