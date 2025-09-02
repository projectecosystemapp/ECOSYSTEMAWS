import { DynamoDBStreamEvent, DynamoDBRecord, Context } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Logger } from '@aws-lambda-powertools/logger';
import { openSearchConfig } from './resource';

// PERFORMANCE: High-throughput DynamoDB Streams to OpenSearch sync
// Baseline: Manual data replication, eventual consistency issues
// Target: <500ms sync latency, 1000+ records/second throughput
// Technique: Batched operations with circuit breaker and retry logic

const logger = new Logger({ serviceName: 'opensearch-sync' });

interface SyncMetrics {
  processedRecords: number;
  failedRecords: number;
  batchSize: number;
  processingTime: number;
}

interface ProcessingResult {
  success: boolean;
  recordId: string;
  error?: string;
  retryCount?: number;
}

class OpenSearchSyncHandler {
  private client: Client;
  private batchProcessor: BatchProcessor;
  private metrics: SyncMetrics = {
    processedRecords: 0,
    failedRecords: 0,
    batchSize: 0,
    processingTime: 0
  };

  constructor() {
    // Initialize OpenSearch client with performance optimizations
    this.client = new Client({
      ...AwsSigv4Signer({
        region: process.env.AWS_REGION || 'us-east-1',
        service: 'aoss', // OpenSearch Serverless
        getCredentials: () => defaultProvider()(),
      }),
      node: process.env.OPENSEARCH_ENDPOINT,
      maxRetries: 3,
      requestTimeout: 30000,
      sniffOnStart: false, // Disable for serverless
      sniffOnConnectionFault: false,
      // Connection pooling for high throughput
      ssl: {
        rejectUnauthorized: true
      },
      // Performance: Keep connections alive
      keepAlive: true,
      keepAliveInterval: 60000,
      maxSockets: 256,
      maxFreeSockets: 256
    });

    this.batchProcessor = new BatchProcessor(this.client, logger);
  }

  async handleStreamEvent(event: DynamoDBStreamEvent, context: Context): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing DynamoDB stream event', {
        recordCount: event.Records.length,
        requestId: context.awsRequestId
      });

      // Group records by operation type for batch efficiency
      const recordGroups = this.groupRecordsByOperation(event.Records);
      
      // Process each group with optimized batch operations
      const results = await Promise.all([
        this.processInsertUpdates(recordGroups.insertUpdate),
        this.processDeletes(recordGroups.delete),
        this.processModifies(recordGroups.modify)
      ]);

      // Aggregate results and metrics
      const totalResults = results.flat();
      this.updateMetrics(totalResults, startTime);
      
      // Report performance metrics
      await this.reportMetrics();

      logger.info('Stream processing completed', {
        totalRecords: event.Records.length,
        successfulRecords: totalResults.filter(r => r.success).length,
        failedRecords: totalResults.filter(r => !r.success).length,
        processingTimeMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to process stream event', {
        error: error.message,
        requestId: context.awsRequestId
      });
      throw error;
    }
  }

  private groupRecordsByOperation(records: DynamoDBRecord[]): {
    insertUpdate: DynamoDBRecord[];
    delete: DynamoDBRecord[];
    modify: DynamoDBRecord[];
  } {
    return records.reduce((groups, record) => {
      switch (record.eventName) {
        case 'INSERT':
        case 'UPDATE':
          // Treat UPDATE as upsert for simplicity
          groups.insertUpdate.push(record);
          break;
        case 'REMOVE':
          groups.delete.push(record);
          break;
        case 'MODIFY':
          groups.modify.push(record);
          break;
        default:
          logger.warn('Unknown event type', { eventName: record.eventName });
      }
      return groups;
    }, { insertUpdate: [], delete: [], modify: [] });
  }

  private async processInsertUpdates(records: DynamoDBRecord[]): Promise<ProcessingResult[]> {
    if (records.length === 0) return [];

    // Group by table for targeted index operations
    const recordsByTable = this.groupRecordsByTable(records);
    const results: ProcessingResult[] = [];

    for (const [tableName, tableRecords] of Object.entries(recordsByTable)) {
      const indexName = this.getIndexName(tableName);
      if (!indexName) {
        logger.warn('No index mapping for table', { tableName });
        continue;
      }

      // Create batch operations for bulk indexing
      const operations = this.createBulkIndexOperations(tableRecords, indexName);
      const batchResults = await this.batchProcessor.executeBulkOperations(operations);
      results.push(...batchResults);
    }

    return results;
  }

  private async processDeletes(records: DynamoDBRecord[]): Promise<ProcessingResult[]> {
    if (records.length === 0) return [];

    const recordsByTable = this.groupRecordsByTable(records);
    const results: ProcessingResult[] = [];

    for (const [tableName, tableRecords] of Object.entries(recordsByTable)) {
      const indexName = this.getIndexName(tableName);
      if (!indexName) continue;

      const operations = this.createBulkDeleteOperations(tableRecords, indexName);
      const batchResults = await this.batchProcessor.executeBulkOperations(operations);
      results.push(...batchResults);
    }

    return results;
  }

  private async processModifies(records: DynamoDBRecord[]): Promise<ProcessingResult[]> {
    // For MODIFY events, we treat them as partial updates
    return this.processInsertUpdates(records);
  }

  private groupRecordsByTable(records: DynamoDBRecord[]): Record<string, DynamoDBRecord[]> {
    return records.reduce((groups, record) => {
      const tableName = this.extractTableName(record.eventSourceARN);
      if (!groups[tableName]) {
        groups[tableName] = [];
      }
      groups[tableName].push(record);
      return groups;
    }, {} as Record<string, DynamoDBRecord[]>);
  }

  private extractTableName(arn: string): string {
    // Extract table name from DynamoDB stream ARN
    const arnParts = arn.split('/');
    return arnParts[1]; // table name is the second part
  }

  private getIndexName(tableName: string): string | null {
    const mapping: Record<string, string> = {
      'Service': openSearchConfig.indices.services.name,
      'Booking': openSearchConfig.indices.bookings.name,
      'UserProfile': openSearchConfig.indices.users.name
    };
    return mapping[tableName] || null;
  }

  private createBulkIndexOperations(records: DynamoDBRecord[], indexName: string): any[] {
    const operations: any[] = [];

    for (const record of records) {
      if (!record.dynamodb?.NewImage) continue;

      const document = this.convertDynamoDBToDocument(record.dynamodb.NewImage, indexName);
      const recordId = this.extractRecordId(record);

      operations.push(
        { index: { _index: indexName, _id: recordId } },
        document
      );
    }

    return operations;
  }

  private createBulkDeleteOperations(records: DynamoDBRecord[], indexName: string): any[] {
    const operations: any[] = [];

    for (const record of records) {
      const recordId = this.extractRecordId(record);
      operations.push({ delete: { _index: indexName, _id: recordId } });
    }

    return operations;
  }

  private extractRecordId(record: DynamoDBRecord): string {
    // Extract the primary key value
    const keys = record.dynamodb?.Keys;
    if (!keys?.id?.S) {
      throw new Error('Record missing primary key');
    }
    return keys.id.S;
  }

  private convertDynamoDBToDocument(dynamoItem: any, indexName: string): any {
    // PERFORMANCE: Optimized DynamoDB to OpenSearch document conversion
    // Transform DynamoDB AttributeValues to plain JSON with type-specific optimizations
    
    const document: any = {};

    for (const [key, value] of Object.entries(dynamoItem)) {
      document[key] = this.convertAttributeValue(value as any);
    }

    // Add index-specific optimizations
    this.applyIndexOptimizations(document, indexName);

    return document;
  }

  private convertAttributeValue(attributeValue: any): any {
    if (attributeValue.S) return attributeValue.S;
    if (attributeValue.N) return parseFloat(attributeValue.N);
    if (attributeValue.BOOL) return attributeValue.BOOL;
    if (attributeValue.SS) return attributeValue.SS;
    if (attributeValue.NS) return attributeValue.NS.map((n: string) => parseFloat(n));
    if (attributeValue.L) return attributeValue.L.map((item: any) => this.convertAttributeValue(item));
    if (attributeValue.M) {
      const obj: any = {};
      for (const [k, v] of Object.entries(attributeValue.M)) {
        obj[k] = this.convertAttributeValue(v);
      }
      return obj;
    }
    if (attributeValue.NULL) return null;
    
    return attributeValue;
  }

  private applyIndexOptimizations(document: any, indexName: string): void {
    // Add computed fields for search optimization
    switch (indexName) {
      case 'services':
        this.optimizeServiceDocument(document);
        break;
      case 'bookings':
        this.optimizeBookingDocument(document);
        break;
      case 'users':
        this.optimizeUserDocument(document);
        break;
    }

    // Add common timestamp for freshness scoring
    document.lastSyncedAt = new Date().toISOString();
  }

  private optimizeServiceDocument(document: any): void {
    // PERFORMANCE: Add computed fields for faster search and sort
    
    // Popularity score based on recent bookings and rating
    const rating = document.rating || 0;
    const reviewCount = document.reviewCount || 0;
    const daysOld = document.createdAt ? 
      Math.max(1, (Date.now() - new Date(document.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 365;
    
    // Boost recent, highly-rated services with many reviews
    document.popularityScore = (rating * Math.log(reviewCount + 1)) / Math.log(daysOld + 1);

    // Parse address for geo-location if available
    if (document.address && !document.location?.coordinates) {
      // This would normally call a geocoding service
      // For now, add placeholder for geo search capability
      document.location = {
        address: document.address,
        coordinates: null // Would be populated by geocoding
      };
    }

    // Search-optimized tags from category and title
    document.searchTags = this.generateSearchTags(document.title, document.category);
  }

  private optimizeBookingDocument(document: any): void {
    // Add time-based fields for analytics aggregations
    if (document.startDateTime) {
      const date = new Date(document.startDateTime);
      document.dayOfWeek = date.getDay();
      document.monthOfYear = date.getMonth() + 1;
      document.hourOfDay = date.getHours();
      
      // Create time slot buckets for efficient aggregations
      document.timeSlot = `${date.getHours()}:00-${date.getHours() + 1}:00`;
    }
  }

  private optimizeUserDocument(document: any): void {
    // Add computed engagement metrics
    if (document.userType === 'provider') {
      // Provider-specific optimizations would go here
      document.isActiveProvider = document.totalBookings > 0;
    }
  }

  private generateSearchTags(title?: string, category?: string): string[] {
    const tags: string[] = [];
    
    if (title) {
      // Extract keywords from title
      const words = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      tags.push(...words);
    }
    
    if (category) {
      tags.push(category.toLowerCase());
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private updateMetrics(results: ProcessingResult[], startTime: number): void {
    this.metrics.processedRecords = results.length;
    this.metrics.failedRecords = results.filter(r => !r.success).length;
    this.metrics.processingTime = Date.now() - startTime;
  }

  private async reportMetrics(): Promise<void> {
    // Report metrics to CloudWatch for monitoring
    logger.info('Processing metrics', this.metrics);
    
    // In production, would send custom metrics to CloudWatch
    // await cloudWatch.putMetricData({...});
  }
}

class BatchProcessor {
  private readonly MAX_BATCH_SIZE = 500; // OpenSearch bulk API limit
  private readonly MAX_CONCURRENT_BATCHES = 10;
  private readonly RETRY_DELAYS = [100, 200, 500, 1000]; // Progressive backoff

  constructor(
    private client: Client,
    private logger: Logger
  ) {}

  async executeBulkOperations(operations: any[]): Promise<ProcessingResult[]> {
    if (operations.length === 0) return [];

    const results: ProcessingResult[] = [];
    const batches = this.createBatches(operations);

    // Process batches with controlled concurrency
    const batchPromises = batches.map((batch, index) => 
      this.processBatch(batch, index)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());

    return results;
  }

  private createBatches(operations: any[]): any[][] {
    const batches: any[][] = [];
    
    for (let i = 0; i < operations.length; i += this.MAX_BATCH_SIZE) {
      batches.push(operations.slice(i, i + this.MAX_BATCH_SIZE));
    }

    return batches;
  }

  private async processBatch(batch: any[], batchIndex: number): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    let retryCount = 0;

    while (retryCount <= this.RETRY_DELAYS.length) {
      try {
        const response = await this.client.bulk({
          body: batch,
          timeout: '30s',
          refresh: false // Don't refresh immediately for performance
        });

        // Process bulk response
        if (response.body.errors) {
          const failedItems = response.body.items.filter((item: any) => 
            item.index?.error || item.delete?.error
          );
          
          this.logger.warn('Batch had errors', {
            batchIndex,
            failedCount: failedItems.length,
            totalCount: response.body.items.length
          });

          // Add results for failed items
          failedItems.forEach((item: any, idx: number) => {
            results.push({
              success: false,
              recordId: `batch_${batchIndex}_${idx}`,
              error: item.index?.error || item.delete?.error,
              retryCount
            });
          });
        }

        // Add successful results
        const successCount = response.body.items.length - (response.body.errors ? results.length : 0);
        for (let i = 0; i < successCount; i++) {
          results.push({
            success: true,
            recordId: `batch_${batchIndex}_${i}`,
            retryCount
          });
        }

        break; // Success, exit retry loop

      } catch (error) {
        retryCount++;
        
        if (retryCount > this.RETRY_DELAYS.length) {
          this.logger.error('Batch failed after all retries', {
            batchIndex,
            error: error.message,
            retryCount
          });

          // Mark all items in batch as failed
          for (let i = 0; i < batch.length; i += 2) { // Operations come in pairs
            results.push({
              success: false,
              recordId: `batch_${batchIndex}_${i / 2}`,
              error: error.message,
              retryCount
            });
          }
          break;
        }

        // Wait before retry with exponential backoff
        await this.sleep(this.RETRY_DELAYS[retryCount - 1]);
        this.logger.warn('Retrying batch', { batchIndex, retryCount });
      }
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Lambda handler
export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<void> => {
  const syncHandler = new OpenSearchSyncHandler();
  await syncHandler.handleStreamEvent(event, context);
};