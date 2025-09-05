import { defineFunction } from '@aws-amplify/backend';

export const messagingHandler = defineFunction({
  name: 'messaging-handler',
  entry: './handler.ts',
  environment: {
    GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT || '',
  },
  runtime: 20,
  timeoutSeconds: 30,
});