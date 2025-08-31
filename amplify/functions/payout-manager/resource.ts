import { defineFunction } from '@aws-amplify/backend';
import { stripeSecrets } from '../../security/stripe-secrets.js';

/**
 * Payout Manager Lambda Function
 * 
 * Handles automated and manual payout processing for providers.
 * Can be invoked by:
 * - EventBridge schedule for automated payouts
 * - API Gateway for manual payout operations
 * - Direct invocation for specific provider operations
 * 
 * SECURITY FEATURES:
 * - All secrets from AWS Secrets Manager
 * - Enhanced memory allocation for batch processing
 * - Extended timeout for payout operations
 * - Structured logging for audit compliance
 */
export const payoutManager = defineFunction({
  name: 'payout-manager',
  entry: './handler.ts',
  
  // Performance Configuration
  timeoutSeconds: 300,     // 5 minutes for batch processing
  memoryMB: 1024,         // Higher memory for multiple Stripe API calls
  
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
  
  // Schedule Configuration (can be enabled via EventBridge)
  // schedule: 'rate(1 day)', // Run daily at midnight UTC
});