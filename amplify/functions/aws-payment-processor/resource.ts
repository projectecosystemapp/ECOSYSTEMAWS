import { defineFunction } from '@aws-amplify/backend';

export const awsPaymentProcessor = defineFunction({
  name: 'aws-payment-processor',
  entry: './handler.ts',
  environment: {
    PAYMENT_CRYPTOGRAPHY_KEY_ARN: '', // Will be set by backend.ts
    PAYMENT_NOTIFICATIONS_TOPIC_ARN: '', // Will be set by backend.ts
    FRAUD_DETECTOR_ENDPOINT: '', // AWS Fraud Detector endpoint
    ESCROW_ACCOUNT_TABLE: 'EscrowAccount',
    TRANSACTION_TABLE: 'Transaction',
  },
  runtime: 20, // Node.js 20
  timeoutSeconds: 60, // 1 minute timeout
  memoryMB: 512, // Right-sized for crypto operations
  architecture: 'arm64', // 20% cost reduction over x86_64
});