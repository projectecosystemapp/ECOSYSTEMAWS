import { defineFunction } from '@aws-amplify/backend';

export const logAnalyzer = defineFunction({
  name: 'log-analyzer',
  entry: './handler.ts',
  environment: {
    CLOUDWATCH_LOGS_GROUP_PREFIX: '/aws/lambda/ecosystem-',
    LOG_INSIGHTS_QUERY_RESULTS_BUCKET: '', // Will be set by backend.ts
    LOG_ANALYSIS_TABLE: 'LogAnalysis',
    CORRELATION_INDEX_TABLE: 'CorrelationIndex',
    ANOMALY_DETECTION_THRESHOLD: '2.5', // Standard deviations
    RETENTION_DAYS: '90',
  },
  runtime: 20,
  timeoutSeconds: 300, // 5 minutes for complex log analysis
  memoryMB: 1024, // Higher memory for log processing
  architecture: 'arm64',
});