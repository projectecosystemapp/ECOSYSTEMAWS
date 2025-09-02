import { defineFunction } from '@aws-amplify/backend';

/**
 * OpenSearch Query Handler Lambda Function
 * 
 * Handles all search operations for the Ecosystem Marketplace:
 * - Full-text search across services and users
 * - Geo-location search with radius filtering
 * - Faceted search with filters
 * - Auto-complete and suggestions
 * - Analytics queries for dashboards
 * 
 * Features:
 * - Circuit breaker for resilience
 * - Response caching
 * - Performance monitoring
 * - Security with fine-grained access
 */

export const searchHandler = defineFunction({
  name: 'search-handler',
  entry: './handler.ts',
  runtime: 'nodejs18.x',
  timeout: 30, // 30 seconds for complex queries
  memoryMB: 512, // Sufficient for search operations
  environment: {
    OPENSEARCH_DOMAIN_ENDPOINT: 'PLACEHOLDER_WILL_BE_SET_IN_BACKEND',
    OPENSEARCH_INDEX_SERVICES: 'ecosystem-services',
    OPENSEARCH_INDEX_USERS: 'ecosystem-users',
    OPENSEARCH_INDEX_BOOKINGS: 'ecosystem-bookings',
    OPENSEARCH_INDEX_ANALYTICS: 'ecosystem-analytics',
    DEFAULT_SEARCH_SIZE: '20',
    MAX_SEARCH_SIZE: '100',
    GEO_RADIUS_DEFAULT: '10km',
    GEO_RADIUS_MAX: '100km',
    NODE_OPTIONS: '--enable-source-maps',
  },
  bundling: {
    minify: true,
    sourceMap: true,
    externalModules: [
      '@aws-sdk/client-opensearch',
      '@opensearch-project/opensearch',
    ],
  },
});