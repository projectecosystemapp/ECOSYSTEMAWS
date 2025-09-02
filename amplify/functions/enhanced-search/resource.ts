import { defineFunction } from '@aws-amplify/backend';

export const enhancedSearch = defineFunction({
  name: 'enhanced-search',
  entry: './handler.ts',
  environment: {
    OPENSEARCH_ENDPOINT: 'https://search-marketplace-abc123.us-east-1.es.amazonaws.com',
    OPENSEARCH_REGION: 'us-east-1',
  },
  runtime: 20,
  timeoutSeconds: 30,
});