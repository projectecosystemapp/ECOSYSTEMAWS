/**
 * Webhook Deduplication Service Unit Tests
 * 
 * Comprehensive test suite validating atomic locking, race condition handling,
 * retry logic, and DynamoDB operations for webhook deduplication.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { WebhookDeduplicationService, WebhookRecord } from '@/amplify/data/webhook-deduplication';
import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  QueryCommand, 
  DeleteItemCommand 
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutItemCommand: vi.fn(),
  GetItemCommand: vi.fn(),
  QueryCommand: vi.fn(),
  DeleteItemCommand: vi.fn(),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn((item) => item),
  unmarshall: vi.fn((item) => item),
}));

// Mock correlation tracker
vi.mock('@/lib/resilience/correlation-tracker', () => ({
  correlationTracker: {
    getCurrentCorrelationId: vi.fn().mockReturnValue('test-correlation-123'),
  },
}));

describe('WebhookDeduplicationService', () => {
  let service: WebhookDeduplicationService;
  let mockDynamoClient: { send: Mock };
  let consoleLogSpy: Mock;
  let consoleWarnSpy: Mock;
  let consoleErrorSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockDynamoClient = {
      send: vi.fn(),
    };
    
    (DynamoDBClient as any).mockImplementation(() => mockDynamoClient);
    
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    service = new WebhookDeduplicationService('TestTable', 30000, 30);
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Lock Acquisition', () => {
    it('should successfully acquire lock for new event', async () => {
      // No existing record
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null }) // getWebhookRecord
        .mockResolvedValueOnce({}); // putItem

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded',
        'sig_abc',
        'stripe'
      );

      expect(result.acquired).toBe(true);
      expect(result.existingRecord).toBeUndefined();
      
      // Verify DynamoDB calls
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
      const putCall = mockDynamoClient.send.mock.calls[1][0];
      expect(putCall.input.Item.eventId).toBe('evt_123');
      expect(putCall.input.Item.status).toBe('PROCESSING');
      expect(putCall.input.ConditionExpression).toBe('attribute_not_exists(eventId)');
    });

    it('should reject lock when event is already being processed', async () => {
      const existingRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now(),
        processingStartedAt: Date.now() - 5000, // 5 seconds ago
        status: 'PROCESSING',
        retryCount: 0,
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send.mockResolvedValueOnce({ 
        Item: marshall(existingRecord) 
      });

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded'
      );

      expect(result.acquired).toBe(false);
      expect(result.existingRecord).toEqual(existingRecord);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('currently being processed'),
        expect.any(Object)
      );
    });

    it('should reject lock when event is already completed', async () => {
      const existingRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now() - 60000,
        processingCompletedAt: Date.now() - 60000,
        status: 'COMPLETED',
        result: { processed: true },
        retryCount: 0,
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send.mockResolvedValueOnce({ 
        Item: marshall(existingRecord) 
      });

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded'
      );

      expect(result.acquired).toBe(false);
      expect(result.existingRecord).toEqual(existingRecord);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already processed successfully'),
        expect.any(Object)
      );
    });

    it('should override stale processing lock', async () => {
      const staleRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now() - 60000, // 1 minute ago
        processingStartedAt: Date.now() - 60000, // Started 1 minute ago
        status: 'PROCESSING',
        retryCount: 0,
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: marshall(staleRecord) }) // getWebhookRecord
        .mockResolvedValueOnce({}); // putItem

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded'
      );

      expect(result.acquired).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found stale processing lock'),
        expect.any(Object)
      );
      
      // Verify conditional expression for override
      const putCall = mockDynamoClient.send.mock.calls[1][0];
      expect(putCall.input.ConditionExpression).toContain('processingStartedAt < :lockExpiry');
    });

    it('should retry failed event if under retry limit', async () => {
      const failedRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now() - 30000,
        status: 'FAILED',
        error: 'Previous error',
        retryCount: 2, // Under limit of 3
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: marshall(failedRecord) })
        .mockResolvedValueOnce({});

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded'
      );

      expect(result.acquired).toBe(true);
      
      // Verify retry count is preserved
      const putCall = mockDynamoClient.send.mock.calls[1][0];
      expect(putCall.input.Item.retryCount).toBe(2);
    });

    it('should reject if max retries exceeded', async () => {
      const failedRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now() - 30000,
        status: 'FAILED',
        error: 'Multiple failures',
        retryCount: 3, // At max retry limit
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send.mockResolvedValueOnce({ 
        Item: marshall(failedRecord) 
      });

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded'
      );

      expect(result.acquired).toBe(false);
      expect(result.existingRecord).toEqual(failedRecord);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed max retries'),
        expect.any(Object)
      );
    });

    it('should handle ConditionalCheckFailedException', async () => {
      const existingRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now(),
        status: 'PROCESSING',
        retryCount: 0,
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null }) // Initial check shows no record
        .mockRejectedValueOnce({ 
          name: 'ConditionalCheckFailedException',
          message: 'The conditional request failed'
        }) // But put fails due to race condition
        .mockResolvedValueOnce({ Item: marshall(existingRecord) }); // Get existing

      const result = await service.acquireProcessingLock(
        'evt_123',
        'payment_intent.succeeded'
      );

      expect(result.acquired).toBe(false);
      expect(result.existingRecord).toEqual(existingRecord);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to acquire lock'),
        expect.any(Object)
      );
    });

    it('should propagate DynamoDB errors', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null })
        .mockRejectedValueOnce(new Error('DynamoDB service error'));

      await expect(
        service.acquireProcessingLock('evt_123', 'payment_intent.succeeded')
      ).rejects.toThrow('DynamoDB service error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error acquiring processing lock'),
        expect.any(Object)
      );
    });
  });

  describe('Mark Completed', () => {
    it('should mark webhook as completed with result', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({});
      
      const result = { paymentId: 'pi_123', amount: 1000 };
      await service.markCompleted('evt_123', result);

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      const putCall = mockDynamoClient.send.mock.calls[0][0];
      
      expect(putCall.input.Item.eventId).toBe('evt_123');
      expect(putCall.input.Item.status).toBe('COMPLETED');
      expect(putCall.input.Item.processingCompletedAt).toBeDefined();
      expect(putCall.input.Item.result).toBe(JSON.stringify(result));
      expect(putCall.input.ConditionExpression).toContain('attribute_exists(eventId)');
      expect(putCall.input.ConditionExpression).toContain('#status = :processingStatus');
    });

    it('should handle completion without result', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({});
      
      await service.markCompleted('evt_123');

      const putCall = mockDynamoClient.send.mock.calls[0][0];
      expect(putCall.input.Item.result).toBeUndefined();
    });

    it('should handle DynamoDB errors on completion', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(
        service.markCompleted('evt_123', { result: 'data' })
      ).rejects.toThrow('DynamoDB error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error marking webhook as completed'),
        expect.any(Object)
      );
    });
  });

  describe('Mark Failed', () => {
    it('should mark webhook as failed with retry', async () => {
      const existingRecord: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now(),
        status: 'PROCESSING',
        retryCount: 1,
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: marshall(existingRecord) })
        .mockResolvedValueOnce({});

      await service.markFailed('evt_123', 'Processing error', true);

      const putCall = mockDynamoClient.send.mock.calls[1][0];
      expect(putCall.input.Item.eventId).toBe('evt_123');
      expect(putCall.input.Item.status).toBe('FAILED');
      expect(putCall.input.Item.error).toBe('Processing error');
      expect(putCall.input.Item.retryCount).toBe(2); // Incremented
      expect(putCall.input.Item.processingCompletedAt).toBeDefined();
    });

    it('should mark as permanently failed when shouldRetry is false', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({});

      await service.markFailed('evt_123', 'Fatal error', false);

      const putCall = mockDynamoClient.send.mock.calls[1][0];
      expect(putCall.input.Item.status).toBe('FAILED');
      expect(putCall.input.Item.retryCount).toBe(1);
    });

    it('should handle missing existing record', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({});

      await service.markFailed('evt_123', 'Error');

      const putCall = mockDynamoClient.send.mock.calls[1][0];
      expect(putCall.input.Item.retryCount).toBe(1);
    });
  });

  describe('Get Webhook Record', () => {
    it('should retrieve existing webhook record', async () => {
      const record: WebhookRecord = {
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        processedAt: Date.now(),
        status: 'COMPLETED',
        retryCount: 0,
        ttl: Math.floor(Date.now() / 1000) + 86400,
        source: 'stripe',
      };

      mockDynamoClient.send.mockResolvedValueOnce({ 
        Item: marshall(record) 
      });

      const result = await service.getWebhookRecord('evt_123');

      expect(result).toEqual(record);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: expect.objectContaining({ name: 'GetItemCommand' })
        })
      );
    });

    it('should return null for non-existent record', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await service.getWebhookRecord('evt_999');

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      const result = await service.getWebhookRecord('evt_123');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error getting webhook record'),
        expect.any(Object)
      );
    });
  });

  describe('Is Processed', () => {
    it('should return true for completed webhook', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: marshall({
          eventId: 'evt_123',
          status: 'COMPLETED',
          processedAt: Date.now(),
          retryCount: 0,
          ttl: Math.floor(Date.now() / 1000) + 86400,
          source: 'stripe',
        }),
      });

      const result = await service.isProcessed('evt_123');
      expect(result).toBe(true);
    });

    it('should return false for non-completed statuses', async () => {
      const testCases = ['PROCESSING', 'FAILED', 'SKIPPED'];
      
      for (const status of testCases) {
        mockDynamoClient.send.mockResolvedValueOnce({
          Item: marshall({
            eventId: 'evt_123',
            status,
            processedAt: Date.now(),
            retryCount: 0,
            ttl: Math.floor(Date.now() / 1000) + 86400,
            source: 'stripe',
          }),
        });

        const result = await service.isProcessed('evt_123');
        expect(result).toBe(false);
      }
    });

    it('should return false for non-existent webhook', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await service.isProcessed('evt_999');
      expect(result).toBe(false);
    });
  });

  describe('Stripe Signature Validation', () => {
    it('should validate correct Stripe signature', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const secret = 'whsec_test123';
      
      // Create a valid signature (simplified for testing)
      const crypto = require('crypto');
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      
      const signature = `t=${timestamp},v1=${expectedSignature}`;
      
      const result = service.validateStripeSignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it('should reject signature with invalid format', () => {
      const result = service.validateStripeSignature(
        'payload',
        'invalid_signature',
        'secret'
      );
      expect(result).toBe(false);
    });

    it('should reject signature outside time tolerance', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const signature = `t=${oldTimestamp},v1=dummy_signature`;
      
      const result = service.validateStripeSignature(payload, signature, 'secret');
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('timestamp outside tolerance')
      );
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=wrong_signature`;
      
      const result = service.validateStripeSignature(payload, signature, 'secret');
      expect(result).toBe(false);
    });

    it('should handle signature validation errors', () => {
      // Pass invalid inputs to trigger error
      const result = service.validateStripeSignature(null as any, null as any, null as any);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error validating webhook signature'),
        expect.any(Error)
      );
    });
  });

  describe('Cleanup Old Records', () => {
    it('should delete old webhook records', async () => {
      const oldRecords = [
        { eventId: 'evt_old1', processedAt: Date.now() - 40 * 86400000 },
        { eventId: 'evt_old2', processedAt: Date.now() - 35 * 86400000 },
      ];

      mockDynamoClient.send
        .mockResolvedValueOnce({ 
          Items: oldRecords.map(r => marshall(r))
        })
        .mockResolvedValueOnce({}) // Delete 1
        .mockResolvedValueOnce({}); // Delete 2

      const deletedCount = await service.cleanupOldRecords(30);

      expect(deletedCount).toBe(2);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(3);
      
      // Verify delete commands
      const deleteCalls = mockDynamoClient.send.mock.calls.slice(1);
      expect(deleteCalls[0][0].input.Key.eventId).toBe('evt_old1');
      expect(deleteCalls[1][0].input.Key.eventId).toBe('evt_old2');
    });

    it('should handle query errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('Query failed'));

      const deletedCount = await service.cleanupOldRecords(30);

      expect(deletedCount).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error cleaning up old records'),
        expect.any(Error)
      );
    });

    it('should continue cleanup even if some deletes fail', async () => {
      const oldRecords = [
        { eventId: 'evt_old1' },
        { eventId: 'evt_old2' },
      ];

      mockDynamoClient.send
        .mockResolvedValueOnce({ Items: oldRecords.map(r => marshall(r)) })
        .mockResolvedValueOnce({}) // Delete 1 succeeds
        .mockRejectedValueOnce(new Error('Delete failed')); // Delete 2 fails

      const deletedCount = await service.cleanupOldRecords(30);

      expect(deletedCount).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should return placeholder statistics', async () => {
      const stats = await service.getStatistics(86400000);

      expect(stats).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        skipped: 0,
        averageProcessingTime: 0,
      });
    });
  });

  describe('Race Condition Handling', () => {
    it('should handle concurrent lock acquisition attempts', async () => {
      // Simulate two concurrent attempts to process the same webhook
      let call1Resolved = false;
      let call2Resolved = false;

      // First call gets the lock
      const promise1 = service.acquireProcessingLock('evt_race', 'type')
        .then(result => {
          call1Resolved = true;
          return result;
        });

      // Second call should be rejected
      const promise2 = service.acquireProcessingLock('evt_race', 'type')
        .then(result => {
          call2Resolved = true;
          return result;
        });

      // Mock responses
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null }) // First check - no record
        .mockResolvedValueOnce({}) // First put succeeds
        .mockResolvedValueOnce({ // Second check - record exists
          Item: marshall({
            eventId: 'evt_race',
            status: 'PROCESSING',
            processedAt: Date.now(),
            retryCount: 0,
            ttl: Math.floor(Date.now() / 1000) + 86400,
            source: 'stripe',
          }),
        });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.acquired).toBe(true);
      expect(result2.acquired).toBe(false);
      expect(call1Resolved).toBe(true);
      expect(call2Resolved).toBe(true);
    });
  });

  describe('TTL Management', () => {
    it('should set correct TTL on new records', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({});

      await service.acquireProcessingLock('evt_ttl', 'type');

      const putCall = mockDynamoClient.send.mock.calls[1][0];
      const ttl = putCall.input.Item.ttl;
      
      // TTL should be 30 days from now
      const expectedTtl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      expect(Math.abs(ttl - expectedTtl)).toBeLessThan(5); // Allow 5 second tolerance
    });

    it('should respect custom TTL days parameter', async () => {
      const customService = new WebhookDeduplicationService('TestTable', 30000, 7); // 7 days
      
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({});

      await customService.acquireProcessingLock('evt_custom_ttl', 'type');

      const putCall = mockDynamoClient.send.mock.calls[1][0];
      const ttl = putCall.input.Item.ttl;
      
      const expectedTtl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
      expect(Math.abs(ttl - expectedTtl)).toBeLessThan(5);
    });
  });
});