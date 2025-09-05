import { DynamoDBStreamEvent, DynamoDBRecord, Context } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { nullableToString, nullableToNumber } from '../../../lib/type-utils';

// PERFORMANCE: Circuit breaker pattern for resilient OpenSearch operations
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly timeout: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// PERFORMANCE: Batch processing utility for efficient OpenSearch operations
interface BatchOperation {
  index: string;
  id: string;
  body?: any;
  action: 'index' | 'update' | 'delete';
}

class OpenSearchBatchProcessor {
  private client: Client;
  private circuitBreaker: CircuitBreaker;
  private cloudWatch: CloudWatchClient;
  private batchSize: number;

  constructor(endpoint: string, region: string, batchSize = 25) {
    this.batchSize = batchSize;
    this.circuitBreaker = new CircuitBreaker(
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
      60000
    );
    
    // Initialize OpenSearch client with AWS Sigv4 signing
    this.client = new Client({
      ...AwsSigv4Signer({
        region,
        service: 'es',
        getCredentials: () => defaultProvider()(),
      }),
      node: endpoint.startsWith('https://') ? endpoint : `https://${endpoint}`,
      maxRetries: parseInt(process.env.RETRY_ATTEMPTS || '3'),
      requestTimeout: 30000,
      ssl: {
        rejectUnauthorized: true,
      },
    });

    this.cloudWatch = new CloudWatchClient({ region });
  }

  // PERFORMANCE: Process records in batches for optimal throughput
  async processBatch(operations: BatchOperation[]): Promise<void> {
    if (operations.length === 0) return;

    const startTime = Date.now();
    
    try {
      await this.circuitBreaker.execute(async () => {
        // Split operations into chunks of batchSize
        const chunks = this.chunkArray(operations, this.batchSize);
        
        for (const chunk of chunks) {
          await this.executeBulkOperation(chunk);
        }
      });

      const processingTime = Date.now() - startTime;
      
      // PERFORMANCE: Record success metrics
      await this.recordMetric('SearchIndexer/ProcessingSuccess', 1);
      await this.recordMetric('SearchIndexer/ProcessingTime', processingTime);
      await this.recordMetric('SearchIndexer/RecordsProcessed', operations.length);

      if (process.env.ENABLE_PERFORMANCE_LOGGING === 'true') {
        console.log(`Successfully processed ${operations.length} records in ${processingTime}ms`);
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('Batch processing failed:', error);
      
      // Record failure metrics
      await this.recordMetric('SearchIndexer/ProcessingFailure', 1);
      await this.recordMetric('SearchIndexer/ProcessingTime', processingTime);
      
      throw error;
    }
  }

  private async executeBulkOperation(operations: BatchOperation[]): Promise<void> {
    const body = operations.flatMap(op => {
      const action = { [op.action]: { _index: op.index, _id: op.id } };
      
      if (op.action === 'delete') {
        return [action];
      }
      
      return [action, op.body];
    });

    const response = await this.client.bulk({ body });

    // Check for errors in bulk response
    if (response.body.errors) {
      const errors = response.body.items
        .filter((item: any) => item.index?.error || item.update?.error || item.delete?.error)
        .map((item: any) => item.index?.error || item.update?.error || item.delete?.error);
      
      if (errors.length > 0) {
        console.error('Bulk operation errors:', errors);
        throw new Error(`Bulk operation failed: ${errors.length} errors`);
      }
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async recordMetric(metricName: string, value: number): Promise<void> {
    try {
      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'EcosystemMarketplace/Search',
        MetricData: [{
          MetricName: metricName,
          Value: value,
          Unit: metricName.includes('Time') ? 'Milliseconds' : 'Count',
          Timestamp: new Date(),
        }],
      }));
    } catch (error) {
      console.warn('Failed to record CloudWatch metric:', error);
    }
  }
}

// PERFORMANCE: Document transformers for different DynamoDB tables
class DocumentTransformer {
  // Transform Service records for OpenSearch indexing
  static transformService(record: any, eventName: string): BatchOperation | null {
    const serviceData = eventName === 'REMOVE' ? null : record.NewImage || record.OldImage;
    
    if (eventName === 'REMOVE') {
      return {
        index: `services-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        id: nullableToString(record.Keys.id.S),
        action: 'delete'
      };
    }

    if (!serviceData) return null;

    const transformedDoc = {
      id: nullableToString(serviceData.id?.S),
      title: nullableToString(serviceData.title?.S),
      description: nullableToString(serviceData.description?.S),
      category: nullableToString(serviceData.category?.S),
      providerId: nullableToString(serviceData.providerId?.S),
      price: serviceData.price?.N ? parseFloat(serviceData.price.N) : 0,
      priceType: nullableToString(serviceData.priceType?.S),
      currency: serviceData.currency?.S || 'USD',
      maxGroupSize: serviceData.maxGroupSize?.N ? parseInt(serviceData.maxGroupSize.N) : 1,
      duration: serviceData.duration?.N ? parseInt(serviceData.duration.N) : 60,
      address: nullableToString(serviceData.address?.S),
      active: serviceData.active?.BOOL === true,
      tags: serviceData.tags?.SS || [],
      createdAt: nullableToString(serviceData.createdAt?.S),
      updatedAt: serviceData.updatedAt?.S || new Date().toISOString(),
      // Add search-optimized fields
      searchText: [
        serviceData.title?.S,
        serviceData.description?.S,
        serviceData.category?.S,
        serviceData.address?.S
      ].filter(Boolean).join(' ').toLowerCase(),
      priceRange: this.getPriceRange(serviceData.price?.N ? parseFloat(serviceData.price.N) : 0),
      availability: serviceData.active?.BOOL === true ? 'available' : 'unavailable',
    };

    return {
      index: `services-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      id: transformedDoc.id || '',
      body: transformedDoc,
      action: eventName === 'INSERT' ? 'index' : 'update'
    };
  }

  // Transform Booking records for OpenSearch indexing
  static transformBooking(record: any, eventName: string): BatchOperation | null {
    const bookingData = eventName === 'REMOVE' ? null : record.NewImage || record.OldImage;
    
    if (eventName === 'REMOVE') {
      return {
        index: `bookings-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        id: nullableToString(record.Keys.id.S),
        action: 'delete'
      };
    }

    if (!bookingData) return null;

    const transformedDoc = {
      id: nullableToString(bookingData.id?.S),
      serviceId: nullableToString(bookingData.serviceId?.S),
      customerId: nullableToString(bookingData.customerId?.S),
      providerId: nullableToString(bookingData.providerId?.S),
      customerEmail: nullableToString(bookingData.customerEmail?.S),
      providerEmail: nullableToString(bookingData.providerEmail?.S),
      startDateTime: nullableToString(bookingData.startDateTime?.S),
      endDateTime: nullableToString(bookingData.endDateTime?.S),
      status: nullableToString(bookingData.status?.S),
      paymentStatus: nullableToString(bookingData.paymentStatus?.S),
      amount: bookingData.amount?.N ? parseFloat(bookingData.amount.N) : 0,
      currency: bookingData.currency?.S || 'USD',
      createdAt: nullableToString(bookingData.createdAt?.S),
      updatedAt: bookingData.updatedAt?.S || new Date().toISOString(),
      // Add analytics fields
      bookingMonth: bookingData.startDateTime?.S ? 
        new Date(bookingData.startDateTime.S).toISOString().substring(0, 7) : null,
      isCompleted: bookingData.status?.S === 'COMPLETED',
      isPaid: bookingData.paymentStatus?.S === 'PAID',
    };

    return {
      index: `bookings-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      id: transformedDoc.id || '',
      body: transformedDoc,
      action: eventName === 'INSERT' ? 'index' : 'update'
    };
  }

  // Transform UserProfile records for OpenSearch indexing
  static transformUser(record: any, eventName: string): BatchOperation | null {
    const userData = eventName === 'REMOVE' ? null : record.NewImage || record.OldImage;
    
    if (eventName === 'REMOVE') {
      return {
        index: `users-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        id: nullableToString(record.Keys.id.S),
        action: 'delete'
      };
    }

    if (!userData) return null;

    const transformedDoc = {
      id: nullableToString(userData.id?.S),
      email: nullableToString(userData.email?.S),
      firstName: nullableToString(userData.firstName?.S),
      lastName: nullableToString(userData.lastName?.S),
      userType: nullableToString(userData.userType?.S),
      createdAt: nullableToString(userData.createdAt?.S),
      updatedAt: userData.updatedAt?.S || new Date().toISOString(),
      // Add search fields
      fullName: [userData.firstName?.S, userData.lastName?.S].filter(Boolean).join(' '),
      searchText: [
        userData.firstName?.S,
        userData.lastName?.S,
        userData.email?.S
      ].filter(Boolean).join(' ').toLowerCase(),
    };

    return {
      index: `users-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      id: transformedDoc.id || '',
      body: transformedDoc,
      action: eventName === 'INSERT' ? 'index' : 'update'
    };
  }

  private static getPriceRange(price: number): string {
    if (price < 50) return 'budget';
    if (price < 150) return 'moderate';
    if (price < 300) return 'premium';
    return 'luxury';
  }
}

// PERFORMANCE: Main handler with optimized batch processing
export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  const startTime = Date.now();
  
  console.log('Processing DynamoDB Stream event:', {
    recordCount: nullableToString(event.Records.length),
    requestId: nullableToString(context.awsRequestId),
  });

  if (!process.env.OPENSEARCH_DOMAIN_ENDPOINT) {
    throw new Error('OPENSEARCH_DOMAIN_ENDPOINT environment variable is required');
  }

  const processor = new OpenSearchBatchProcessor(
    process.env.OPENSEARCH_DOMAIN_ENDPOINT,
    process.env.OPENSEARCH_REGION || process.env.AWS_REGION || 'us-east-1',
    parseInt(process.env.BATCH_SIZE || '25')
  );

  const operations: BatchOperation[] = [];

  // PERFORMANCE: Transform all records before processing to minimize OpenSearch calls
  for (const record of event.Records) {
    try {
      const tableName = record.eventSourceARN?.split('/')[1] || '';
      const operation = await transformRecord(record, tableName);
      
      if (operation) {
        operations.push(operation);
      }
    } catch (error) {
      console.error('Failed to transform record:', {
        recordId: nullableToString(record.eventID),
        error: nullableToString(error.message),
        record: JSON.stringify(record, null, 2)
      });
      
      // Continue processing other records instead of failing completely
      continue;
    }
  }

  if (operations.length > 0) {
    try {
      await processor.processBatch(operations);
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  const totalTime = Date.now() - startTime;
  
  console.log('DynamoDB Stream processing completed:', {
    recordsReceived: nullableToString(event.Records.length),
    operationsCreated: nullableToString(operations.length),
    processingTimeMs: totalTime,
  });

  return { 
    statusCode: 200, 
    processedRecords: nullableToString(operations.length),
    processingTime: totalTime
  };
};

// PERFORMANCE: Record transformation with table-specific logic
async function transformRecord(record: DynamoDBRecord, tableName: string): Promise<BatchOperation | null> {
  const eventName = record.eventName;
  
  if (!eventName || !['INSERT', 'MODIFY', 'REMOVE'].includes(eventName)) {
    return null;
  }

  // Route to appropriate transformer based on table name
  switch (tableName) {
    case 'Service':
      return DocumentTransformer.transformService(record.dynamodb, eventName);
    
    case 'Booking':
      return DocumentTransformer.transformBooking(record.dynamodb, eventName);
    
    case 'UserProfile':
      return DocumentTransformer.transformUser(record.dynamodb, eventName);
    
    default:
      console.warn(`Unknown table: ${tableName}, skipping record`);
      return null;
  }
}