import { defineFunction } from '@aws-amplify/backend';
import { stripeSecrets } from '../../security/stripe-secrets.js';
import { secretToString } from "../../../lib/type-utils";

/**
 * Stripe Connect Lambda Function
 * 
 * Handles Stripe Connect account creation, onboarding, and payment processing
 * with secure secret management via AWS Secrets Manager.
 * 
 * SECURITY FEATURES:
 * - All secrets retrieved from AWS Secrets Manager
 * - IAM role with least privilege permissions
 * - Environment-specific configurations
 * - Structured logging for audit compliance
 */
export const stripeConnect = defineFunction({
  name: 'stripe-connect',
  entry: './handler.ts',
  
  // Performance Configuration
  timeoutSeconds: 30,      // Sufficient for Stripe API calls
  memoryMB: 512,          // Adequate for payment processing
  
  // Security Configuration - All secrets from AWS Secrets Manager
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
  
  // Additional security configurations can be added here:
  // - VPC configuration for network isolation
  // - Reserved concurrency to prevent DDoS
  // - X-Ray tracing for monitoring
});