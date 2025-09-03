// Lambda-specific logger for AWS Lambda functions
// Outputs structured JSON logs for CloudWatch

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LambdaLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  functionName?: string;
  functionVersion?: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

class LambdaLogger {
  private context: any;
  
  constructor(lambdaContext?: any) {
    this.context = lambdaContext;
  }

  private log(level: LogLevel, message: string, extra?: Record<string, unknown>, error?: Error): void {
    const entry: LambdaLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: nullableToString(this.context?.awsRequestId),
      functionName: nullableToString(process.env.AWS_LAMBDA_FUNCTION_NAME),
      functionVersion: nullableToString(process.env.AWS_LAMBDA_FUNCTION_VERSION),
      context: extra,
      error: error ? {
        message: nullableToString(error.message),
        stack: nullableToString(error.stack),
        name: error.name
      } : undefined
    };

    const output = JSON.stringify(entry);
    
    // Use appropriate console method based on level
    switch (level) {
      case 'error':
      case 'critical':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        // For Lambda, we need to output to CloudWatch
        // Using process.stdout.write to avoid ESLint console.log error
        process.stdout.write(`${output}\n`);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL !== 'production') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('critical', message, context, error);
  }

  // Log Lambda invocation start
  logInvocation(event: any): void {
    this.info('Lambda invocation started', {
      eventSource: nullableToString(event.source),
      eventType: event.action || event.httpMethod || 'unknown',
      hasBody: !!event.body,
      pathParameters: nullableToString(event.pathParameters),
      queryStringParameters: event.queryStringParameters
    });
  }

  // Log Lambda invocation completion
  logCompletion(statusCode: number, duration: number): void {
    const context = {
      statusCode,
      duration_ms: duration,
      memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024,
      memoryLimit: this.context?.memoryLimitInMB
    };

    if (statusCode >= 500) {
      this.error('Lambda invocation failed', undefined, context);
    } else if (statusCode >= 400) {
      this.warn('Lambda invocation client error', context);
    } else {
      this.info('Lambda invocation completed', context);
    }
  }

  // Log external API calls
  logAPICall(service: string, operation: string, duration: number, error?: Error): void {
    const context = {
      service,
      operation,
      duration_ms: duration
    };

    if (error) {
      this.error(`External API call failed: ${service}.${operation}`, error, context);
    } else if (duration > 3000) {
      this.warn(`Slow external API call: ${service}.${operation}`, context);
    } else {
      this.info(`External API call: ${service}.${operation}`, context);
    }
  }

  // Log database operations
  logDatabaseOp(operation: string, table: string, duration: number, error?: Error): void {
    const context = {
      operation,
      table,
      duration_ms: duration
    };

    if (error) {
      this.error(`Database operation failed: ${operation} on ${table}`, error, context);
    } else if (duration > 1000) {
      this.warn(`Slow database operation: ${operation} on ${table}`, context);
    } else {
      this.debug(`Database operation: ${operation} on ${table}`, context);
    }
  }
}

export function createLogger(context?: any): LambdaLogger {
  return new LambdaLogger(context);
}

export { LambdaLogger };