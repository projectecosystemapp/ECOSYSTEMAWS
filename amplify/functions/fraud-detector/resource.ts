import { defineFunction } from '@aws-amplify/backend';

export const fraudDetector = defineFunction({
  name: 'fraud-detector',
  entry: './handler.ts',
  environment: {
    FRAUD_ALERTS_TOPIC_ARN: '', // Will be set by backend.ts
    FRAUD_DETECTOR_NAME: 'ecosystem-fraud-detector',
    TRANSACTION_TABLE: 'Transaction',
    FRAUD_EVENTS_TABLE: 'FraudEvent',
  },
  runtime: 20, // Node.js 20
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 512,
});