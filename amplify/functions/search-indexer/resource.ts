import { defineFunction } from '@aws-amplify/backend';

export const searchIndexer = defineFunction({
  name: 'search-indexer',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for batch processing
  memoryMB: 1024, // Higher memory for batch processing performance
  runtime: 18,
  environment: {
    // OpenSearch configuration will be set by backend.ts
    OPENSEARCH_DOMAIN_ENDPOINT: '', // Populated by backend
    OPENSEARCH_REGION: '', // Populated by backend
    BATCH_SIZE: '25', // Process up to 25 records per batch
    ENABLE_PERFORMANCE_LOGGING: 'true',
    RETRY_ATTEMPTS: '3',
    CIRCUIT_BREAKER_THRESHOLD: '5', // Circuit breaker after 5 failures
    CACHE_TTL_SECONDS: '300', // 5 minutes cache TTL
  },
});