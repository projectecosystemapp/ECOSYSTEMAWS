/**
 * Circuit Breaker Unit Tests
 * 
 * Comprehensive test suite validating all state transitions,
 * failure thresholds, timeout behavior, and DynamoDB persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { CircuitBreaker, CircuitState } from '@/lib/resilience/circuit-breaker';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  GetItemCommand: vi.fn(),
  PutItemCommand: vi.fn(),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn((item) => item),
  unmarshall: vi.fn((item) => item),
}));

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockDynamoClient: { send: Mock };
  let consoleErrorSpy: Mock;
  let consoleLogSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockDynamoClient = {
      send: vi.fn(),
    };
    
    (DynamoDBClient as any).mockImplementation(() => mockDynamoClient);
    
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    circuitBreaker = new CircuitBreaker({
      serviceName: 'test-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 5000,
      volumeThreshold: 5,
      errorThresholdPercentage: 50,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', async () => {
      // Mock DynamoDB returning no existing state
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });
      
      const result = await circuitBreaker.execute(
        async () => 'success'
      );
      
      expect(result).toBe('success');
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: expect.objectContaining({ name: 'GetItemCommand' })
        })
      );
    });

    it('should transition from CLOSED to OPEN after reaching failure threshold', async () => {
      // Mock DynamoDB returning CLOSED state
      mockDynamoClient.send.mockResolvedValue({ 
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.CLOSED),
          failureCount: 0,
          successCount: 0,
          lastFailureTime: null,
          totalRequests: 0,
          errorPercentage: 0,
        })
      });

      const failingOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      // Fail 3 times to trigger OPEN state
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Should have saved OPEN state to DynamoDB
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const lastPutCall = putCalls[putCalls.length - 1];
      expect(lastPutCall[0].input.Item.state).toBe(CircuitState.OPEN);
    });

    it('should reject immediately when in OPEN state', async () => {
      // Mock DynamoDB returning OPEN state
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.OPEN),
          failureCount: 3,
          lastFailureTime: Date.now(),
        })
      });

      const operation = vi.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(operation))
        .rejects
        .toThrow('Circuit breaker is OPEN');
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should use fallback when provided and circuit is OPEN', async () => {
      // Mock DynamoDB returning OPEN state
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.OPEN),
          failureCount: 3,
          lastFailureTime: Date.now(),
        })
      });

      const operation = vi.fn().mockResolvedValue('primary');
      const fallback = vi.fn().mockResolvedValue('fallback');
      
      const result = await circuitBreaker.execute(operation, fallback);
      
      expect(result).toBe('fallback');
      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      const now = Date.now();
      
      // Mock DynamoDB returning OPEN state that expired
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.OPEN),
          failureCount: 3,
          lastFailureTime: now - 6000, // 6 seconds ago (past reset timeout)
        })
      });

      const operation = vi.fn().mockResolvedValue('success');
      
      // This should transition to HALF_OPEN and allow the request
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      
      // Should have saved HALF_OPEN state
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      expect(putCalls.some(call => 
        call[0].input.Item.state === CircuitState.HALF_OPEN
      )).toBe(true);
    });

    it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
      // Start in HALF_OPEN state
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.HALF_OPEN),
          successCount: 0,
          failureCount: 0,
        })
      });

      const operation = vi.fn().mockResolvedValue('success');
      
      // Need 2 successes to close
      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);
      
      // Should have transitioned to CLOSED
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const lastPutCall = putCalls[putCalls.length - 1];
      expect(lastPutCall[0].input.Item.state).toBe(CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      // Start in HALF_OPEN state
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.HALF_OPEN),
          successCount: 0,
          failureCount: 0,
        })
      });

      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected to fail
      }
      
      // Should have transitioned back to OPEN
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const lastPutCall = putCalls[putCalls.length - 1];
      expect(lastPutCall[0].input.Item.state).toBe(CircuitState.OPEN);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout operations that exceed the configured timeout', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: null });
      
      const slowOperation = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'success';
      });
      
      const promise = circuitBreaker.execute(slowOperation);
      
      // Fast forward past timeout
      vi.advanceTimersByTime(1001);
      
      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('should count timeouts as failures', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.CLOSED),
          failureCount: 2, // One more failure will open
        })
      });
      
      const slowOperation = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'success';
      });
      
      const promise = circuitBreaker.execute(slowOperation);
      vi.advanceTimersByTime(1001);
      
      try {
        await promise;
      } catch (error) {
        // Expected timeout
      }
      
      // Should have incremented failure count and possibly opened
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const lastPutCall = putCalls[putCalls.length - 1];
      expect(lastPutCall[0].input.Item.failureCount).toBe(3);
      expect(lastPutCall[0].input.Item.state).toBe(CircuitState.OPEN);
    });
  });

  describe('Volume Threshold', () => {
    it('should not open circuit until volume threshold is met', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.CLOSED),
          totalRequests: 3, // Below volume threshold of 5
          errorCount: 3,
          errorPercentage: 100,
        })
      });
      
      const failingOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
      
      // Should remain CLOSED despite 100% error rate
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const lastPutCall = putCalls[putCalls.length - 1];
      expect(lastPutCall[0].input.Item.state).toBe(CircuitState.CLOSED);
    });

    it('should open circuit when volume and error percentage thresholds are met', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.CLOSED),
          totalRequests: 10, // Above volume threshold
          errorCount: 6, // 60% error rate (above 50% threshold)
          errorPercentage: 60,
          failureCount: 2,
        })
      });
      
      const failingOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
      
      // Should open due to error percentage
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const lastPutCall = putCalls[putCalls.length - 1];
      expect(lastPutCall[0].input.Item.state).toBe(CircuitState.OPEN);
    });
  });

  describe('DynamoDB Persistence', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      // Simulate DynamoDB failure
      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));
      
      const operation = vi.fn().mockResolvedValue('success');
      
      // Should still execute operation despite DB error
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load circuit breaker state'),
        expect.any(Error)
      );
    });

    it('should use TTL for automatic cleanup', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: null });
      
      const operation = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(operation);
      
      // Check that TTL was set in the put operation
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      expect(putCalls.length).toBeGreaterThan(0);
      const ttl = putCalls[0][0].input.Item.ttl;
      expect(ttl).toBeDefined();
      expect(ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should update metrics on successful execution', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: null });
      
      const operation = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(operation);
      
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const metrics = putCalls[0][0].input.Item;
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.errorPercentage).toBe(0);
    });

    it('should update metrics on failed execution', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: null });
      
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected
      }
      
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const metrics = putCalls[0][0].input.Item;
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorPercentage).toBe(100);
    });

    it('should calculate error percentage correctly', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Item: marshall({
          serviceName: 'test-service',
          state: nullableToString(CircuitState.CLOSED),
          totalRequests: 8,
          errorCount: 2,
          successCount: 6,
        })
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected
      }
      
      const putCalls = mockDynamoClient.send.mock.calls.filter(
        call => call[0].constructor.name === 'PutItemCommand'
      );
      
      const metrics = putCalls[putCalls.length - 1][0].input.Item;
      expect(metrics.totalRequests).toBe(9);
      expect(metrics.errorCount).toBe(3);
      expect(metrics.errorPercentage).toBe(33); // 3/9 = 33%
    });
  });
});