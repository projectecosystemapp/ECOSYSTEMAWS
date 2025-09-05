import { defineFunction } from '@aws-amplify/backend';
// AWS-native payment processing - no Stripe dependencies

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
  memoryMB: 512,          // Adequate for AWS payment operations
  
  // Security Configuration
  environment: {
    // AWS Payment Configuration
    AWS_PAYMENT_CRYPTOGRAPHY_ENABLED: 'true',
    ESCROW_TABLE_NAME: 'EscrowTransactions',
    ACH_TRANSFERS_TABLE_NAME: 'ACHTransfers',
    // Application Configuration
    USER_PROFILE_TABLE_NAME: 'UserProfile',
    SERVICE_TABLE_NAME: 'Service',
    BOOKING_TABLE_NAME: 'Booking',
    TRANSACTION_TABLE_NAME: 'Transaction',
    // Environment Identification
    NODE_ENV: 'production',
  },
});