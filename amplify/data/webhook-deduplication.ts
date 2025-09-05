/**
 * Webhook Deduplication Service
 * 
 * Implements atomic webhook processing using DynamoDB conditional writes
 * to prevent duplicate processing and handle race conditions.
 * 
 * Uses DynamoDB's conditional put for distributed locking pattern.
 */

import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { correlationTracker } from '@/lib/resilience/correlation-tracker';
import crypto from 'crypto';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

export interface WebhookRecord {
  eventId: string;
  eventType: string;
  processedAt: number;
  processingStartedAt?: number;
  processingCompletedAt?: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  result?: any;
  error?: string;
  retryCount: number;
  ttl: number;
  correlationId?: string;
  signature?: string;
  source: string;
}

export class WebhookDeduplicationService {
  private dynamoClient: DynamoDBClient;
  private tableName: string;
  private lockTimeoutMs: number;
  private ttlDays: number;

  constructor(
    tableName: string = process.env.WEBHOOK_DEDUP_TABLE || 'ProcessedWebhooks',
    lockTimeoutMs: number = 30000, // 30 seconds default lock timeout
    ttlDays: number = 30 // 30 days default TTL
  ) {
    this.tableName = tableName;
    this.lockTimeoutMs = lockTimeoutMs;
    this.ttlDays = ttlDays;
    
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: 3,
      retryMode: 'adaptive'
    });
  }

  /**
   * Attempt to acquire a lock for processing a webhook event
   * Returns true if lock acquired, false if already being processed
   */
  async acquireProcessingLock(
    eventId: string,
    eventType: string,
    signature?: string,
    source: string = 'stripe'
  ): Promise<{ acquired: boolean; existingRecord?: WebhookRecord }> {
    const correlationId = correlationTracker.getCurrentCorrelationId();
    const now = Date.now();
    const ttl = Math.floor(now / 1000) + (this.ttlDays * 24 * 60 * 60);

    try {
      // First, check if the webhook already exists
      const existingRecord = await this.getWebhookRecord(eventId);
      
      if (existingRecord) {
        // Check if it's stuck in processing state
        if (existingRecord.status === 'PROCESSING') {
          const processingDuration = now - (existingRecord.processingStartedAt || existingRecord.processedAt);
          
          if (processingDuration > this.lockTimeoutMs) {
            console.warn('[WebhookDedup] Found stale processing lock, attempting to override', {
              eventId,
              processingDuration,
              correlationId
            });
            // Lock has expired, we can try to take it over
          } else {
            console.log('[WebhookDedup] Webhook is currently being processed', {
              eventId,
              status: nullableToString(existingRecord.status),
              correlationId
            });
            return { acquired: false, existingRecord };
          }
        } else if (existingRecord.status === 'COMPLETED') {
          console.log('[WebhookDedup] Webhook already processed successfully', {
            eventId,
            processedAt: existingRecord.processedAt ? new Date(existingRecord.processedAt).toISOString() : null,
            correlationId
          });
          return { acquired: false, existingRecord };
        } else if (existingRecord.status === 'FAILED' && existingRecord.retryCount >= 3) {
          console.log('[WebhookDedup] Webhook processing failed max retries', {
            eventId,
            retryCount: existingRecord.retryCount ?? 0,
            correlationId
          });
          return { acquired: false, existingRecord };
        }
      }

      // Attempt to acquire lock with conditional put
      const webhookRecord: WebhookRecord = {
        eventId,
        eventType,
        processedAt: now,
        processingStartedAt: now,
        status: 'PROCESSING',
        retryCount: existingRecord?.retryCount || 0,
        ttl,
        correlationId,
        signature,
        source
      };

      // Use conditional expression to ensure atomic lock acquisition
      const conditionalExpression = existingRecord 
        ? 'attribute_exists(eventId) AND (#status = :failedStatus OR (processingStartedAt < :lockExpiry))'
        : 'attribute_not_exists(eventId)';

      const expressionAttributeNames = existingRecord
        ? { '#status': 'status' }
        : undefined;

      const expressionAttributeValues = existingRecord
        ? marshall({
            ':failedStatus': 'FAILED',
            ':lockExpiry': now - this.lockTimeoutMs
          })
        : undefined;

      await this.dynamoClient.send(new PutItemCommand({
        TableName: nullableToString(this.tableName),
        Item: marshall(webhookRecord),
        ConditionExpression: conditionalExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      console.log('[WebhookDedup] Successfully acquired processing lock', {
        eventId,
        eventType,
        correlationId
      });

      return { acquired: true };
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.log('[WebhookDedup] Failed to acquire lock - webhook already being processed', {
          eventId,
          correlationId
        });
        
        // Try to get the existing record for context
        const existingRecord = await this.getWebhookRecord(eventId);
        return { acquired: false, existingRecord: existingRecord || undefined };
      }
      
      console.error('[WebhookDedup] Error acquiring processing lock', {
        eventId,
        error: nullableToString(error.message),
        correlationId
      });
      throw error;
    }
  }

  /**
   * Mark webhook processing as completed
   */
  async markCompleted(
    eventId: string,
    result?: any
  ): Promise<void> {
    const correlationId = correlationTracker.getCurrentCorrelationId();
    const now = Date.now();

    try {
      await this.dynamoClient.send(new PutItemCommand({
        TableName: nullableToString(this.tableName),
        Item: marshall({
          eventId,
          status: 'COMPLETED',
          processingCompletedAt: now,
          result: result ? JSON.stringify(result) : undefined,
          correlationId
        } as Partial<WebhookRecord>),
        ConditionExpression: 'attribute_exists(eventId) AND #status = :processingStatus',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':processingStatus': 'PROCESSING'
        })
      }));

      console.log('[WebhookDedup] Marked webhook as completed', {
        eventId,
        correlationId
      });
    } catch (error: any) {
      console.error('[WebhookDedup] Error marking webhook as completed', {
        eventId,
        error: nullableToString(error.message),
        correlationId
      });
      throw error;
    }
  }

  /**
   * Mark webhook processing as failed
   */
  async markFailed(
    eventId: string,
    error: string,
    shouldRetry: boolean = true
  ): Promise<void> {
    const correlationId = correlationTracker.getCurrentCorrelationId();
    const now = Date.now();

    try {
      const existingRecord = await this.getWebhookRecord(eventId);
      const retryCount = (existingRecord?.retryCount || 0) + 1;
      const status = shouldRetry && retryCount < 3 ? 'FAILED' : 'FAILED';

      await this.dynamoClient.send(new PutItemCommand({
        TableName: nullableToString(this.tableName),
        Item: marshall({
          eventId,
          status,
          processingCompletedAt: now,
          error,
          retryCount,
          correlationId
        } as Partial<WebhookRecord>),
        ConditionExpression: 'attribute_exists(eventId)',
      }));

      console.log('[WebhookDedup] Marked webhook as failed', {
        eventId,
        retryCount,
        shouldRetry,
        correlationId
      });
    } catch (error: any) {
      console.error('[WebhookDedup] Error marking webhook as failed', {
        eventId,
        error: nullableToString(error.message),
        correlationId
      });
      throw error;
    }
  }

  /**
   * Get webhook record
   */
  async getWebhookRecord(eventId: string): Promise<WebhookRecord | null> {
    try {
      const response = await this.dynamoClient.send(new GetItemCommand({
        TableName: nullableToString(this.tableName),
        Key: marshall({ eventId })
      }));

      if (!response.Item) {
        return null;
      }

      return unmarshall(response.Item) as WebhookRecord;
    } catch (error: any) {
      console.error('[WebhookDedup] Error getting webhook record', {
        eventId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Check if webhook has been processed
   */
  async isProcessed(eventId: string): Promise<boolean> {
    const record = await this.getWebhookRecord(eventId);
    return record !== null && record.status === 'COMPLETED';
  }

  /**
   * Clean up old webhook records (for manual maintenance)
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
    const cutoffTime = Math.floor((Date.now() / 1000) - (daysToKeep * 24 * 60 * 60));
    let deletedCount = 0;

    try {
      // Query for old records (this would need a GSI on processedAt in production)
      const response = await this.dynamoClient.send(new QueryCommand({
        TableName: nullableToString(this.tableName),
        IndexName: 'ProcessedAtIndex', // Assumes GSI exists
        KeyConditionExpression: 'processedAt < :cutoff',
        ExpressionAttributeValues: marshall({
          ':cutoff': cutoffTime
        })
      }));

      if (response.Items) {
        for (const item of response.Items) {
          const record = unmarshall(item) as WebhookRecord;
          await this.dynamoClient.send(new DeleteItemCommand({
            TableName: nullableToString(this.tableName),
            Key: marshall({ eventId: record.eventId })
          }));
          deletedCount++;
        }
      }

      console.log(`[WebhookDedup] Cleaned up ${deletedCount} old webhook records`);
      return deletedCount;
    } catch (error: any) {
      console.error('[WebhookDedup] Error cleaning up old records', error);
      return deletedCount;
    }
  }

  /**
   * Validate webhook signature (Stripe-specific)
   */
  validateStripeSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const elements = signature.split(',');
      let timestamp = '';
      let signatures: string[] = [];

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamp = value;
        } else if (key === 'v1') {
          signatures.push(value);
        }
      }

      if (!timestamp || signatures.length === 0) {
        return false;
      }

      // Check if timestamp is within tolerance (5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const tolerance = 300; // 5 minutes
      if (Math.abs(currentTime - parseInt(timestamp)) > tolerance) {
        console.warn('[WebhookDedup] Webhook timestamp outside tolerance window');
        return false;
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Check if any signature matches
      return signatures.includes(expectedSignature);
    } catch (error) {
      console.error('[WebhookDedup] Error validating webhook signature', error);
      return false;
    }
  }

  /**
   * Get processing statistics
   */
  async getStatistics(timeWindowMs: number = 86400000): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    skipped: number;
    averageProcessingTime: number;
  }> {
    // This would need proper indexing and querying in production
    // For now, returning placeholder stats
    return {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      skipped: 0,
      averageProcessingTime: 0
    };
  }
}