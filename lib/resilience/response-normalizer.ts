/**
 * Response Format Normalizer
 * 
 * Handles the differences between AppSync and Lambda URL response formats
 * to provide a consistent interface regardless of the underlying architecture.
 * 
 * Addresses the response format compatibility issue identified in production readiness review.
 */

import { correlationTracker } from './correlation-tracker';

export interface NormalizedResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  metadata?: {
    correlationId?: string;
    timestamp?: number;
    source?: 'appsync' | 'lambda-url';
    duration?: number;
  };
}

export class ResponseNormalizer {
  /**
   * Normalize AppSync GraphQL response
   * AppSync format: { data: { operationName: result }, errors: [...] }
   */
  normalizeAppSyncResponse<T>(response: any): NormalizedResponse<T> {
    const correlationId = correlationTracker.getCurrentCorrelationId();
    
    // Handle direct data response (successful query/mutation)
    if (response && !response.errors) {
      return {
        success: true,
        data: response,
        metadata: {
          correlationId,
          timestamp: Date.now(),
          source: 'appsync'
        }
      };
    }

    // Handle response with errors
    if (response?.errors && response.errors.length > 0) {
      const firstError = response.errors[0];
      return {
        success: false,
        error: {
          message: firstError.message || 'GraphQL operation failed',
          code: firstError.extensions?.code || 'GRAPHQL_ERROR',
          details: firstError.extensions || {}
        },
        data: response.data, // May have partial data
        metadata: {
          correlationId,
          timestamp: Date.now(),
          source: 'appsync'
        }
      };
    }

    // Handle unexpected format
    return {
      success: false,
      error: {
        message: 'Unexpected AppSync response format',
        code: 'INVALID_RESPONSE',
        details: response
      },
      metadata: {
        correlationId,
        timestamp: Date.now(),
        source: 'appsync'
      }
    };
  }

  /**
   * Normalize Lambda URL HTTP response
   * Lambda format: { statusCode: 200, body: JSON.stringify(data) }
   * Or direct: { success: true, data: {...} }
   */
  normalizeLambdaResponse<T>(response: any): NormalizedResponse<T> {
    const correlationId = correlationTracker.getCurrentCorrelationId();

    // Handle Lambda proxy response format
    if (response?.statusCode !== undefined) {
      const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      let body: any;

      try {
        body = typeof response.body === 'string' 
          ? JSON.parse(response.body) 
          : response.body;
      } catch (error) {
        body = response.body;
      }

      if (isSuccess) {
        return {
          success: true,
          data: body,
          metadata: {
            correlationId,
            timestamp: Date.now(),
            source: 'lambda-url'
          }
        };
      } else {
        return {
          success: false,
          error: {
            message: body?.error || body?.message || `HTTP ${response.statusCode} error`,
            code: `HTTP_${response.statusCode}`,
            details: body
          },
          metadata: {
            correlationId,
            timestamp: Date.now(),
            source: 'lambda-url'
          }
        };
      }
    }

    // Handle direct response format
    if (response?.success !== undefined) {
      return {
        success: response.success,
        data: response.data || response,
        error: response.error ? {
          message: response.error.message || response.error,
          code: response.error.code,
          details: response.error.details
        } : undefined,
        metadata: {
          correlationId,
          timestamp: Date.now(),
          source: 'lambda-url'
        }
      };
    }

    // Handle raw data response (assume success)
    if (response) {
      return {
        success: true,
        data: response,
        metadata: {
          correlationId,
          timestamp: Date.now(),
          source: 'lambda-url'
        }
      };
    }

    // Handle null/undefined response
    return {
      success: false,
      error: {
        message: 'No response received from Lambda URL',
        code: 'NO_RESPONSE'
      },
      metadata: {
        correlationId,
        timestamp: Date.now(),
        source: 'lambda-url'
      }
    };
  }

  /**
   * Extract data from normalized response
   */
  extractData<T>(response: NormalizedResponse<T>): T {
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Operation failed');
    }
    return response.data;
  }

  /**
   * Check if response indicates a retriable error
   */
  isRetriableError(response: NormalizedResponse): boolean {
    if (!response.error) return false;

    const retriableHttpCodes = ['HTTP_429', 'HTTP_502', 'HTTP_503', 'HTTP_504'];
    const retriableErrorCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'THROTTLED',
      'SERVICE_UNAVAILABLE',
      'GATEWAY_TIMEOUT'
    ];

    return (
      retriableHttpCodes.includes(response.error.code || '') ||
      retriableErrorCodes.includes(response.error.code || '') ||
      response.error.message.toLowerCase().includes('timeout') ||
      response.error.message.toLowerCase().includes('throttl')
    );
  }

  /**
   * Transform error for user display
   */
  getUserFriendlyError(response: NormalizedResponse): string {
    if (!response.error) return 'An unexpected error occurred';

    const errorMap: Record<string, string> = {
      'HTTP_400': 'Invalid request. Please check your input.',
      'HTTP_401': 'Authentication required. Please sign in.',
      'HTTP_403': 'You do not have permission to perform this action.',
      'HTTP_404': 'The requested resource was not found.',
      'HTTP_429': 'Too many requests. Please try again later.',
      'HTTP_500': 'Server error. Please try again later.',
      'HTTP_502': 'Service temporarily unavailable.',
      'HTTP_503': 'Service temporarily unavailable.',
      'NETWORK_ERROR': 'Network connection issue. Please check your connection.',
      'TIMEOUT': 'Request timed out. Please try again.',
      'VALIDATION_ERROR': 'Please check your input and try again.'
    };

    return errorMap[response.error.code || ''] || response.error.message;
  }

  /**
   * Merge multiple normalized responses (for batch operations)
   */
  mergeResponses<T>(responses: NormalizedResponse<T>[]): NormalizedResponse<T[]> {
    const allSuccessful = responses.every(r => r.success);
    const data = responses
      .filter(r => r.success && r.data)
      .map(r => r.data as T);
    
    const errors = responses
      .filter(r => !r.success)
      .map(r => r.error);

    return {
      success: allSuccessful,
      data: data.length > 0 ? data : undefined,
      error: errors.length > 0 ? {
        message: `${errors.length} operations failed`,
        code: 'BATCH_ERROR',
        details: errors
      } : undefined,
      metadata: {
        correlationId: correlationTracker.getCurrentCorrelationId(),
        timestamp: Date.now(),
        source: responses[0]?.metadata?.source
      }
    };
  }

  /**
   * Create a standardized error response
   */
  createErrorResponse(
    error: Error | any,
    source: 'appsync' | 'lambda-url'
  ): NormalizedResponse {
    const correlationId = correlationTracker.getCurrentCorrelationId();
    
    return {
      success: false,
      error: {
        message: error?.message || 'Unknown error occurred',
        code: error?.code || 'UNKNOWN_ERROR',
        details: {
          stack: error?.stack,
          name: error?.name,
          ...error
        }
      },
      metadata: {
        correlationId,
        timestamp: Date.now(),
        source
      }
    };
  }
}