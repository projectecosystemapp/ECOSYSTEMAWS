import { defineFunction, secret } from '@aws-amplify/backend';

export const stripeConnect = defineFunction({
  name: 'stripe-connect',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
    APP_URL: secret('APP_URL'),
  },
});