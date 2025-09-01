/**
 * Performance Metrics Tracker
 * 
 * Collects and reports performance metrics for monitoring the migration
 * from Lambda URLs to AppSync architecture.
 * 
 * Integrates with CloudWatch Metrics for dashboard visualization.
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { correlationTracker } from './correlation-tracker';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  architecture: 'appsync' | 'lambda-url';
  timestamp: number;
  correlationId?: string;
  errorType?: string;
  userId?: string;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
}

export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private cloudWatchClient: CloudWatchClient;
  private namespace: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private maxMetricsBuffer = 1000;
  private flushIntervalMs = 60000; // Flush every minute

  constructor(namespace: string = 'ECOSYSTEMAWS/Migration') {
    this.namespace = namespace;
    this.cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: 3,
      retryMode: 'adaptive'
    });

    // Start automatic flush interval
    this.startAutoFlush();
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    architecture?: 'appsync' | 'lambda-url',
    errorType?: string
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      architecture: architecture || this.detectArchitecture(),
      timestamp: Date.now(),
      correlationId: correlationTracker.getCurrentCorrelationId(),
      errorType,
      userId: correlationTracker.getCurrentContext()?.userId
    };

    this.metrics.push(metric);

    // Log for immediate visibility
    console.log('[PerformanceTracker] Metric recorded', {
      operation,
      duration,
      success,
      architecture: metric.architecture,
      correlationId: metric.correlationId
    });

    // Flush if buffer is full
    if (this.metrics.length >= this.maxMetricsBuffer) {
      this.flush();
    }
  }

  /**
   * Detect current architecture based on environment
   */
  private detectArchitecture(): 'appsync' | 'lambda-url' {
    // This would be determined by checking which path was taken
    // For now, default to lambda-url as fallback
    return 'lambda-url';
  }

  /**
   * Calculate statistics for a specific operation
   */
  getStats(operation: string, timeWindowMs: number = 3600000): PerformanceStats {
    const cutoffTime = Date.now() - timeWindowMs;
    const relevantMetrics = this.metrics.filter(
      m => m.operation === operation && m.timestamp > cutoffTime
    );

    if (relevantMetrics.length === 0) {
      return {
        operation,
        count: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0
      };
    }

    const successMetrics = relevantMetrics.filter(m => m.success);
    const failureMetrics = relevantMetrics.filter(m => !m.success);
    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);

    return {
      operation,
      count: relevantMetrics.length,
      successCount: successMetrics.length,
      failureCount: failureMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      errorRate: (failureMetrics.length / relevantMetrics.length) * 100
    };
  }

  /**
   * Compare performance between architectures
   */
  compareArchitectures(operation: string, timeWindowMs: number = 3600000): {
    appsync: PerformanceStats;
    lambdaUrl: PerformanceStats;
    comparison: {
      speedImprovement: number;
      errorRateDifference: number;
      recommendation: string;
    };
  } {
    const cutoffTime = Date.now() - timeWindowMs;
    
    const appsyncMetrics = this.metrics.filter(
      m => m.operation === operation && 
           m.timestamp > cutoffTime && 
           m.architecture === 'appsync'
    );
    
    const lambdaMetrics = this.metrics.filter(
      m => m.operation === operation && 
           m.timestamp > cutoffTime && 
           m.architecture === 'lambda-url'
    );

    const appsyncStats = this.calculateStatsFromMetrics(appsyncMetrics, operation);
    const lambdaStats = this.calculateStatsFromMetrics(lambdaMetrics, operation);

    const speedImprovement = lambdaStats.averageDuration > 0
      ? ((lambdaStats.averageDuration - appsyncStats.averageDuration) / lambdaStats.averageDuration) * 100
      : 0;

    const errorRateDifference = appsyncStats.errorRate - lambdaStats.errorRate;

    let recommendation = '';
    if (appsyncStats.count < 10) {
      recommendation = 'Insufficient AppSync data for comparison';
    } else if (speedImprovement > 20 && errorRateDifference <= 0) {
      recommendation = 'AppSync is performing well, consider full migration';
    } else if (speedImprovement < -20 || errorRateDifference > 5) {
      recommendation = 'AppSync showing issues, investigate before migration';
    } else {
      recommendation = 'Performance comparable, safe to migrate';
    }

    return {
      appsync: appsyncStats,
      lambdaUrl: lambdaStats,
      comparison: {
        speedImprovement,
        errorRateDifference,
        recommendation
      }
    };
  }

  /**
   * Calculate stats from a set of metrics
   */
  private calculateStatsFromMetrics(metrics: PerformanceMetric[], operation: string): PerformanceStats {
    if (metrics.length === 0) {
      return {
        operation,
        count: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0
      };
    }

    const successMetrics = metrics.filter(m => m.success);
    const failureMetrics = metrics.filter(m => !m.success);
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);

    return {
      operation,
      count: metrics.length,
      successCount: successMetrics.length,
      failureCount: failureMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      errorRate: (failureMetrics.length / metrics.length) * 100
    };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Send metrics to CloudWatch
   */
  async sendToCloudWatch(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = []; // Clear buffer

    try {
      // Group metrics by operation for batch sending
      const metricsByOperation = new Map<string, PerformanceMetric[]>();
      metricsToSend.forEach(metric => {
        const key = `${metric.operation}-${metric.architecture}`;
        if (!metricsByOperation.has(key)) {
          metricsByOperation.set(key, []);
        }
        metricsByOperation.get(key)!.push(metric);
      });

      // Create CloudWatch metric data
      const metricData: MetricDatum[] = [];
      
      metricsByOperation.forEach((metrics, key) => {
        const [operation, architecture] = key.split('-');
        const stats = this.calculateStatsFromMetrics(metrics, operation);

        // Duration metrics
        metricData.push({
          MetricName: 'OperationDuration',
          Value: stats.averageDuration,
          Unit: 'Milliseconds',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Operation', Value: operation },
            { Name: 'Architecture', Value: architecture }
          ]
        });

        // Error rate metric
        metricData.push({
          MetricName: 'ErrorRate',
          Value: stats.errorRate,
          Unit: 'Percent',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Operation', Value: operation },
            { Name: 'Architecture', Value: architecture }
          ]
        });

        // Request count metric
        metricData.push({
          MetricName: 'RequestCount',
          Value: stats.count,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Operation', Value: operation },
            { Name: 'Architecture', Value: architecture }
          ]
        });
      });

      // Send to CloudWatch in batches of 20 (CloudWatch limit)
      const batchSize = 20;
      for (let i = 0; i < metricData.length; i += batchSize) {
        const batch = metricData.slice(i, i + batchSize);
        
        await this.cloudWatchClient.send(new PutMetricDataCommand({
          Namespace: this.namespace,
          MetricData: batch
        }));
      }

      console.log(`[PerformanceTracker] Sent ${metricData.length} metrics to CloudWatch`);
    } catch (error) {
      console.error('[PerformanceTracker] Failed to send metrics to CloudWatch', error);
      // Re-add metrics to buffer for retry
      this.metrics.unshift(...metricsToSend.slice(0, this.maxMetricsBuffer - this.metrics.length));
    }
  }

  /**
   * Flush metrics to CloudWatch
   */
  async flush(): Promise<void> {
    await this.sendToCloudWatch();
  }

  /**
   * Start automatic flush interval
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Stop automatic flush interval
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Get current metrics buffer
   */
  getMetricsBuffer(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics buffer
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Generate summary report
   */
  generateReport(timeWindowMs: number = 3600000): {
    operations: Record<string, PerformanceStats>;
    architectureComparison: Record<string, any>;
    recommendations: string[];
  } {
    const operations = new Set(this.metrics.map(m => m.operation));
    const operationStats: Record<string, PerformanceStats> = {};
    const architectureComparison: Record<string, any> = {};
    const recommendations: string[] = [];

    operations.forEach(op => {
      operationStats[op] = this.getStats(op, timeWindowMs);
      architectureComparison[op] = this.compareArchitectures(op, timeWindowMs);
      
      // Generate recommendations
      const comparison = architectureComparison[op].comparison;
      if (comparison.recommendation) {
        recommendations.push(`${op}: ${comparison.recommendation}`);
      }
    });

    return {
      operations: operationStats,
      architectureComparison,
      recommendations
    };
  }
}