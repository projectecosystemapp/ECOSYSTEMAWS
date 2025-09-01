/**
 * Response Normalizer Unit Tests
 * 
 * Validates response format normalization between AppSync and Lambda URL responses,
 * error handling, and response transformations.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ResponseNormalizer, NormalizedResponse } from '@/lib/resilience/response-normalizer';
import { correlationTracker } from '@/lib/resilience/correlation-tracker';

// Mock correlation tracker
vi.mock('@/lib/resilience/correlation-tracker', () => ({
  correlationTracker: {
    getCurrentCorrelationId: vi.fn(),
  },
}));

describe('ResponseNormalizer', () => {
  let normalizer: ResponseNormalizer;
  let mockGetCurrentCorrelationId: Mock;

  beforeEach(() => {
    normalizer = new ResponseNormalizer();
    mockGetCurrentCorrelationId = vi.mocked(correlationTracker.getCurrentCorrelationId);
    mockGetCurrentCorrelationId.mockReturnValue('test-correlation-123');
  });

  describe('AppSync Response Normalization', () => {
    it('should normalize successful AppSync response with direct data', () => {
      const appSyncResponse = {
        id: '123',
        name: 'Test Item',
        value: 42,
      };

      const normalized = normalizer.normalizeAppSyncResponse(appSyncResponse);

      expect(normalized.success).toBe(true);
      expect(normalized.data).toEqual(appSyncResponse);
      expect(normalized.error).toBeUndefined();
      expect(normalized.metadata?.source).toBe('appsync');
      expect(normalized.metadata?.correlationId).toBe('test-correlation-123');
    });

    it('should normalize AppSync response with GraphQL errors', () => {
      const appSyncResponse = {
        data: null,
        errors: [
          {
            message: 'Validation error',
            extensions: {
              code: 'VALIDATION_ERROR',
              field: 'email',
            },
          },
        ],
      };

      const normalized = normalizer.normalizeAppSyncResponse(appSyncResponse);

      expect(normalized.success).toBe(false);
      expect(normalized.error?.message).toBe('Validation error');
      expect(normalized.error?.code).toBe('VALIDATION_ERROR');
      expect(normalized.error?.details).toEqual({ code: 'VALIDATION_ERROR', field: 'email' });
      expect(normalized.metadata?.source).toBe('appsync');
    });

    it('should handle AppSync response with partial data and errors', () => {
      const appSyncResponse = {
        data: {
          user: { id: '123', name: 'John' },
          posts: null,
        },
        errors: [
          {
            message: 'Posts query failed',
            path: ['posts'],
            extensions: { code: 'INTERNAL_ERROR' },
          },
        ],
      };

      const normalized = normalizer.normalizeAppSyncResponse(appSyncResponse);

      expect(normalized.success).toBe(false);
      expect(normalized.data).toEqual(appSyncResponse.data);
      expect(normalized.error?.message).toBe('Posts query failed');
      expect(normalized.error?.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed AppSync response', () => {
      const malformedResponse = 'not an object';

      const normalized = normalizer.normalizeAppSyncResponse(malformedResponse);

      expect(normalized.success).toBe(false);
      expect(normalized.error?.code).toBe('INVALID_RESPONSE');
      expect(normalized.error?.details).toBe(malformedResponse);
    });

    it('should handle empty AppSync errors array', () => {
      const response = {
        data: { result: 'success' },
        errors: [],
      };

      const normalized = normalizer.normalizeAppSyncResponse(response);

      expect(normalized.success).toBe(true);
      expect(normalized.data).toEqual(response);
    });
  });

  describe('Lambda Response Normalization', () => {
    it('should normalize successful Lambda proxy response', () => {
      const lambdaResponse = {
        statusCode: 200,
        body: JSON.stringify({ id: '456', status: 'complete' }),
      };

      const normalized = normalizer.normalizeLambdaResponse(lambdaResponse);

      expect(normalized.success).toBe(true);
      expect(normalized.data).toEqual({ id: '456', status: 'complete' });
      expect(normalized.error).toBeUndefined();
      expect(normalized.metadata?.source).toBe('lambda-url');
    });

    it('should normalize Lambda error response', () => {
      const lambdaResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid input',
          message: 'Email field is required',
        }),
      };

      const normalized = normalizer.normalizeLambdaResponse(lambdaResponse);

      expect(normalized.success).toBe(false);
      expect(normalized.error?.message).toBe('Invalid input');
      expect(normalized.error?.code).toBe('HTTP_400');
      expect(normalized.metadata?.source).toBe('lambda-url');
    });

    it('should handle non-JSON Lambda body', () => {
      const lambdaResponse = {
        statusCode: 200,
        body: 'Plain text response',
      };

      const normalized = normalizer.normalizeLambdaResponse(lambdaResponse);

      expect(normalized.success).toBe(true);
      expect(normalized.data).toBe('Plain text response');
    });

    it('should handle direct success/error format', () => {
      const directResponse = {
        success: true,
        data: { result: 'processed' },
      };

      const normalized = normalizer.normalizeLambdaResponse(directResponse);

      expect(normalized.success).toBe(true);
      expect(normalized.data).toEqual({ result: 'processed' });
    });

    it('should handle direct error format', () => {
      const directError = {
        success: false,
        error: {
          message: 'Processing failed',
          code: 'PROC_ERROR',
          details: { field: 'amount' },
        },
      };

      const normalized = normalizer.normalizeLambdaResponse(directError);

      expect(normalized.success).toBe(false);
      expect(normalized.error?.message).toBe('Processing failed');
      expect(normalized.error?.code).toBe('PROC_ERROR');
      expect(normalized.error?.details).toEqual({ field: 'amount' });
    });

    it('should handle raw data response', () => {
      const rawData = {
        id: '789',
        values: [1, 2, 3],
        nested: { key: 'value' },
      };

      const normalized = normalizer.normalizeLambdaResponse(rawData);

      expect(normalized.success).toBe(true);
      expect(normalized.data).toEqual(rawData);
    });

    it('should handle null/undefined response', () => {
      const normalized = normalizer.normalizeLambdaResponse(null);

      expect(normalized.success).toBe(false);
      expect(normalized.error?.code).toBe('NO_RESPONSE');
      expect(normalized.error?.message).toBe('No response received from Lambda URL');
    });

    it('should handle various HTTP status codes correctly', () => {
      const testCases = [
        { statusCode: 201, expected: true },
        { statusCode: 204, expected: true },
        { statusCode: 299, expected: true },
        { statusCode: 300, expected: false },
        { statusCode: 404, expected: false },
        { statusCode: 500, expected: false },
      ];

      testCases.forEach(({ statusCode, expected }) => {
        const response = {
          statusCode,
          body: JSON.stringify({ data: 'test' }),
        };

        const normalized = normalizer.normalizeLambdaResponse(response);
        expect(normalized.success).toBe(expected);
        
        if (!expected) {
          expect(normalized.error?.code).toBe(`HTTP_${statusCode}`);
        }
      });
    });
  });

  describe('Data Extraction', () => {
    it('should extract data from successful response', () => {
      const response: NormalizedResponse<{ value: number }> = {
        success: true,
        data: { value: 42 },
        metadata: { source: 'appsync' },
      };

      const data = normalizer.extractData(response);
      expect(data).toEqual({ value: 42 });
    });

    it('should throw error when extracting from failed response', () => {
      const response: NormalizedResponse = {
        success: false,
        error: { message: 'Operation failed' },
        metadata: { source: 'lambda-url' },
      };

      expect(() => normalizer.extractData(response)).toThrow('Operation failed');
    });

    it('should throw generic error when no error message', () => {
      const response: NormalizedResponse = {
        success: false,
        metadata: { source: 'appsync' },
      };

      expect(() => normalizer.extractData(response)).toThrow('Operation failed');
    });
  });

  describe('Retriable Error Detection', () => {
    it('should identify retriable HTTP error codes', () => {
      const retriableCodes = ['HTTP_429', 'HTTP_502', 'HTTP_503', 'HTTP_504'];
      
      retriableCodes.forEach(code => {
        const response: NormalizedResponse = {
          success: false,
          error: { message: 'Error', code },
        };
        
        expect(normalizer.isRetriableError(response)).toBe(true);
      });
    });

    it('should identify retriable error types', () => {
      const retriableTypes = ['TIMEOUT', 'NETWORK_ERROR', 'THROTTLED', 'SERVICE_UNAVAILABLE', 'GATEWAY_TIMEOUT'];
      
      retriableTypes.forEach(code => {
        const response: NormalizedResponse = {
          success: false,
          error: { message: 'Error', code },
        };
        
        expect(normalizer.isRetriableError(response)).toBe(true);
      });
    });

    it('should identify retriable errors by message content', () => {
      const testCases = [
        'Request timeout exceeded',
        'API throttled, please retry',
        'Connection TIMEOUT',
        'Rate limit exceeded (throttling)',
      ];
      
      testCases.forEach(message => {
        const response: NormalizedResponse = {
          success: false,
          error: { message },
        };
        
        expect(normalizer.isRetriableError(response)).toBe(true);
      });
    });

    it('should not mark non-retriable errors as retriable', () => {
      const nonRetriable = [
        { message: 'Invalid input', code: 'HTTP_400' },
        { message: 'Unauthorized', code: 'HTTP_401' },
        { message: 'Forbidden', code: 'HTTP_403' },
        { message: 'Not found', code: 'HTTP_404' },
        { message: 'Validation failed', code: 'VALIDATION_ERROR' },
      ];
      
      nonRetriable.forEach(error => {
        const response: NormalizedResponse = {
          success: false,
          error,
        };
        
        expect(normalizer.isRetriableError(response)).toBe(false);
      });
    });

    it('should handle missing error gracefully', () => {
      const response: NormalizedResponse = {
        success: true,
      };
      
      expect(normalizer.isRetriableError(response)).toBe(false);
    });
  });

  describe('User-Friendly Error Messages', () => {
    it('should provide user-friendly messages for common HTTP errors', () => {
      const errorMap = [
        { code: 'HTTP_400', expected: 'Invalid request. Please check your input.' },
        { code: 'HTTP_401', expected: 'Authentication required. Please sign in.' },
        { code: 'HTTP_403', expected: 'You do not have permission to perform this action.' },
        { code: 'HTTP_404', expected: 'The requested resource was not found.' },
        { code: 'HTTP_429', expected: 'Too many requests. Please try again later.' },
        { code: 'HTTP_500', expected: 'Server error. Please try again later.' },
        { code: 'NETWORK_ERROR', expected: 'Network connection issue. Please check your connection.' },
        { code: 'TIMEOUT', expected: 'Request timed out. Please try again.' },
      ];
      
      errorMap.forEach(({ code, expected }) => {
        const response: NormalizedResponse = {
          success: false,
          error: { message: 'Technical error', code },
        };
        
        expect(normalizer.getUserFriendlyError(response)).toBe(expected);
      });
    });

    it('should fall back to original message for unknown codes', () => {
      const response: NormalizedResponse = {
        success: false,
        error: { message: 'Custom error message', code: 'UNKNOWN_CODE' },
      };
      
      expect(normalizer.getUserFriendlyError(response)).toBe('Custom error message');
    });

    it('should handle missing error', () => {
      const response: NormalizedResponse = {
        success: false,
      };
      
      expect(normalizer.getUserFriendlyError(response)).toBe('An unexpected error occurred');
    });
  });

  describe('Batch Response Merging', () => {
    it('should merge successful responses', () => {
      const responses: NormalizedResponse<number>[] = [
        { success: true, data: 1 },
        { success: true, data: 2 },
        { success: true, data: 3 },
      ];
      
      const merged = normalizer.mergeResponses(responses);
      
      expect(merged.success).toBe(true);
      expect(merged.data).toEqual([1, 2, 3]);
      expect(merged.error).toBeUndefined();
    });

    it('should handle mixed success and failure', () => {
      const responses: NormalizedResponse<string>[] = [
        { success: true, data: 'success1' },
        { success: false, error: { message: 'Error 1' } },
        { success: true, data: 'success2' },
        { success: false, error: { message: 'Error 2' } },
      ];
      
      const merged = normalizer.mergeResponses(responses);
      
      expect(merged.success).toBe(false);
      expect(merged.data).toEqual(['success1', 'success2']);
      expect(merged.error?.code).toBe('BATCH_ERROR');
      expect(merged.error?.message).toBe('2 operations failed');
      expect(merged.error?.details).toHaveLength(2);
    });

    it('should handle all failures', () => {
      const responses: NormalizedResponse[] = [
        { success: false, error: { message: 'Error 1' } },
        { success: false, error: { message: 'Error 2' } },
      ];
      
      const merged = normalizer.mergeResponses(responses);
      
      expect(merged.success).toBe(false);
      expect(merged.data).toBeUndefined();
      expect(merged.error?.message).toBe('2 operations failed');
    });

    it('should preserve metadata from first response', () => {
      const responses: NormalizedResponse[] = [
        { success: true, data: 1, metadata: { source: 'appsync', correlationId: '123' } },
        { success: true, data: 2, metadata: { source: 'lambda-url', correlationId: '456' } },
      ];
      
      const merged = normalizer.mergeResponses(responses);
      
      expect(merged.metadata?.source).toBe('appsync');
      expect(merged.metadata?.correlationId).toBe('test-correlation-123');
    });
  });

  describe('Error Response Creation', () => {
    it('should create standardized error response from Error object', () => {
      const error = new Error('Test error');
      error.name = 'CustomError';
      (error as any).code = 'CUSTOM_CODE';
      
      const response = normalizer.createErrorResponse(error, 'appsync');
      
      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Test error');
      expect(response.error?.code).toBe('CUSTOM_CODE');
      expect(response.error?.details?.name).toBe('CustomError');
      expect(response.error?.details?.stack).toBeDefined();
      expect(response.metadata?.source).toBe('appsync');
    });

    it('should handle non-Error objects', () => {
      const error = {
        message: 'String error',
        customField: 'value',
      };
      
      const response = normalizer.createErrorResponse(error, 'lambda-url');
      
      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('String error');
      expect(response.error?.details?.customField).toBe('value');
    });

    it('should handle null/undefined errors', () => {
      const response = normalizer.createErrorResponse(null, 'appsync');
      
      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Unknown error occurred');
      expect(response.error?.code).toBe('UNKNOWN_ERROR');
    });

    it('should include correlation ID in error response', () => {
      const error = new Error('Test');
      const response = normalizer.createErrorResponse(error, 'lambda-url');
      
      expect(response.metadata?.correlationId).toBe('test-correlation-123');
    });
  });
});