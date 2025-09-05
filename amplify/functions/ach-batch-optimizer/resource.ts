import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

/**
 * ACH Batch Optimizer Lambda Function
 * 
 * Optimizes ACH transfer batching for maximum cost efficiency:
 * - Batches multiple transfers to reduce per-transfer costs
 * - Intelligent scheduling based on ACH processing windows
 * - Same-day ACH optimization for urgent transfers
 * - NACHA compliance with batch size limits
 * 
 * COST OPTIMIZATION BENEFITS:
 * - Batch processing: $0.25 per batch vs $0.25 per individual transfer
 * - For 100 transfers: $0.25 total vs $25.00 individual (99% savings on fees)
 * - Optimal timing reduces same-day ACH usage
 * - Smart batching reduces processing overhead
 */
export const achBatchOptimizer = defineFunction({
  name: 'ach-batch-optimizer',
  entry: './handler.ts',
  
  // COST OPTIMIZED Configuration
  timeoutSeconds: 60, // Sufficient for batch processing
  memoryMB: 512, // Higher memory for batch operations
  architecture: 'arm64', // 20% cost reduction
  
  // Schedule Configuration (runs every hour to optimize batches)
  // Note: Scheduling will be configured separately in infrastructure
  
  // Environment Configuration
  environment: {
    // DynamoDB Tables
    ACH_TRANSFER_TABLE: 'AchTransfer',
    BATCH_OPTIMIZATION_TABLE: 'BatchOptimization',
    PROVIDER_PROFILE_TABLE: 'ProviderProfile',
    BANK_ACCOUNT_TABLE: 'BankAccount',
    
    // ACH Processing Configuration
    MAX_BATCH_SIZE: '2500', // NACHA limit: 2,500 transactions per batch
    MIN_BATCH_SIZE: '5', // Minimum transfers to justify batching
    BATCH_PROCESSING_FEE_CENTS: '25', // $0.25 per batch regardless of size
    
    // ACH Processing Windows (Eastern Time)
    STANDARD_ACH_CUTOFF_HOUR: '16', // 4 PM ET for next-day processing
    SAME_DAY_ACH_CUTOFF_HOUR: '14', // 2 PM ET for same-day processing
    STANDARD_ACH_PROCESSING_DAYS: 'mon,tue,wed,thu,fri', // Business days only
    
    // Optimization Thresholds
    HIGH_PRIORITY_AMOUNT_CENTS: '50000', // $500+ transfers get priority
    URGENT_TRANSFER_HOURS: '2', // Transfers needed within 2 hours
    BATCH_COST_THRESHOLD_CENTS: '100', // Only batch if savings > $1.00
    
    // Provider Payout Preferences
    DEFAULT_PAYOUT_FREQUENCY: 'daily', // daily, weekly, biweekly, monthly
    MIN_PAYOUT_AMOUNT_CENTS: '2000', // $20 minimum payout
    MAX_PAYOUT_DELAY_HOURS: '24', // Maximum delay for batching
    
    // Cost Optimization Settings
    BATCH_SAVINGS_TARGET_PERCENTAGE: '90', // Target 90% savings on ACH fees
    PROCESSING_COST_PER_TRANSFER_CENTS: '1', // Internal processing cost
    
    // Compliance and Risk
    DAILY_TRANSFER_LIMIT_CENTS: '1000000', // $10,000 daily limit per provider
    MONTHLY_TRANSFER_LIMIT_CENTS: '5000000', // $50,000 monthly limit
    FRAUD_CHECK_AMOUNT_THRESHOLD_CENTS: '100000', // $1,000+ requires fraud check
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});