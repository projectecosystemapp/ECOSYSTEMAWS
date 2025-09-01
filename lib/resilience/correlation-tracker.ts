/**
 * Correlation ID Tracker for Distributed Tracing
 * 
 * Implements AWS X-Ray compatible correlation IDs for request tracing
 * across Lambda functions, AppSync, and DynamoDB operations.
 * 
 * Compliant with AWS best practices for distributed systems as of September 2025.
 */

import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// Use AsyncLocalStorage for context propagation (Node.js 16+)
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export interface CorrelationContext {
  correlationId: string;
  parentId?: string;
  spanId: string;
  traceId: string;
  timestamp: number;
  service: string;
  operation?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class CorrelationTracker {
  private static instance: CorrelationTracker;
  private activeContexts: Map<string, CorrelationContext> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CorrelationTracker {
    if (!CorrelationTracker.instance) {
      CorrelationTracker.instance = new CorrelationTracker();
    }
    return CorrelationTracker.instance;
  }

  /**
   * Start a new correlation context
   */
  startCorrelation(
    operation: string,
    metadata?: Record<string, any>
  ): CorrelationContext {
    const existingContext = this.getCurrentContext();
    
    const context: CorrelationContext = {
      correlationId: randomUUID(),
      parentId: existingContext?.spanId,
      spanId: randomUUID(),
      traceId: existingContext?.traceId || this.generateTraceId(),
      timestamp: Date.now(),
      service: process.env.AWS_LAMBDA_FUNCTION_NAME || 'ECOSYSTEMAWS',
      operation,
      userId: existingContext?.userId,
      metadata: {
        ...existingContext?.metadata,
        ...metadata
      }
    };

    this.activeContexts.set(context.correlationId, context);
    
    // Log correlation start for CloudWatch
    console.log('[CorrelationTracker] Started correlation', {
      correlationId: context.correlationId,
      traceId: context.traceId,
      parentId: context.parentId,
      operation,
      service: context.service
    });

    return context;
  }

  /**
   * Run a function within a correlation context
   */
  async runWithCorrelation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const context = this.startCorrelation(operation, metadata);
    
    return correlationStorage.run(context, async () => {
      try {
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;

        // Log successful completion
        console.log('[CorrelationTracker] Operation completed', {
          correlationId: context.correlationId,
          operation,
          duration,
          success: true
        });

        return result;
      } catch (error) {
        // Log error with correlation
        console.error('[CorrelationTracker] Operation failed', {
          correlationId: context.correlationId,
          operation,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        throw error;
      } finally {
        this.endCorrelation(context.correlationId);
      }
    });
  }

  /**
   * Get current correlation context
   */
  getCurrentContext(): CorrelationContext | undefined {
    return correlationStorage.getStore();
  }

  /**
   * Get correlation ID from current context
   */
  getCurrentCorrelationId(): string | undefined {
    return this.getCurrentContext()?.correlationId;
  }

  /**
   * Set user ID in current context
   */
  setUserId(userId: string): void {
    const context = this.getCurrentContext();
    if (context) {
      context.userId = userId;
    }
  }

  /**
   * Add metadata to current context
   */
  addMetadata(metadata: Record<string, any>): void {
    const context = this.getCurrentContext();
    if (context) {
      context.metadata = {
        ...context.metadata,
        ...metadata
      };
    }
  }

  /**
   * End a correlation context
   */
  private endCorrelation(correlationId: string): void {
    this.activeContexts.delete(correlationId);
  }

  /**
   * Generate AWS X-Ray compatible trace ID
   */
  private generateTraceId(): string {
    const epoch = Math.floor(Date.now() / 1000).toString(16);
    const random = randomUUID().replace(/-/g, '').substring(0, 24);
    return `1-${epoch}-${random}`;
  }

  /**
   * Extract correlation context from AWS Lambda event
   */
  extractFromLambdaEvent(event: any): CorrelationContext | undefined {
    // Check for correlation in headers
    const headers = event.headers || {};
    const correlationId = 
      headers['x-correlation-id'] || 
      headers['X-Correlation-Id'] ||
      event.correlationId;

    const traceId = 
      headers['x-amzn-trace-id'] || 
      headers['X-Amzn-Trace-Id'] ||
      event.traceId;

    if (correlationId || traceId) {
      const context: CorrelationContext = {
        correlationId: correlationId || randomUUID(),
        traceId: traceId || this.generateTraceId(),
        spanId: randomUUID(),
        timestamp: Date.now(),
        service: process.env.AWS_LAMBDA_FUNCTION_NAME || 'ECOSYSTEMAWS',
        operation: event.operation || 'lambda-invocation',
        metadata: event.metadata || {}
      };

      this.activeContexts.set(context.correlationId, context);
      return context;
    }

    return undefined;
  }

  /**
   * Inject correlation context into outgoing request headers
   */
  injectIntoHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const context = this.getCurrentContext();
    
    if (context) {
      return {
        ...headers,
        'x-correlation-id': context.correlationId,
        'x-trace-id': context.traceId,
        'x-span-id': context.spanId,
        'x-parent-id': context.parentId || '',
        'x-service': context.service
      };
    }

    return headers;
  }

  /**
   * Format log entry with correlation context
   */
  formatLogEntry(level: string, message: string, data?: any): any {
    const context = this.getCurrentContext();
    
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: context?.correlationId,
      traceId: context?.traceId,
      spanId: context?.spanId,
      service: context?.service,
      operation: context?.operation,
      userId: context?.userId,
      ...data
    };
  }

  /**
   * Create child span for nested operations
   */
  createChildSpan(operation: string): CorrelationContext {
    const parentContext = this.getCurrentContext();
    
    const childContext: CorrelationContext = {
      correlationId: parentContext?.correlationId || randomUUID(),
      parentId: parentContext?.spanId,
      spanId: randomUUID(),
      traceId: parentContext?.traceId || this.generateTraceId(),
      timestamp: Date.now(),
      service: parentContext?.service || process.env.AWS_LAMBDA_FUNCTION_NAME || 'ECOSYSTEMAWS',
      operation,
      userId: parentContext?.userId,
      metadata: parentContext?.metadata
    };

    return childContext;
  }

  /**
   * Get all active correlation contexts (for debugging)
   */
  getActiveContexts(): CorrelationContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Clear all correlation contexts (for cleanup)
   */
  clearAll(): void {
    this.activeContexts.clear();
  }
}

// Export singleton instance
export const correlationTracker = CorrelationTracker.getInstance();

// Helper function for easy correlation wrapping
export async function withCorrelation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return correlationTracker.runWithCorrelation(operation, fn, metadata);
}

// Middleware helper for Express/Lambda
export function correlationMiddleware(req: any, res: any, next: any): void {
  const context = correlationTracker.extractFromLambdaEvent(req);
  
  if (context) {
    correlationStorage.run(context, () => {
      next();
    });
  } else {
    const newContext = correlationTracker.startCorrelation('http-request', {
      method: req.method,
      path: req.path || req.url,
      ip: req.ip
    });
    
    correlationStorage.run(newContext, () => {
      next();
    });
  }
}