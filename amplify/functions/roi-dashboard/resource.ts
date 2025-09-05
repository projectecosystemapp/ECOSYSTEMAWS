import { defineFunction } from '@aws-amplify/backend';

/**
 * ROI Dashboard Lambda Function
 * 
 * Provides real-time cost tracking and ROI reporting for AWS-native payments:
 * - Live cost monitoring with sub-second granularity
 * - ROI calculations comparing AWS vs Stripe costs
 * - Predictive cost modeling and savings projections
 * - Executive dashboard data aggregation
 * - Automated cost optimization recommendations
 * 
 * DASHBOARD FEATURES:
 * - Real-time savings meter (target: 98%+ vs Stripe)
 * - Transaction cost breakdown visualization
 * - Monthly/yearly savings projections
 * - Cost trend analysis and alerts
 * - Performance vs cost optimization metrics
 */
export const roiDashboard = defineFunction({
  name: 'roi-dashboard',
  entry: './handler.ts',
  
  // COST OPTIMIZED Configuration
  timeoutSeconds: 30, // Sufficient for dashboard data aggregation
  memoryMB: 512, // Memory for complex calculations and data processing
  architecture: 'arm64', // 20% cost reduction
  
  // Environment Configuration
  environment: {
    // Data Source Tables
    COST_METRIC_TABLE: 'CostMetric',
    SAVINGS_REPORT_TABLE: 'SavingsReport',
    PAYMENT_TRANSACTION_TABLE: 'PaymentTransaction',
    ACH_TRANSFER_TABLE: 'AchTransfer',
    BATCH_OPTIMIZATION_TABLE: 'BatchOptimization',
    
    // ROI Calculation Parameters
    STRIPE_BASELINE_FIXED_FEE_CENTS: '30', // $0.30 per transaction
    STRIPE_BASELINE_PERCENTAGE: '2.9', // 2.9% of transaction amount
    STRIPE_CONNECT_ADDITIONAL_PERCENTAGE: '0.25', // Additional 0.25% for Connect
    STRIPE_TRANSFER_FEE_PERCENTAGE: '0.25', // 0.25% for instant payouts
    
    // AWS Cost Parameters
    TARGET_COST_PER_TRANSACTION_CENTS: '10', // Target: $0.10 per transaction
    MAXIMUM_ACCEPTABLE_COST_CENTS: '20', // Alert if cost exceeds $0.20
    
    // Dashboard Configuration
    DASHBOARD_REFRESH_INTERVAL_SECONDS: '30', // Real-time updates every 30 seconds
    COST_TREND_ANALYSIS_DAYS: '30', // Analyze 30-day trends
    PROJECTION_PERIOD_MONTHS: '12', // 12-month projections
    
    // Alert Thresholds
    COST_SPIKE_THRESHOLD_PERCENTAGE: '25', // Alert on 25% cost increase
    SAVINGS_TARGET_PERCENTAGE: '98', // Target 98% savings vs Stripe
    ROI_ALERT_THRESHOLD_PERCENTAGE: '95', // Alert if ROI drops below 95%
    
    // Performance Metrics
    DASHBOARD_LOAD_TIME_TARGET_MS: '500', // Target dashboard load time
    DATA_FRESHNESS_TARGET_SECONDS: '60', // Data should be < 60 seconds old
    
    // CloudWatch Integration
    CLOUDWATCH_NAMESPACE: 'ECOSYSTEMAWS/ROIDashboard',
    CUSTOM_METRIC_PREFIX: 'payment_roi',
    
    // Business Metrics
    ANNUAL_TRANSACTION_VOLUME_PROJECTION: '1000000', // 1M transactions/year
    AVERAGE_TRANSACTION_AMOUNT_CENTS: '5000', // $50 average transaction
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});