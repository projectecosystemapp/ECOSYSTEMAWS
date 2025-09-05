/**
 * AWS-Native Circuit Breaker Implementation
 * 
 * This implementation uses DynamoDB for state persistence and follows
 * AWS best practices for resilience patterns in serverless architectures.
 * 
 * Based on AWS Prescriptive Guidance and AWS Lambda Extensions pattern
 * as of September 2025.
 */

import { randomUUID } from 'crypto';

import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// Circuit Breaker States
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

// Circuit Breaker Configuration
export interface CircuitBreakerConfig {
  serviceName: string;
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes to close from half-open
  timeout: number;               // Timeout for each request (ms)
  resetTimeout: number;          // Time before attempting half-open (ms)
  volumeThreshold: number;       // Minimum requests before evaluating
  errorThresholdPercentage: number; // Error percentage to open circuit
  tableName?: string;            // DynamoDB table for state persistence
}

// Circuit Breaker Metrics
interface CircuitMetrics {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  totalRequests: number;
  errorRate: number;
}

// DynamoDB Circuit State Record
interface CircuitStateRecord {
  serviceName: string;
  state: CircuitState;
  metrics: CircuitMetrics;
  lastStateChange: number;
  correlationId?: string;
  ttl?: number; // For automatic cleanup
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitMetrics;
  private dynamoClient: DynamoDBClient;
  private lastStateChange: number = Date.now();
  private correlationId: string;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      ...config,
      tableName: config.tableName || process.env.CIRCUIT_BREAKER_TABLE || 'CircuitBreakerState'
    };
    
    this.metrics = {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      errorRate: 0
    };

    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: 3,
      retryMode: 'adaptive' // Use AWS SDK v3 adaptive retry
    });

    this.correlationId = randomUUID();
    
    // Load state from DynamoDB on initialization
    this.loadState();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const requestId = randomUUID();
    const startTime = Date.now();

    try {
      // Check if we should attempt the request
      if (!this.canAttempt()) {
        console.log(`[CircuitBreaker] Circuit OPEN for ${this.config.serviceName}`, {
          correlationId: nullableToString(this.correlationId),
          requestId,
          state: nullableToString(this.state),
          metrics: this.metrics
        });

        if (fallback) {
          console.log(`[CircuitBreaker] Executing fallback for ${this.config.serviceName}`);
          return await fallback();
        }

        throw new Error(`Circuit breaker is OPEN for service: ${this.config.serviceName}`);
      }

      // Set timeout for the operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout);
      });

      // Execute the operation with timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]) as T;

      // Record success
      await this.recordSuccess(Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Record failure
      await this.recordFailure(Date.now() - startTime, error);

      // If we have a fallback and circuit is now open, use it
      if (fallback && this.state === CircuitState.OPEN) {
        console.log(`[CircuitBreaker] Executing fallback after failure for ${this.config.serviceName}`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Check if we can attempt a request
   */
  private canAttempt(): boolean {
    // Always allow in CLOSED state
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    // In OPEN state, check if we should transition to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastStateChange = Date.now() - this.lastStateChange;
      
      if (timeSinceLastStateChange >= this.config.resetTimeout) {
        console.log(`[CircuitBreaker] Transitioning to HALF_OPEN for ${this.config.serviceName}`);
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      
      return false;
    }

    // In HALF_OPEN state, allow limited requests
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Record a successful request
   */
  private async recordSuccess(duration: number): Promise<void> {
    this.metrics.successes++;
    this.metrics.totalRequests++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.updateErrorRate();

    console.log(`[CircuitBreaker] Success for ${this.config.serviceName}`, {
      correlationId: nullableToString(this.correlationId),
      duration,
      state: nullableToString(this.state),
      consecutiveSuccesses: this.metrics.consecutiveSuccesses
    });

    // Check state transitions
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        await this.transitionTo(CircuitState.CLOSED);
      }
    }

    await this.saveState();
  }

  /**
   * Record a failed request
   */
  private async recordFailure(duration: number, error: any): Promise<void> {
    this.metrics.failures++;
    this.metrics.totalRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();
    this.updateErrorRate();

    console.error(`[CircuitBreaker] Failure for ${this.config.serviceName}`, {
      correlationId: nullableToString(this.correlationId),
      duration,
      state: nullableToString(this.state),
      consecutiveFailures: nullableToString(this.metrics.consecutiveFailures),
      error: error.message || error
    });

    // Check state transitions
    if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      const shouldOpen = 
        this.metrics.consecutiveFailures >= this.config.failureThreshold ||
        (this.metrics.totalRequests >= this.config.volumeThreshold && 
         this.metrics.errorRate >= this.config.errorThresholdPercentage);

      if (shouldOpen) {
        await this.transitionTo(CircuitState.OPEN);
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN state reopens the circuit
      await this.transitionTo(CircuitState.OPEN);
    }

    await this.saveState();
  }

  /**
   * Update error rate calculation
   */
  private updateErrorRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.errorRate = (this.metrics.failures / this.metrics.totalRequests) * 100;
    }
  }

  /**
   * Transition to a new state
   */
  private async transitionTo(newState: CircuitState): Promise<void> {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    // Reset some metrics on state change
    if (newState === CircuitState.CLOSED) {
      this.metrics.consecutiveFailures = 0;
      this.metrics.failures = 0;
      this.metrics.successes = 0;
      this.metrics.totalRequests = 0;
      this.metrics.errorRate = 0;
    }

    console.log(`[CircuitBreaker] State transition for ${this.config.serviceName}`, {
      correlationId: nullableToString(this.correlationId),
      oldState,
      newState,
      metrics: this.metrics
    });

    await this.saveState();
  }

  /**
   * Load state from DynamoDB
   */
  private async loadState(): Promise<void> {
    try {
      const response = await this.dynamoClient.send(new GetItemCommand({
        TableName: nullableToString(this.config.tableName),
        Key: marshall({ serviceName: this.config.serviceName })
      }));

      if (response.Item) {
        const record = unmarshall(response.Item) as CircuitStateRecord;
        
        // Check if state is not expired
        const stateAge = Date.now() - record.lastStateChange;
        if (stateAge < this.config.resetTimeout * 2) {
          this.state = record.state;
          this.metrics = record.metrics;
          this.lastStateChange = record.lastStateChange;
          
          console.log(`[CircuitBreaker] Loaded state for ${this.config.serviceName}`, {
            state: nullableToString(this.state),
            metrics: this.metrics
          });
        }
      }
    } catch (error) {
      console.error(`[CircuitBreaker] Failed to load state for ${this.config.serviceName}`, error);
      // Continue with default state
    }
  }

  /**
   * Save state to DynamoDB
   */
  private async saveState(): Promise<void> {
    try {
      const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hour TTL
      
      const record: CircuitStateRecord = {
        serviceName: nullableToString(this.config.serviceName),
        state: nullableToString(this.state),
        metrics: nullableToString(this.metrics),
        lastStateChange: nullableToString(this.lastStateChange),
        correlationId: nullableToString(this.correlationId),
        ttl
      };

      await this.dynamoClient.send(new PutItemCommand({
        TableName: nullableToString(this.config.tableName),
        Item: marshall(record)
      }));
    } catch (error) {
      console.error(`[CircuitBreaker] Failed to save state for ${this.config.serviceName}`, error);
      // Continue operation even if state save fails
    }
  }

  /**
   * Get current circuit state and metrics
   */
  getStatus(): { state: CircuitState; metrics: CircuitMetrics; correlationId: string } {
    return {
      state: nullableToString(this.state),
      metrics: { ...this.metrics },
      correlationId: this.correlationId
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  async reset(): Promise<void> {
    await this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Manually trip the circuit breaker
   */
  async trip(): Promise<void> {
    await this.transitionTo(CircuitState.OPEN);
  }
}