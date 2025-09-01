/**
 * Correlation Tracker Unit Tests
 * 
 * Validates correlation ID generation, context propagation,
 * and integration with AWS X-Ray headers.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { 
  CorrelationTracker, 
  correlationTracker, 
  withCorrelation 
} from '@/lib/resilience/correlation-tracker';
import { AsyncLocalStorage } from 'async_hooks';

describe('CorrelationTracker', () => {
  let tracker: CorrelationTracker;
  let consoleLogSpy: Mock;

  beforeEach(() => {
    tracker = new CorrelationTracker();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = tracker.generateCorrelationId();
      const id2 = tracker.generateCorrelationId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it('should generate valid UUID v4 format', () => {
      const id = tracker.generateCorrelationId();
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
      
      expect(id).toMatch(uuidRegex);
    });
  });

  describe('Context Management', () => {
    it('should start and maintain correlation context', async () => {
      const context = tracker.startCorrelation('test-operation', {
        userId: 'user123',
        requestId: 'req456',
      });
      
      expect(context.correlationId).toBeDefined();
      expect(context.operation).toBe('test-operation');
      expect(context.metadata?.userId).toBe('user123');
      expect(context.metadata?.requestId).toBe('req456');
      expect(context.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should get current correlation ID within context', async () => {
      await tracker.runWithCorrelation('test-op', async () => {
        const id = tracker.getCurrentCorrelationId();
        expect(id).toBeDefined();
        expect(id).toMatch(/^[a-f0-9-]+$/);
      });
    });

    it('should return undefined when no context exists', () => {
      const id = tracker.getCurrentCorrelationId();
      expect(id).toBeUndefined();
    });

    it('should maintain context across async operations', async () => {
      let correlationId: string | undefined;
      
      await tracker.runWithCorrelation('async-test', async () => {
        correlationId = tracker.getCurrentCorrelationId();
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const idAfterAsync = tracker.getCurrentCorrelationId();
        expect(idAfterAsync).toBe(correlationId);
      });
      
      expect(correlationId).toBeDefined();
    });

    it('should isolate contexts between parallel operations', async () => {
      const ids: string[] = [];
      
      await Promise.all([
        tracker.runWithCorrelation('op1', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          ids.push(tracker.getCurrentCorrelationId()!);
        }),
        tracker.runWithCorrelation('op2', async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          ids.push(tracker.getCurrentCorrelationId()!);
        }),
        tracker.runWithCorrelation('op3', async () => {
          ids.push(tracker.getCurrentCorrelationId()!);
        }),
      ]);
      
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All IDs should be unique
    });
  });

  describe('Metadata Management', () => {
    it('should add metadata to existing context', async () => {
      await tracker.runWithCorrelation('test-op', async () => {
        tracker.addMetadata({ key1: 'value1' });
        tracker.addMetadata({ key2: 'value2' });
        
        const context = tracker.getCurrentContext();
        expect(context?.metadata?.key1).toBe('value1');
        expect(context?.metadata?.key2).toBe('value2');
      });
    });

    it('should merge metadata without overwriting', async () => {
      await tracker.runWithCorrelation('test-op', async () => {
        tracker.addMetadata({ key1: 'value1', key2: 'original' });
        tracker.addMetadata({ key2: 'updated', key3: 'value3' });
        
        const context = tracker.getCurrentContext();
        expect(context?.metadata?.key1).toBe('value1');
        expect(context?.metadata?.key2).toBe('updated');
        expect(context?.metadata?.key3).toBe('value3');
      });
    });

    it('should handle adding metadata without context gracefully', () => {
      // Should not throw
      expect(() => tracker.addMetadata({ key: 'value' })).not.toThrow();
    });
  });

  describe('Header Injection and Extraction', () => {
    it('should inject correlation ID into headers', async () => {
      await tracker.runWithCorrelation('test-op', async () => {
        const correlationId = tracker.getCurrentCorrelationId();
        const headers = tracker.injectIntoHeaders({
          'Content-Type': 'application/json',
        });
        
        expect(headers['X-Correlation-Id']).toBe(correlationId);
        expect(headers['X-Request-Id']).toBe(correlationId);
        expect(headers['Content-Type']).toBe('application/json');
      });
    });

    it('should handle AWS X-Ray trace header', async () => {
      await tracker.runWithCorrelation('test-op', async () => {
        tracker.addMetadata({ traceId: '1-5e1b4f3d-1234567890abcdef' });
        
        const headers = tracker.injectIntoHeaders({});
        
        expect(headers['X-Amzn-Trace-Id']).toContain('1-5e1b4f3d-1234567890abcdef');
      });
    });

    it('should extract correlation ID from headers', () => {
      const headers = {
        'x-correlation-id': 'test-correlation-123',
        'content-type': 'application/json',
      };
      
      const context = tracker.extractFromHeaders(headers);
      
      expect(context.correlationId).toBe('test-correlation-123');
      expect(context.operation).toBe('http-request');
    });

    it('should prioritize X-Correlation-Id over other headers', () => {
      const headers = {
        'x-correlation-id': 'correlation-123',
        'x-request-id': 'request-456',
        'x-amzn-trace-id': 'Root=1-5e1b4f3d-trace789',
      };
      
      const context = tracker.extractFromHeaders(headers);
      
      expect(context.correlationId).toBe('correlation-123');
    });

    it('should extract from X-Amzn-Trace-Id when correlation ID not present', () => {
      const headers = {
        'x-amzn-trace-id': 'Root=1-5e1b4f3d-1234567890abcdef;Parent=53995c3f42cd8ad8',
      };
      
      const context = tracker.extractFromHeaders(headers);
      
      expect(context.correlationId).toBe('1-5e1b4f3d-1234567890abcdef');
      expect(context.metadata?.traceId).toBe('1-5e1b4f3d-1234567890abcdef');
      expect(context.metadata?.parentId).toBe('53995c3f42cd8ad8');
    });

    it('should generate new ID when no correlation headers present', () => {
      const headers = {
        'content-type': 'application/json',
      };
      
      const context = tracker.extractFromHeaders(headers);
      
      expect(context.correlationId).toBeDefined();
      expect(context.correlationId).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe('Lambda Event Extraction', () => {
    it('should extract from Lambda event headers', () => {
      const event = {
        headers: {
          'X-Correlation-Id': 'lambda-correlation-123',
        },
        requestContext: {
          requestId: 'aws-request-456',
        },
      };
      
      const context = tracker.extractFromLambdaEvent(event);
      
      expect(context.correlationId).toBe('lambda-correlation-123');
      expect(context.metadata?.awsRequestId).toBe('aws-request-456');
    });

    it('should extract from AppSync resolver context', () => {
      const event = {
        identity: {
          resolverContext: {
            correlationId: 'appsync-correlation-789',
          },
        },
        requestHeaders: {
          'x-amzn-trace-id': 'Root=1-trace-123',
        },
      };
      
      const context = tracker.extractFromLambdaEvent(event);
      
      expect(context.correlationId).toBe('appsync-correlation-789');
      expect(context.metadata?.traceId).toBe('1-trace-123');
    });

    it('should handle missing event properties gracefully', () => {
      const event = {};
      
      const context = tracker.extractFromLambdaEvent(event);
      
      expect(context.correlationId).toBeDefined();
      expect(context.operation).toBe('lambda-invocation');
    });
  });

  describe('withCorrelation Helper', () => {
    it('should execute function with correlation context', async () => {
      const result = await withCorrelation('helper-test', async () => {
        const id = correlationTracker.getCurrentCorrelationId();
        expect(id).toBeDefined();
        return 'success';
      });
      
      expect(result).toBe('success');
    });

    it('should propagate errors from wrapped function', async () => {
      await expect(
        withCorrelation('error-test', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should clean up context after execution', async () => {
      await withCorrelation('cleanup-test', async () => {
        expect(correlationTracker.getCurrentCorrelationId()).toBeDefined();
      });
      
      expect(correlationTracker.getCurrentCorrelationId()).toBeUndefined();
    });

    it('should clean up context even on error', async () => {
      try {
        await withCorrelation('error-cleanup-test', async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }
      
      expect(correlationTracker.getCurrentCorrelationId()).toBeUndefined();
    });
  });

  describe('Logging Integration', () => {
    it('should log operation start and end', async () => {
      await tracker.runWithCorrelation('log-test', async () => {
        // Operation
      });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CorrelationTracker] Starting operation: log-test'),
        expect.objectContaining({
          correlationId: expect.any(String),
          operation: 'log-test',
        })
      );
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CorrelationTracker] Completed operation: log-test'),
        expect.objectContaining({
          correlationId: expect.any(String),
          duration: expect.any(Number),
        })
      );
    });

    it('should include metadata in logs', async () => {
      await tracker.runWithCorrelation('metadata-log-test', async () => {
        tracker.addMetadata({ userId: 'user123' });
      });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user123',
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested correlation contexts', async () => {
      let outerCorrelationId: string | undefined;
      let innerCorrelationId: string | undefined;
      
      await tracker.runWithCorrelation('outer', async () => {
        outerCorrelationId = tracker.getCurrentCorrelationId();
        
        await tracker.runWithCorrelation('inner', async () => {
          innerCorrelationId = tracker.getCurrentCorrelationId();
        });
      });
      
      expect(outerCorrelationId).toBeDefined();
      expect(innerCorrelationId).toBeDefined();
      // In current implementation, inner context overrides outer
      expect(innerCorrelationId).not.toBe(outerCorrelationId);
    });

    it('should handle very long operation names', async () => {
      const longName = 'a'.repeat(1000);
      
      await expect(
        tracker.runWithCorrelation(longName, async () => {
          return 'success';
        })
      ).resolves.toBe('success');
    });

    it('should handle special characters in metadata', async () => {
      await tracker.runWithCorrelation('special-chars', async () => {
        tracker.addMetadata({
          'special-key!@#$': 'value with spaces and 特殊文字',
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' },
          },
        });
        
        const context = tracker.getCurrentContext();
        expect(context?.metadata?.['special-key!@#$']).toBe('value with spaces and 特殊文字');
        expect(context?.metadata?.nested).toEqual({
          array: [1, 2, 3],
          object: { key: 'value' },
        });
      });
    });
  });
});