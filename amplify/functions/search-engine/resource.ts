import { defineFunction } from '@aws-amplify/backend';

export const searchEngine = defineFunction({
  name: 'search-engine',
  entry: './handler.ts',
  environment: {
    OPENSEARCH_ENDPOINT: process.env.OPENSEARCH_ENDPOINT || '',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    REDIS_ENDPOINT: process.env.REDIS_ENDPOINT || '',
    GEOCODING_API_KEY: process.env.GEOCODING_API_KEY || '',
  },
  runtime: 'nodejs18.x',
  timeout: 60, // 1 minute for complex search operations
  memoryMB: 1024, // Higher memory for search processing
});