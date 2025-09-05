import { defineFunction } from '@aws-amplify/backend';
// AWS-native ACH refunds - no Stripe dependencies

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
  memoryMB: 512,          // Adequate for ACH refund operations
  
  // Security Configuration
  environment: {
    // AWS ACH Refund Configuration
    ACH_REFUNDS_TABLE_NAME: 'ACHRefunds',
    ESCROW_TABLE_NAME: 'EscrowTransactions',
    REFUND_PROCESSING_ENABLED: 'true',
    // Application Configuration
    USER_PROFILE_TABLE_NAME: 'UserProfile',
    SERVICE_TABLE_NAME: 'Service',
    BOOKING_TABLE_NAME: 'Booking',
    TRANSACTION_TABLE_NAME: 'Transaction',
    // Environment Identification
    NODE_ENV: 'production',
  },
});