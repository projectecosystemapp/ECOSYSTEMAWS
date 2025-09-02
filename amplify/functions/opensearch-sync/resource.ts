import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * OpenSearch DynamoDB Sync Lambda Function
 * 
 * Handles real-time synchronization from DynamoDB Streams to OpenSearch domain.
 * Processes CREATE, MODIFY, REMOVE events and maintains search indices.
 * 
 * Features:
 * - Batch processing for efficiency
 * - Error handling with DLQ
 * - Geo-location indexing for services
 * - Full-text search optimization
 * - Circuit breaker for resilience
 */

export const openSearchSync = defineFunction({
  name: 'opensearch-sync',
  entry: './handler.ts',
  runtime: 'nodejs18.x',
  timeout: 900, // 15 minutes for batch processing
  memoryMB: 1024, // Higher memory for OpenSearch operations
  environment: {
    OPENSEARCH_DOMAIN_ENDPOINT: 'PLACEHOLDER_WILL_BE_SET_IN_BACKEND',
    OPENSEARCH_INDEX_SERVICES: 'ecosystem-services',
    OPENSEARCH_INDEX_USERS: 'ecosystem-users',
    OPENSEARCH_INDEX_BOOKINGS: 'ecosystem-bookings',
    OPENSEARCH_INDEX_ANALYTICS: 'ecosystem-analytics',
    NODE_OPTIONS: '--enable-source-maps',
  },
  bundling: {
    minify: true,
    sourceMap: true,
    externalModules: [
      '@aws-sdk/client-opensearch',
      '@aws-sdk/client-dynamodb',
      '@aws-sdk/util-dynamodb',
    ],
  },
});