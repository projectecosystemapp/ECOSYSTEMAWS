import { defineFunction } from '@aws-amplify/backend';
// AWS-native ACH transfers - no Stripe dependencies

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
  memoryMB: 1024,         // Higher memory for multiple ACH API calls
  
  // Security Configuration
  environment: {
    // AWS ACH Transfer Configuration
    ACH_TRANSFERS_TABLE_NAME: 'ACHTransfers',
    ESCROW_TABLE_NAME: 'EscrowTransactions',
    ACH_BATCH_SIZE: '100',
    // Application Configuration
    USER_PROFILE_TABLE_NAME: 'UserProfile',
    SERVICE_TABLE_NAME: 'Service',
    BOOKING_TABLE_NAME: 'Booking',
    TRANSACTION_TABLE_NAME: 'Transaction',
    // Environment Identification
    NODE_ENV: 'production',
  },
  
  // Schedule Configuration (can be enabled via EventBridge)
  // schedule: 'rate(1 day)', // Run daily at midnight UTC
});