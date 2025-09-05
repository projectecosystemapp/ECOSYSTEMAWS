import { defineFunction } from '@aws-amplify/backend';

/**
 * Cost Monitor Lambda Function
 * 
 * Monitors AWS-native payment system costs and compares against Stripe baseline:
 * - Real-time cost tracking across all payment services
 * - Budget alerts and anomaly detection
 * - ROI calculations and savings reports
 * - CloudWatch metrics publishing
 * 
 * TARGET METRICS:
 * - Stripe baseline: $0.30 + 2.9% per transaction
 * - AWS target: <$0.10 per transaction (98%+ savings)
 * - Monthly savings tracking
 * - Cost per transaction trending
 */
export const costMonitor = defineFunction({
  name: 'cost-monitor',
  entry: './handler.ts',
  
  // COST OPTIMIZED Configuration
  timeoutSeconds: 30, // Sufficient for cost calculations
  memoryMB: 256, // Lightweight monitoring operations
  architecture: 'arm64', // 20% cost reduction
  
  // Environment Configuration
  environment: {
    // Cost Tracking Tables
    COST_METRIC_TABLE: 'CostMetric',
    TRANSACTION_COST_TABLE: 'TransactionCost',
    SAVINGS_REPORT_TABLE: 'SavingsReport',
    
    // Baseline Cost Configuration (Stripe comparison)
    STRIPE_FIXED_FEE_CENTS: '30', // $0.30 per transaction
    STRIPE_PERCENTAGE_FEE: '2.9', // 2.9% of transaction amount
    STRIPE_CONNECT_FEE_PERCENTAGE: '0.25', // Additional 0.25% for Connect
    
    // AWS Cost Configuration
    AWS_PAYMENT_CRYPTO_COST_PER_TRANSACTION: '5', // $0.05 per transaction
    AWS_ACH_COST_PER_TRANSFER: '25', // $0.25 per ACH transfer
    AWS_LAMBDA_COST_PER_GB_SECOND: '0.0000166667', // $0.0000166667 per GB-second
    AWS_DYNAMODB_COST_PER_RCU: '0.25', // $0.25 per million RCUs
    AWS_DYNAMODB_COST_PER_WCU: '1.25', // $1.25 per million WCUs
    
    // Monitoring Configuration
    COST_ALERT_THRESHOLD_PERCENTAGE: '50', // Alert if costs exceed 50% of target
    ANOMALY_DETECTION_SENSITIVITY: 'HIGH', // CloudWatch anomaly detection
    SAVINGS_REPORT_FREQUENCY_HOURS: '24', // Generate daily savings reports
    
    // CloudWatch Configuration
    CLOUDWATCH_NAMESPACE: 'ECOSYSTEMAWS/PaymentCosts',
    COST_METRIC_PREFIX: 'payment_system',
    
    // Budget Configuration
    MONTHLY_BUDGET_LIMIT_USD: '1000', // $1000 monthly budget limit
    DAILY_BUDGET_LIMIT_USD: '50', // $50 daily budget limit
    TRANSACTION_COST_TARGET_CENTS: '10', // Target: $0.10 per transaction
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});