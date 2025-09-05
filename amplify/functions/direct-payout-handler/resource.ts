import { defineFunction } from '@aws-amplify/backend';

/**
 * Direct Payout Handler Lambda Function
 * 
 * Processes direct payouts to providers using ACH transfers:
 * - Releases funds from escrow accounts
 * - Initiates ACH transfers to provider bank accounts  
 * - Handles payout scheduling and batching
 * - Tracks payout status and reconciliation
 * 
 * DIRECT PAYOUT ADVANTAGES:
 * - No Stripe Connect dependency or fees
 * - Faster payouts (1-3 days vs 7 days for Stripe)
 * - Direct relationship with providers
 * - Better cash flow for marketplace
 */
export const directPayoutHandler = defineFunction({
  name: 'direct-payout-handler',
  entry: './handler.ts',
  
  // Performance Configuration
  timeoutSeconds: 60, // Longer timeout for batch processing
  memoryMB: 1024, // Higher memory for batch operations
  
  // Environment Configuration
  environment: {
    // DynamoDB Tables
    ACH_TRANSFER_TABLE: 'AchTransfer',
    ESCROW_ACCOUNT_TABLE: 'EscrowAccount', 
    BANK_ACCOUNT_TABLE: 'BankAccount',
    PROVIDER_PROFILE_TABLE: 'ProviderProfile',
    
    // Payout Configuration
    MINIMUM_PAYOUT_CENTS: '2000', // $20 minimum payout
    MAXIMUM_PAYOUT_CENTS: '100000', // $1000 maximum per transaction
    PAYOUT_SCHEDULE: 'daily', // daily, weekly, biweekly, monthly
    PAYOUT_CUTOFF_HOUR: '14', // 2 PM cutoff for same-day processing
    
    // Batch Processing
    MAX_BATCH_SIZE: '100', // Process up to 100 payouts per batch
    BATCH_PROCESSING_ENABLED: 'true',
    RETRY_ATTEMPTS: '3',
    RETRY_BACKOFF_MINUTES: '30',
    
    // Fee Configuration
    PAYOUT_FEE_CENTS: '25', // $0.25 per payout
    SAME_DAY_PREMIUM_CENTS: '100', // $1.00 for same-day processing
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});