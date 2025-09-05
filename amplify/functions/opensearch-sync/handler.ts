/**
 * OpenSearch DynamoDB Sync Handler
 * 
 * Processes DynamoDB Stream events and synchronizes data to OpenSearch.
 * Handles geo-location indexing, full-text search optimization, and analytics.
 */

import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// Types
interface SearchDocument {
  id: string;
  type: 'user' | 'service' | 'booking' | 'message';
  title?: string;
  description?: string;
  content?: string;
  location?: {
    lat: number;
    lon: number;
  };
  address?: string;
  category?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  userId?: string;
  providerId?: string;
  customerId?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  searchableText?: string;
}

interface AnalyticsEvent {
  timestamp: string;
  eventType: 'view' | 'booking' | 'search' | 'message';
  userId?: string;
  serviceId?: string;
  bookingId?: string;
  location?: {
    lat: number;
    lon: number;
  };
  metadata: Record<string, any>;
}

// Initialize OpenSearch client
const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION || 'us-east-1',
    service: 'es',
    getCredentials: fromNodeProviderChain(),
  }),
  node: `https://${process.env.OPENSEARCH_DOMAIN_ENDPOINT}`,
  requestTimeout: 60000,
  pingTimeout: 30000,
});

// Index configurations
const INDEX_MAPPINGS = {
  services: {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
        title: { 
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
            suggest: { type: 'completion' }
          }
        },
        description: { 
          type: 'text',
          analyzer: 'standard'
        },
        location: { type: 'geo_point' },
        address: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        category: { type: 'keyword' },
        price: { type: 'float' },
        currency: { type: 'keyword' },
        tags: { type: 'keyword' },
        providerId: { type: 'keyword' },
        status: { type: 'keyword' },
        active: { type: 'boolean' },
        maxGroupSize: { type: 'integer' },
        duration: { type: 'integer' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        searchableText: { 
          type: 'text',
          analyzer: 'standard'
        },
      }
    },
    settings: {
      number_of_shards: 2,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          autocomplete: {
            tokenizer: 'autocomplete',
            filter: ['lowercase']
          }
        },
        tokenizer: {
          autocomplete: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 10,
            token_chars: ['letter']
          }
        }
      }
    }
  },
  users: {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
        email: { type: 'keyword' },
        firstName: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        lastName: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        fullName: { 
          type: 'text',
          fields: { 
            keyword: { type: 'keyword' },
            suggest: { type: 'completion' }
          }
        },
        userType: { type: 'keyword' },
        location: { type: 'geo_point' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        searchableText: { type: 'text' },
      }
    }
  },
  bookings: {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
        serviceId: { type: 'keyword' },
        customerId: { type: 'keyword' },
        providerId: { type: 'keyword' },
        status: { type: 'keyword' },
        paymentStatus: { type: 'keyword' },
        amount: { type: 'float' },
        currency: { type: 'keyword' },
        startDateTime: { type: 'date' },
        endDateTime: { type: 'date' },
        location: { type: 'geo_point' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      }
    }
  },
  analytics: {
    mappings: {
      properties: {
        timestamp: { type: 'date' },
        eventType: { type: 'keyword' },
        userId: { type: 'keyword' },
        serviceId: { type: 'keyword' },
        bookingId: { type: 'keyword' },
        location: { type: 'geo_point' },
        metadata: { 
          type: 'object',
          dynamic: true
        },
      }
    },
    settings: {
      number_of_shards: 3,
      number_of_replicas: 1,
      'index.lifecycle.name': 'analytics-policy',
      'index.lifecycle.rollover_alias': 'ecosystem-analytics'
    }
  }
};

/**
 * Main Lambda handler for DynamoDB Stream events
 */
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  console.log('Processing DynamoDB Stream event', {
    recordCount: nullableToString(event.Records.length),
    eventSourceARN: event.Records[0]?.eventSourceARN
  });

  // Ensure indices exist
  await ensureIndicesExist();

  // Process records in batches
  const batchSize = 25; // OpenSearch bulk API limit
  const batches = [];
  
  for (let i = 0; i < event.Records.length; i += batchSize) {
    batches.push(event.Records.slice(i, i + batchSize));
  }

  const results = [];
  for (const batch of batches) {
    try {
      const result = await processBatch(batch);
      results.push(result);
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Continue processing other batches
    }
  }

  console.log('Stream processing completed', {
    totalBatches: nullableToString(batches.length),
    successfulBatches: results.filter(r => r.success).length,
    failedBatches: results.filter(r => !r.success).length
  });
};

/**
 * Ensure all required indices exist with proper mappings
 */
async function ensureIndicesExist(): Promise<void> {
  const indices = Object.keys(INDEX_MAPPINGS);
  
  for (const indexName of indices) {
    const fullIndexName = `${process.env[`OPENSEARCH_INDEX_${indexName.toUpperCase()}`]}`;
    
    try {
      const exists = await client.indices.exists({ index: fullIndexName });
      
      if (!exists.body) {
        console.log(`Creating index: ${fullIndexName}`);
        await client.indices.create({
          index: fullIndexName,
          body: INDEX_MAPPINGS[indexName as keyof typeof INDEX_MAPPINGS]
        });
        console.log(`Index created successfully: ${fullIndexName}`);
      }
    } catch (error) {
      console.error(`Failed to create/check index ${fullIndexName}:`, error);
    }
  }
}

/**
 * Process a batch of DynamoDB records
 */
async function processBatch(records: DynamoDBRecord[]): Promise<{ success: boolean; errors?: any[] }> {
  const bulkBody: any[] = [];
  const analyticsEvents: AnalyticsEvent[] = [];

  for (const record of records) {
    try {
      const result = await processRecord(record);
      if (result.bulkOperation) {
        bulkBody.push(...result.bulkOperation);
      }
      if (result.analyticsEvent) {
        analyticsEvents.push(result.analyticsEvent);
      }
    } catch (error) {
      console.error('Failed to process record:', error, {
        eventName: nullableToString(record.eventName),
        dynamodb: record.dynamodb
      });
    }
  }

  // Execute bulk operations
  const results: any[] = [];
  
  if (bulkBody.length > 0) {
    try {
      const bulkResponse = await client.bulk({
        body: bulkBody,
        refresh: true
      });
      
      if (bulkResponse.body.errors) {
        console.error('Bulk operation errors:', bulkResponse.body.items);
      }
      
      results.push({ type: 'bulk', success: !bulkResponse.body.errors });
    } catch (error) {
      console.error('Bulk operation failed:', error);
      results.push({ type: 'bulk', success: false, error });
    }
  }

  // Index analytics events
  if (analyticsEvents.length > 0) {
    try {
      const analyticsBody: any[] = [];
      
      for (const event of analyticsEvents) {
        analyticsBody.push({
          index: {
            _index: nullableToString(process.env.OPENSEARCH_INDEX_ANALYTICS),
            _id: `${event.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }
        });
        analyticsBody.push(event);
      }
      
      const analyticsResponse = await client.bulk({
        body: analyticsBody,
        refresh: true
      });
      
      results.push({ type: 'analytics', success: !analyticsResponse.body.errors });
    } catch (error) {
      console.error('Analytics indexing failed:', error);
      results.push({ type: 'analytics', success: false, error });
    }
  }

  const allSuccessful = results.every(r => r.success);
  return {
    success: allSuccessful,
    errors: allSuccessful ? undefined : results.filter(r => !r.success)
  };
}

/**
 * Process individual DynamoDB record
 */
async function processRecord(record: DynamoDBRecord): Promise<{
  bulkOperation?: any[];
  analyticsEvent?: AnalyticsEvent;
}> {
  const { eventName, dynamodb } = record;
  
  if (!dynamodb?.Keys) {
    console.warn('Record missing Keys, skipping');
    return {};
  }

  // Determine table name from event source ARN
  const tableName = record.eventSourceARN?.split('/')[1] || 'unknown';
  const recordId = unmarshall(dynamodb.Keys).id;

  switch (eventName) {
    case 'INSERT':
    case 'MODIFY':
      if (dynamodb.NewImage) {
        const newRecord = unmarshall(dynamodb.NewImage);
        const document = await transformToSearchDocument(newRecord, tableName);
        const analyticsEvent = createAnalyticsEvent(newRecord, tableName, eventName);
        
        if (document) {
          const indexName = getIndexName(tableName);
          return {
            bulkOperation: [
              { index: { _index: indexName, _id: recordId } },
              document
            ],
            analyticsEvent
          };
        }
      }
      break;
      
    case 'REMOVE':
      const indexName = getIndexName(tableName);
      const analyticsEvent = createAnalyticsEvent({ id: recordId }, tableName, eventName);
      
      return {
        bulkOperation: [
          { delete: { _index: indexName, _id: recordId } }
        ],
        analyticsEvent
      };
  }

  return {};
}

/**
 * Transform DynamoDB record to OpenSearch document
 */
async function transformToSearchDocument(
  record: any,
  tableName: string
): Promise<SearchDocument | null> {
  const baseDoc: SearchDocument = {
    id: nullableToString(record.id),
    type: getDocumentType(tableName),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
  };

  switch (tableName) {
    case 'Service':
      return {
        ...baseDoc,
        type: 'service',
        title: nullableToString(record.title),
        description: nullableToString(record.description),
        category: nullableToString(record.category),
        price: nullableToString(record.price),
        currency: record.currency || 'USD',
        providerId: nullableToString(record.providerId),
        status: record.active ? 'active' : 'inactive',
        location: await extractLocationFromAddress(record.address),
        address: nullableToString(record.address),
        tags: extractTags(record),
        searchableText: [
          record.title,
          record.description,
          record.category,
          record.address
        ].filter(Boolean).join(' '),
      };

    case 'UserProfile':
      const fullName = [record.firstName, record.lastName].filter(Boolean).join(' ');
      return {
        ...baseDoc,
        type: 'user',
        title: fullName,
        description: `${record.userType || 'User'} - ${record.email}`,
        userId: nullableToString(record.id),
        searchableText: [
          record.firstName,
          record.lastName,
          record.email,
          record.userType
        ].filter(Boolean).join(' '),
      };

    case 'Booking':
      return {
        ...baseDoc,
        type: 'booking',
        serviceId: nullableToString(record.serviceId),
        customerId: nullableToString(record.customerId),
        providerId: nullableToString(record.providerId),
        status: nullableToString(record.status),
        price: nullableToString(record.amount),
        currency: record.currency || 'USD',
        searchableText: [
          record.status,
          record.customerEmail,
          record.providerEmail
        ].filter(Boolean).join(' '),
      };

    case 'Message':
      return {
        ...baseDoc,
        type: 'message',
        content: nullableToString(record.content),
        userId: nullableToString(record.senderId),
        searchableText: nullableToString(record.content),
      };

    default:
      console.warn(`Unknown table: ${tableName}`);
      return null;
  }
}

/**
 * Extract location coordinates from address using geocoding
 * In production, this would integrate with a geocoding service
 */
async function extractLocationFromAddress(address?: string): Promise<{ lat: number; lon: number } | undefined> {
  if (!address) return undefined;
  
  // For demo purposes, return mock coordinates
  // In production, integrate with AWS Location Service or Google Maps
  const mockCoordinates = {
    'New York': { lat: 40.7128, lon: -74.0060 },
    'Los Angeles': { lat: 34.0522, lon: -118.2437 },
    'Chicago': { lat: 41.8781, lon: -87.6298 },
    'Miami': { lat: 25.7617, lon: -80.1918 },
  };
  
  // Simple matching for demo
  for (const [city, coords] of Object.entries(mockCoordinates)) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return coords;
    }
  }
  
  return undefined;
}

/**
 * Extract searchable tags from record
 */
function extractTags(record: any): string[] {
  const tags = [];
  
  if (record.category) tags.push(record.category);
  if (record.priceType) tags.push(record.priceType);
  if (record.currency) tags.push(record.currency);
  if (record.maxGroupSize) tags.push(`group-size-${record.maxGroupSize}`);
  
  return tags;
}

/**
 * Create analytics event from record
 */
function createAnalyticsEvent(
  record: any,
  tableName: string,
  eventName: string
): AnalyticsEvent {
  return {
    timestamp: new Date().toISOString(),
    eventType: mapEventType(tableName, eventName),
    userId: record.userId || record.customerId || record.senderId,
    serviceId: nullableToString(record.serviceId),
    bookingId: record.id && tableName === 'Booking' ? record.id : undefined,
    metadata: {
      tableName,
      eventName,
      recordId: nullableToString(record.id),
    }
  };
}

/**
 * Map DynamoDB events to analytics event types
 */
function mapEventType(tableName: string, eventName: string): 'view' | 'booking' | 'search' | 'message' {
  if (tableName === 'Booking') return 'booking';
  if (tableName === 'Message') return 'message';
  return 'view';
}

/**
 * Get OpenSearch index name for table
 */
function getIndexName(tableName: string): string {
  const mapping: Record<string, string> = {
    'Service': process.env.OPENSEARCH_INDEX_SERVICES!,
    'UserProfile': process.env.OPENSEARCH_INDEX_USERS!,
    'Booking': process.env.OPENSEARCH_INDEX_BOOKINGS!,
    'Message': process.env.OPENSEARCH_INDEX_SERVICES!, // Messages go to services for contextual search
  };
  
  return mapping[tableName] || process.env.OPENSEARCH_INDEX_SERVICES!;
}

/**
 * Get document type for table
 */
function getDocumentType(tableName: string): 'user' | 'service' | 'booking' | 'message' {
  const mapping: Record<string, 'user' | 'service' | 'booking' | 'message'> = {
    'Service': 'service',
    'UserProfile': 'user',
    'Booking': 'booking',
    'Message': 'message',
  };
  
  return mapping[tableName] || 'service';
}