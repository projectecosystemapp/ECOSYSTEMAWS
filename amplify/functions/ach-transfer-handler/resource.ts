import { defineFunction } from '@aws-amplify/backend';

/**
 * ACH Transfer Handler Lambda Function
 * 
 * Handles direct bank transfers for provider payouts:
 * - Bank account verification and management
 * - ACH transfer initiation and monitoring
 * - Direct payouts to providers (no Stripe Connect needed)
 * - Compliance with NACHA regulations
 * 
 * COST BENEFITS:
 * - ACH transfers: ~$0.25 per transfer vs Stripe Connect ~2.9% + $0.30
 * - For $1000 payout: $0.25 vs $29.30 (98% savings)
 * - No Connect account fees or reserves
 */
export const achTransferHandler = defineFunction({
  name: 'ach-transfer-handler', 
  entry: './handler.ts',
  
  // COST OPTIMIZED Performance Configuration
  timeoutSeconds: 15, // Reduced from 30s - ACH initiation should be fast
  memoryMB: 256, // Reduced memory - ACH processing is lightweight
  architecture: 'arm64', // 20% cost reduction
  
  // Environment Configuration
  environment: {
    // DynamoDB Tables
    BANK_ACCOUNT_TABLE: 'BankAccount',
    ACH_TRANSFER_TABLE: 'AchTransfer',
    PROVIDER_PROFILE_TABLE: 'ProviderProfile',
    
    // ACH Configuration
    ACH_PROCESSING_REGION: process.env.AWS_REGION || 'us-east-1',
    ACH_FEE_CENTS: '25', // $0.25 per transfer
    TRANSFER_LIMIT_DAILY_CENTS: '100000', // $1000 daily limit
    TRANSFER_LIMIT_MONTHLY_CENTS: '2000000', // $20,000 monthly limit
    
    // Bank Verification
    MICRO_DEPOSIT_CENTS_1: '11', // $0.11 verification deposit
    MICRO_DEPOSIT_CENTS_2: '12', // $0.12 verification deposit
    
    // Processing Times
    STANDARD_ACH_DAYS: '3', // 3 business days
    SAME_DAY_ACH_DAYS: '1', // 1 business day (premium)
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});