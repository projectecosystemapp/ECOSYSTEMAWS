/**
 * Simple structured logger for Lambda functions
 * Outputs JSON-formatted logs for CloudWatch
 */

import { Context } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  functionName?: string;
  environment?: string;
  coldStart?: boolean;
  memoryUsed?: number;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId: string;
  service: string;
  environment: string;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private correlationId: string;
  private functionName: string;
  private environment: string;
  private startTime: number;
  private isColdStart: boolean;
  private static coldStartProcessed = false;

  constructor(functionName: string, context?: Context) {
    this.functionName = functionName;
    this.environment = process.env.ENVIRONMENT || 'development';
    this.correlationId = context?.awsRequestId || randomUUID();
    this.startTime = Date.now();
    
    // Detect cold start
    this.isColdStart = !Logger.coldStartProcessed;
    if (this.isColdStart) {
      Logger.coldStartProcessed = true;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    const configuredIndex = levels.indexOf(configuredLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= configuredIndex;
  }

  private formatLog(level: LogLevel, message: string, metadata?: LogMetadata, error?: Error): string {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: nullableToString(this.correlationId),
      service: nullableToString(this.functionName),
      environment: nullableToString(this.environment),
      metadata: {
        ...metadata,
        coldStart: nullableToString(this.isColdStart),
        functionName: nullableToString(this.functionName),
      }
    };

    if (error) {
      logEntry.error = {
        name: nullableToString(error.name),
        message: nullableToString(error.message),
        stack: error.stack
      };
    }

    // Add performance metrics if available
    if (metadata?.duration === undefined) {
      logEntry.metadata!.duration = Date.now() - this.startTime;
    }

    // Add memory usage if available
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage();
      logEntry.metadata!.memoryUsed = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    }

    return JSON.stringify(logEntry);
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, metadata));
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, metadata));
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, metadata));
    }
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    if (this.shouldLog('error')) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(this.formatLog('error', message, metadata, err));
    }
  }

  /**
   * Log function input (sanitized)
   */
  logInput(event: any, sanitizeFields: string[] = ['password', 'token', 'secret', 'apiKey']): void {
    const sanitized = this.sanitizeObject(event, sanitizeFields);
    this.info('Function invoked', { 
      input: sanitized,
      eventType: event.type || event.requestContext?.eventType || 'unknown'
    });
  }

  /**
   * Log function output (sanitized)
   */
  logOutput(response: any, sanitizeFields: string[] = ['password', 'token', 'secret']): void {
    const sanitized = this.sanitizeObject(response, sanitizeFields);
    const duration = Date.now() - this.startTime;
    this.info('Function completed', { 
      output: sanitized,
      duration,
      success: true
    });
  }

  /**
   * Sanitize sensitive data from objects
   */
  private sanitizeObject(obj: any, fieldsToSanitize: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const key in sanitized) {
      if (fieldsToSanitize.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key], fieldsToSanitize);
      }
    }
    
    return sanitized;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogMetadata): Logger {
    const child = new Logger(this.functionName);
    child.correlationId = this.correlationId;
    // Merge additional context
    const originalInfo = child.info.bind(child);
    child.info = (message: string, metadata?: LogMetadata) => {
      originalInfo(message, { ...additionalContext, ...metadata });
    };
    return child;
  }

  /**
   * Get correlation ID for passing to other services
   */
  getCorrelationId(): string {
    return this.correlationId;
  }
}

/**
 * Create a logger instance for a Lambda function
 */
export function createLogger(functionName: string, context?: Context): Logger {
  return new Logger(functionName, context);
}

/**
 * Wrap Lambda handler with automatic logging
 */
export function withLogging<TEvent = any, TResult = any>(
  functionName: string,
  handler: (event: TEvent, context: Context, logger: Logger) => Promise<TResult>
) {
  return async (event: TEvent, context: Context): Promise<TResult> => {
    const logger = createLogger(functionName, context);
    
    try {
      logger.logInput(event);
      const result = await handler(event, context, logger);
      logger.logOutput(result);
      return result;
    } catch (error) {
      logger.error('Function failed', error, {
        event: logger.sanitizeObject(event, ['password', 'token', 'secret'])
      });
      throw error;
    }
  };
}