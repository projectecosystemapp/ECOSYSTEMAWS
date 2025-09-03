type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  requestId?: string;
  environment: string;
}

class LoggerService {
  private static instance: LoggerService;
  private environment: string;
  private userId?: string;
  private requestId?: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public setContext(userId?: string, requestId?: string): void {
    this.userId = userId;
    this.requestId = requestId;
  }

  private formatLog(entry: LogEntry): string {
    if (this.environment === 'development') {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const level = entry.level.toUpperCase().padEnd(8);
      const message = entry.message;
      const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
      const error = entry.error ? ` | Error: ${entry.error.message}` : '';
      return `[${timestamp}] ${level} ${message}${context}${error}`;
    }
    
    // Production: Structured JSON logs for CloudWatch
    return JSON.stringify({
      ...entry,
      error: entry.error ? {
        message: nullableToString(entry.error.message),
        stack: nullableToString(entry.error.stack),
        name: entry.error.name
      } : undefined
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      userId: nullableToString(this.userId),
      requestId: nullableToString(this.requestId),
      environment: this.environment
    };

    const formattedLog = this.formatLog(entry);

    // In production, send to CloudWatch
    if (this.environment === 'production') {
      // CloudWatch integration would go here
      // For now, use console methods that are allowed by ESLint
      if (level === 'error' || level === 'critical') {
        console.error(formattedLog);
      } else if (level === 'warn') {
        console.warn(formattedLog);
      }
    } else {
      // Development: Use console methods allowed by ESLint
      switch (level) {
        case 'error':
        case 'critical':
          console.error(formattedLog);
          break;
        case 'warn':
          console.warn(formattedLog);
          break;
        default:
          // In development, we'll temporarily allow console.log for debug/info
          // This will be replaced with a proper logging transport
          if (typeof window === 'undefined') {
            // Server-side: write to stdout
            process.stdout.write(`${formattedLog}\n`);
          }
      }
    }

    // Critical errors should trigger alerts
    if (level === 'critical' && this.environment === 'production') {
      this.sendAlert(entry);
    }
  }

  private sendAlert(entry: LogEntry): void {
    // Integration with SNS or PagerDuty would go here
    // For now, just ensure it's logged
    console.error('[CRITICAL ALERT]', entry);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.environment !== 'production') {
      this.log('debug', message, context);
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  public critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('critical', message, context, error);
  }

  // Performance logging
  public logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const context = {
      operation,
      duration_ms: duration,
      ...metadata
    };
    
    if (duration > 5000) {
      this.warn(`Slow operation detected: ${operation}`, context);
    } else {
      this.info(`Performance metric: ${operation}`, context);
    }
  }

  // API request logging
  public logAPIRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    error?: Error
  ): void {
    const context = {
      method,
      url,
      statusCode,
      duration_ms: duration
    };

    if (statusCode >= 500) {
      this.error(`API request failed: ${method} ${url}`, error, context);
    } else if (statusCode >= 400) {
      this.warn(`API request client error: ${method} ${url}`, context);
    } else {
      this.info(`API request: ${method} ${url}`, context);
    }
  }

  // Database query logging
  public logDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    recordCount?: number,
    error?: Error
  ): void {
    const context = {
      operation,
      table,
      duration_ms: duration,
      record_count: recordCount
    };

    if (error) {
      this.error(`Database query failed: ${operation} on ${table}`, error, context);
    } else if (duration > 1000) {
      this.warn(`Slow database query: ${operation} on ${table}`, context);
    } else {
      this.debug(`Database query: ${operation} on ${table}`, context);
    }
  }

  // Security event logging
  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, unknown>
  ): void {
    const context = {
      security_event: event,
      severity,
      ...details
    };

    switch (severity) {
      case 'critical':
        this.critical(`Security event: ${event}`, undefined, context);
        break;
      case 'high':
        this.error(`Security event: ${event}`, undefined, context);
        break;
      case 'medium':
        this.warn(`Security event: ${event}`, context);
        break;
      default:
        this.info(`Security event: ${event}`, context);
    }
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();

// Export for testing
export { LoggerService };

// Middleware for Next.js API routes
export function withLogging(
  handler: (req: any, res: any) => Promise<void>
): (req: any, res: any) => Promise<void> {
  return async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    logger.setContext(req.session?.userId, requestId);
    
    try {
      await handler(req, res);
      
      const duration = Date.now() - startTime;
      logger.logAPIRequest(
        req.method,
        req.url,
        res.statusCode,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logAPIRequest(
        req.method,
        req.url,
        500,
        duration,
        error as Error
      );
      throw error;
    }
  };
}