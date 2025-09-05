/**
 * Webhook Authorizer Lambda Resource
 * 
 * Defines the Lambda function for custom webhook authorization in AppSync.
 * This function validates webhook signatures before allowing GraphQL mutations
 * to be executed, providing security for external webhook endpoints.
 */

import { defineFunction, secret } from '@aws-amplify/backend';

export const webhookAuthorizer = defineFunction({
  name: 'webhook-authorizer',
  runtime: 20,
  timeoutSeconds: 30,
  environment: {
    STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
    GITHUB_WEBHOOK_SECRET: secret('GITHUB_WEBHOOK_SECRET'),
    SHOPIFY_WEBHOOK_SECRET: secret('SHOPIFY_WEBHOOK_SECRET'),
    WEBHOOK_DEDUP_TABLE: process.env.WEBHOOK_DEDUP_TABLE || 'ProcessedWebhooks',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  },
  entry: './handler.ts',
});