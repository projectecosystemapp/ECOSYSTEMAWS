import { defineFunction } from '@aws-amplify/backend';
import { stripeSecrets } from '../../security/stripe-secrets.js';
import { secretToString } from '../../../lib/type-utils';

/**
 * Booking Processor Lambda Function
 * 
 * Handles the complete booking creation flow with integrated payment processing.
 * Manages booking lifecycle from creation through confirmation and cancellation.
 * 
 * SECURITY FEATURES:
 * - Input validation and sanitization
 * - Provider account verification
 * - Double-booking prevention
 * - Commission calculation validation
 * - Comprehensive audit logging
 */
export const bookingProcessor = defineFunction({
  name: 'booking-processor',
  entry: './handler.ts',
  
  // Performance Configuration
  timeoutSeconds: 60,      // Sufficient for booking and payment processing
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