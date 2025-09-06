import { defineFunction } from '@aws-amplify/backend';

export const metricsPublisher = defineFunction({
  name: 'metrics-publisher',
  entry: './handler.ts',
  environment: {
    CLOUDWATCH_NAMESPACE: 'ECOSYSTEMAWS/PaymentSystem',
    COST_METRICS_TABLE: 'CostMetric',
    BUSINESS_METRICS_TABLE: 'BusinessMetric', 
    SYSTEM_HEALTH_TABLE: 'SystemHealthMetric',
    PAYMENT_METRICS_TABLE: 'PaymentMetric',
    FRAUD_ANALYTICS_TABLE: 'FraudAnalytic',
  },
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
  architecture: 'arm64',
});