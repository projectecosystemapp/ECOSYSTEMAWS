import { defineFunction } from '@aws-amplify/backend';
import { stripeSecrets } from '../../security/stripe-secrets.js';

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