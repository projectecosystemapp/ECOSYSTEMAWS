import { defineFunction } from '@aws-amplify/backend';

export const paymentCryptography = defineFunction({
  name: 'payment-cryptography',
  entry: './handler.ts',
  environment: {
    PAYMENT_KEY_ARN: '', // Will be set by backend.ts
    KMS_KEY_ARN: '', // For additional encryption needs
    PAYMENT_CRYPTOGRAPHY_ENDPOINT: '', // AWS Payment Cryptography endpoint
  },
  runtime: 20, // Node.js 20
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 256,
});