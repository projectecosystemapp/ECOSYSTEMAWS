import { defineFunction } from '@aws-amplify/backend';

export const notificationHandler = defineFunction({
  name: 'notification-handler',
  entry: './handler.ts',
  environment: {
    GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT || '',
    SES_SOURCE_EMAIL: process.env.SES_SOURCE_EMAIL || 'noreply@marketplace.com',
  },
  runtime: 20,
  timeoutSeconds: 30,
});