/**
 * OpenSearch Query Handler
 * 
 * Handles all search operations for the Ecosystem Marketplace including
 * geo-location search, full-text search, faceted search, and analytics.
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// Types
interface SearchServiceArgs {
  query?: string;
  location?: {
    lat: number;
    lon: number;
    radius?: string;
  };
  filters?: {
    category?: string;
    priceRange?: {
      min?: number;
      max?: number;
    };
    currency?: string;
    providerId?: string;
    active?: boolean;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    offset: number;
    limit: number;
  };
}

interface SearchUserArgs {
  query?: string;
  userType?: string;
  location?: {
    lat: number;
    lon: number;
    radius?: string;
  };
  pagination?: {
    offset: number;
    limit: number;
  };
}

interface GetSuggestionsArgs {
  query: string;
  type: 'service' | 'user';
  limit?: number;
}

interface GetAnalyticsArgs {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  aggregations?: string[];
  filters?: Record<string, any>;
}

interface SearchResult {
  items: any[];
  total: number;
  aggregations?: Record<string, any>;
  took: number;
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

// Initialize OpenSearch client
const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION || 'us-east-1',
    service: 'es',
    getCredentials: fromNodeProviderChain(),
  }),
  node: `https://${process.env.OPENSEARCH_DOMAIN_ENDPOINT}`,
  requestTimeout: 30000,
  pingTimeout: 15000,
});

/**
 * Main Lambda handler for AppSync resolver events
 */
export const handler = async (event: AppSyncResolverEvent<any>): Promise<any> => {
  console.log('Search handler invoked', {
    operation: nullableToString(event.info.fieldName),
    arguments: event.arguments
  });

  try {
    switch (event.info.fieldName) {
      case 'searchServices':
        return await searchServices(event.arguments);
      
      case 'searchUsers':
        return await searchUsers(event.arguments);
      
      case 'getSuggestions':
        return await getSuggestions(event.arguments);
      
      case 'getAnalytics':
        return await getAnalytics(event.arguments);
      
      case 'getNearbyServices':
        return await getNearbyServices(event.arguments);
      
      default:
        throw new Error(`Unknown operation: ${event.info.fieldName}`);
    }
  } catch (error) {
    console.error('Search operation failed:', error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Search services with full-text and geo queries
 */
async function searchServices(args: SearchServiceArgs): Promise<SearchResult> {
  const { query, location, filters, sort, pagination } = args;
  const { offset = 0, limit = 20 } = pagination || {};
  
  // Validate pagination
  const validatedLimit = Math.min(limit, parseInt(process.env.MAX_SEARCH_SIZE || '100'));
  const validatedOffset = Math.max(0, offset);

  // Build OpenSearch query
  const searchQuery: any = {
    index: nullableToString(process.env.OPENSEARCH_INDEX_SERVICES),
    body: {
      from: validatedOffset,
      size: validatedLimit,
      query: {
        bool: {
          must: [],
          filter: [],
        }
      },
      aggs: {
        categories: {
          terms: { field: 'category', size: 10 }
        },
        price_stats: {
          stats: { field: 'price' }
        },
        location_bounds: {
          geo_bounds: { field: 'location' }
        }
      },
      sort: []
    }
  };

  // Add text query
  if (query && query.trim()) {
    searchQuery.body.query.bool.must.push({
      multi_match: {
        query: query.trim(),
        fields: [
          'title^3',
          'description^2',
          'searchableText',
          'category',
          'address'
        ],
        type: 'best_fields',
        fuzziness: 'AUTO'
      }
    });
  } else {
    searchQuery.body.query.bool.must.push({
      match_all: {}
    });
  }

  // Add geo query
  if (location) {
    const radius = location.radius || process.env.GEO_RADIUS_DEFAULT || '10km';
    const maxRadius = process.env.GEO_RADIUS_MAX || '100km';
    const validatedRadius = validateRadius(radius, maxRadius);
    
    searchQuery.body.query.bool.filter.push({
      geo_distance: {
        distance: validatedRadius,
        location: {
          lat: nullableToString(location.lat),
          lon: location.lon
        }
      }
    });
    
    // Sort by distance when geo search is active
    searchQuery.body.sort.push({
      _geo_distance: {
        location: {
          lat: nullableToString(location.lat),
          lon: location.lon
        },
        order: 'asc',
        unit: 'km'
      }
    });
  }

  // Add filters
  if (filters) {
    if (filters.category) {
      searchQuery.body.query.bool.filter.push({
        term: { 'category': filters.category }
      });
    }
    
    if (filters.providerId) {
      searchQuery.body.query.bool.filter.push({
        term: { 'providerId': filters.providerId }
      });
    }
    
    if (filters.active !== undefined) {
      searchQuery.body.query.bool.filter.push({
        term: { 'active': filters.active }
      });
    }
    
    if (filters.priceRange) {
      const priceFilter: any = { range: { price: {} } };
      if (filters.priceRange.min !== undefined) {
        priceFilter.range.price.gte = filters.priceRange.min;
      }
      if (filters.priceRange.max !== undefined) {
        priceFilter.range.price.lte = filters.priceRange.max;
      }
      searchQuery.body.query.bool.filter.push(priceFilter);
    }
    
    if (filters.currency) {
      searchQuery.body.query.bool.filter.push({
        term: { 'currency': filters.currency }
      });
    }
  }

  // Add sorting
  if (sort && !location) { // Don't override geo sorting
    const sortField = sort.field === 'relevance' ? '_score' : sort.field;
    searchQuery.body.sort.push({
      [sortField]: {
        order: sort.direction
      }
    });
  }

  // Add default sorting if none specified
  if (searchQuery.body.sort.length === 0) {
    searchQuery.body.sort.push(
      { _score: { order: 'desc' } },
      { createdAt: { order: 'desc' } }
    );
  }

  // Execute search
  const startTime = Date.now();
  const response = await client.search(searchQuery);
  const took = Date.now() - startTime;

  const hits = response.body.hits;
  const items = hits.hits.map((hit: any) => ({
    ...hit._source,
    _score: nullableToString(hit._score),
    _distance: hit.sort && hit.sort.length > 1 ? hit.sort[0] : undefined
  }));

  return {
    items,
    total: nullableToString(hits.total.value),
    aggregations: nullableToString(response.body.aggregations),
    took,
    pagination: {
      offset: validatedOffset,
      limit: validatedLimit,
      hasMore: validatedOffset + validatedLimit < hits.total.value
    }
  };
}

/**
 * Search users (providers and customers)
 */
async function searchUsers(args: SearchUserArgs): Promise<SearchResult> {
  const { query, userType, location, pagination } = args;
  const { offset = 0, limit = 20 } = pagination || {};
  
  const validatedLimit = Math.min(limit, parseInt(process.env.MAX_SEARCH_SIZE || '100'));
  const validatedOffset = Math.max(0, offset);

  const searchQuery: any = {
    index: nullableToString(process.env.OPENSEARCH_INDEX_USERS),
    body: {
      from: validatedOffset,
      size: validatedLimit,
      query: {
        bool: {
          must: [],
          filter: [],
        }
      },
      aggs: {
        user_types: {
          terms: { field: 'userType', size: 10 }
        }
      }
    }
  };

  // Add text query
  if (query && query.trim()) {
    searchQuery.body.query.bool.must.push({
      multi_match: {
        query: query.trim(),
        fields: [
          'fullName^3',
          'firstName^2',
          'lastName^2',
          'searchableText'
        ],
        type: 'best_fields',
        fuzziness: 'AUTO'
      }
    });
  } else {
    searchQuery.body.query.bool.must.push({
      match_all: {}
    });
  }

  // Add user type filter
  if (userType) {
    searchQuery.body.query.bool.filter.push({
      term: { 'userType': userType }
    });
  }

  // Add geo query for users
  if (location) {
    const radius = location.radius || process.env.GEO_RADIUS_DEFAULT || '10km';
    const maxRadius = process.env.GEO_RADIUS_MAX || '100km';
    const validatedRadius = validateRadius(radius, maxRadius);
    
    searchQuery.body.query.bool.filter.push({
      geo_distance: {
        distance: validatedRadius,
        location: {
          lat: nullableToString(location.lat),
          lon: location.lon
        }
      }
    });
  }

  const startTime = Date.now();
  const response = await client.search(searchQuery);
  const took = Date.now() - startTime;

  const hits = response.body.hits;
  const items = hits.hits.map((hit: any) => ({
    ...hit._source,
    _score: hit._score
  }));

  return {
    items,
    total: nullableToString(hits.total.value),
    aggregations: nullableToString(response.body.aggregations),
    took,
    pagination: {
      offset: validatedOffset,
      limit: validatedLimit,
      hasMore: validatedOffset + validatedLimit < hits.total.value
    }
  };
}

/**
 * Get auto-complete suggestions
 */
async function getSuggestions(args: GetSuggestionsArgs): Promise<{ suggestions: string[] }> {
  const { query, type, limit = 10 } = args;
  
  if (!query || query.trim().length < 2) {
    return { suggestions: [] };
  }

  const indexName = type === 'service' 
    ? process.env.OPENSEARCH_INDEX_SERVICES 
    : process.env.OPENSEARCH_INDEX_USERS;

  const searchQuery = {
    index: indexName,
    body: {
      suggest: {
        title_suggest: {
          prefix: query.trim(),
          completion: {
            field: 'title.suggest',
            size: limit,
            skip_duplicates: true
          }
        }
      }
    }
  };

  const response = await client.search(searchQuery);
  const suggestions = response.body.suggest.title_suggest[0].options.map(
    (option: any) => option.text
  );

  return { suggestions };
}

/**
 * Get analytics data for dashboards
 */
async function getAnalytics(args: GetAnalyticsArgs): Promise<Record<string, any>> {
  const { dateRange, aggregations, filters } = args;
  
  const searchQuery: any = {
    index: nullableToString(process.env.OPENSEARCH_INDEX_ANALYTICS),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  gte: nullableToString(dateRange.startDate),
                  lte: dateRange.endDate
                }
              }
            }
          ]
        }
      },
      aggs: {
        events_over_time: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: 'day'
          }
        },
        event_types: {
          terms: {
            field: 'eventType',
            size: 10
          }
        },
        popular_services: {
          terms: {
            field: 'serviceId',
            size: 10
          }
        },
        user_activity: {
          cardinality: {
            field: 'userId'
          }
        }
      }
    }
  };

  // Add custom aggregations if specified
  if (aggregations && Array.isArray(aggregations)) {
    for (const agg of aggregations) {
      switch (agg) {
        case 'geo_activity':
          searchQuery.body.aggs.geo_activity = {
            geo_hash_grid: {
              field: 'location',
              precision: 5
            }
          };
          break;
          
        case 'revenue_stats':
          searchQuery.body.aggs.revenue_stats = {
            filter: { term: { eventType: 'booking' } },
            aggs: {
              total_revenue: {
                sum: { field: 'metadata.amount' }
              },
              avg_booking_value: {
                avg: { field: 'metadata.amount' }
              }
            }
          };
          break;
      }
    }
  }

  // Apply additional filters
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      searchQuery.body.query.bool.filter.push({
        term: { [key]: value }
      });
    }
  }

  const response = await client.search(searchQuery);
  return {
    aggregations: nullableToString(response.body.aggregations),
    totalEvents: response.body.hits.total.value
  };
}

/**
 * Get nearby services (specialized geo search)
 */
async function getNearbyServices(args: {
  location: { lat: number; lon: number };
  radius?: string;
  limit?: number;
}): Promise<SearchResult> {
  return searchServices({
    location: nullableToString(args.location),
    pagination: {
      offset: 0,
      limit: args.limit || 20
    }
  });
}

/**
 * Validate and sanitize radius parameter
 */
function validateRadius(radius: string, maxRadius: string): string {
  const radiusMatch = radius.match(/^(\d+(?:\.\d+)?)(km|m|mi)$/);
  const maxRadiusMatch = maxRadius.match(/^(\d+(?:\.\d+)?)(km|m|mi)$/);
  
  if (!radiusMatch || !maxRadiusMatch) {
    return '10km'; // Default fallback
  }
  
  const [, radiusValue, radiusUnit] = radiusMatch;
  const [, maxRadiusValue, maxRadiusUnit] = maxRadiusMatch;
  
  // Convert to common unit (km) for comparison
  const toKm = (value: string, unit: string): number => {
    const val = parseFloat(value);
    switch (unit) {
      case 'm': return val / 1000;
      case 'mi': return val * 1.60934;
      case 'km': 
      default: return val;
    }
  };
  
  const radiusInKm = toKm(radiusValue, radiusUnit);
  const maxRadiusInKm = toKm(maxRadiusValue, maxRadiusUnit);
  
  if (radiusInKm > maxRadiusInKm) {
    return maxRadius;
  }
  
  return radius;
}