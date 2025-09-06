import { type AppSyncResolverEvent, type Context } from 'aws-lambda';
import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { getDynamoDBClient, trackConnectionMetrics } from '../utils/connection-optimizer';
import { v4 as uuidv4 } from 'uuid';

/**
 * ECOSYSTEMAWS Custom Metrics Publisher
 * 
 * Comprehensive metrics collection and publishing system for the AWS native
 * payment system. Publishes business, technical, security, and cost metrics
 * to CloudWatch for monitoring and alerting.
 */

interface MetricInput {
  category: 'BUSINESS' | 'TECHNICAL' | 'SECURITY' | 'COST';
  metricName: string;
  value: number;
  unit: 'Count' | 'Percent' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'None';
  dimensions: Record<string, string>;
  correlationId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

interface BatchMetricInput {
  metrics: MetricInput[];
  correlationId?: string;
  source: string;
}

interface MetricResponse {
  success: boolean;
  metricsPublished: number;
  errors: string[];
  correlationId: string;
}

// Initialize AWS clients
const cloudWatchClient = new CloudWatchClient({ 
  region: process.env.AWS_REGION,
  maxAttempts: 3,
});
const dynamoDb = getDynamoDBClient();

const NAMESPACE = process.env.CLOUDWATCH_NAMESPACE || 'ECOSYSTEMAWS/PaymentSystem';
const MAX_BATCH_SIZE = 20; // CloudWatch limitation

export const handler = async (
  event: AppSyncResolverEvent<{ input: BatchMetricInput }>,
  context: Context
): Promise<MetricResponse> => {
  const startTime = Date.now();
  const isColdStart = !global.isWarm;
  global.isWarm = true;
  
  const { input } = event.arguments;
  const correlationId = input.correlationId || uuidv4();
  
  console.log(`[${correlationId}] Processing batch metrics:`, {
    source: input.source,
    metricsCount: input.metrics.length,
    coldStart: isColdStart,
  });

  const response: MetricResponse = {
    success: true,
    metricsPublished: 0,
    errors: [],
    correlationId,
  };

  try {
    // Validate input metrics
    const validMetrics = validateMetrics(input.metrics);
    if (validMetrics.length === 0) {
      throw new Error('No valid metrics provided');
    }

    // Process metrics in batches
    const batches = createBatches(validMetrics, MAX_BATCH_SIZE);
    
    for (const batch of batches) {
      try {
        // Publish to CloudWatch
        await publishToCloudWatch(batch, correlationId);
        
        // Store in DynamoDB for historical analysis
        await storeMetricsInDatabase(batch, input.source, correlationId);
        
        response.metricsPublished += batch.length;
        
      } catch (error) {
        console.error(`[${correlationId}] Error processing batch:`, error);
        response.errors.push(`Batch processing error: ${error.message}`);
        response.success = false;
      }
    }

    // Publish system performance metrics
    await publishSystemMetrics(startTime, isColdStart, correlationId);
    
    console.log(`[${correlationId}] Metrics publishing completed:`, {
      published: response.metricsPublished,
      errors: response.errors.length,
      duration: Date.now() - startTime,
    });

    return response;

  } catch (error) {
    console.error(`[${correlationId}] Critical error in metrics publisher:`, error);
    response.success = false;
    response.errors.push(`Critical error: ${error.message}`);
    return response;
  }
};

/**
 * Validate metric inputs
 */
function validateMetrics(metrics: MetricInput[]): MetricInput[] {
  const valid: MetricInput[] = [];
  
  for (const metric of metrics) {
    if (!metric.metricName || typeof metric.value !== 'number') {
      console.warn('Invalid metric skipped:', metric);
      continue;
    }
    
    if (isNaN(metric.value) || !isFinite(metric.value)) {
      console.warn('Invalid metric value skipped:', metric);
      continue;
    }
    
    // Validate dimensions (CloudWatch limitation: 10 dimensions max)
    const dimensions = metric.dimensions || {};
    if (Object.keys(dimensions).length > 10) {
      console.warn('Too many dimensions, truncating:', metric.metricName);
      metric.dimensions = Object.fromEntries(
        Object.entries(dimensions).slice(0, 10)
      );
    }
    
    valid.push(metric);
  }
  
  return valid;
}

/**
 * Create batches for CloudWatch publishing
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Publish metrics to CloudWatch
 */
async function publishToCloudWatch(metrics: MetricInput[], correlationId: string): Promise<void> {
  const metricData: MetricDatum[] = metrics.map(metric => ({
    MetricName: metric.metricName,
    Value: metric.value,
    Unit: metric.unit,
    Timestamp: metric.timestamp ? new Date(metric.timestamp) : new Date(),
    Dimensions: Object.entries(metric.dimensions || {}).map(([Name, Value]) => ({
      Name,
      Value: String(Value),
    })),
  }));

  const command = new PutMetricDataCommand({
    Namespace: `${NAMESPACE}/${metrics[0].category}`,
    MetricData: metricData,
  });

  await cloudWatchClient.send(command);
  
  console.log(`[${correlationId}] Published ${metricData.length} metrics to CloudWatch`);
}

/**
 * Store metrics in DynamoDB for historical analysis
 */
async function storeMetricsInDatabase(
  metrics: MetricInput[], 
  source: string, 
  correlationId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  for (const metric of metrics) {
    const tableName = getTableNameForCategory(metric.category);
    if (!tableName) continue;

    const item = {
      id: uuidv4(),
      metricId: `${source}_${metric.metricName}_${Date.now()}`,
      source,
      category: metric.category,
      metricName: metric.metricName,
      value: metric.value,
      unit: metric.unit,
      dimensions: metric.dimensions,
      correlationId,
      timestamp: metric.timestamp || timestamp,
      createdAt: timestamp,
      metadata: metric.metadata,
      ttl: Math.floor((Date.now() + (90 * 24 * 60 * 60 * 1000)) / 1000), // 90 days TTL
    };

    try {
      await dynamoDb.put({
        TableName: tableName,
        Item: item,
      });
    } catch (error) {
      console.error(`Failed to store metric in ${tableName}:`, error);
      // Don't throw - metric publishing to CloudWatch should continue
    }
  }
}

/**
 * Get appropriate DynamoDB table name for metric category
 */
function getTableNameForCategory(category: string): string | null {
  switch (category) {
    case 'BUSINESS':
      return process.env.BUSINESS_METRICS_TABLE || 'BusinessMetric';
    case 'TECHNICAL':
      return process.env.SYSTEM_HEALTH_TABLE || 'SystemHealthMetric';
    case 'SECURITY':
      return process.env.FRAUD_ANALYTICS_TABLE || 'FraudAnalytic';
    case 'COST':
      return process.env.COST_METRICS_TABLE || 'CostMetric';
    default:
      return null;
  }
}

/**
 * Publish system performance metrics for the metrics publisher itself
 */
async function publishSystemMetrics(
  startTime: number, 
  isColdStart: boolean, 
  correlationId: string
): Promise<void> {
  const executionTime = Date.now() - startTime;
  
  const systemMetrics: MetricInput[] = [
    {
      category: 'TECHNICAL',
      metricName: 'MetricsPublisherExecutionTime',
      value: executionTime,
      unit: 'Milliseconds',
      dimensions: {
        FunctionName: 'metrics-publisher',
        ColdStart: isColdStart.toString(),
      },
      correlationId,
    },
    {
      category: 'TECHNICAL', 
      metricName: 'MetricsPublisherColdStart',
      value: isColdStart ? 1 : 0,
      unit: 'Count',
      dimensions: {
        FunctionName: 'metrics-publisher',
      },
      correlationId,
    },
  ];

  // Publish system metrics (recursive call, but limited scope)
  try {
    await publishToCloudWatch(systemMetrics, correlationId);
    
    // Track connection metrics
    trackConnectionMetrics('metrics-publisher', {
      connectionTime: 25, // Connection pooled
      requestTime: executionTime,
      coldStart: isColdStart,
      architecture: 'arm64',
      memorySize: 256,
    });
    
  } catch (error) {
    console.error('Failed to publish system metrics:', error);
    // Don't throw - this is secondary monitoring
  }
}

// Global variable to track warm starts
declare global {
  var isWarm: boolean;
}

/**
 * PREDEFINED METRIC TEMPLATES
 * 
 * Common metric patterns for different system components
 */

export const MetricTemplates = {
  // Payment Processing Metrics
  paymentProcessingLatency: (latencyMs: number, paymentMethod: string): MetricInput => ({
    category: 'TECHNICAL',
    metricName: 'PaymentProcessingLatency',
    value: latencyMs,
    unit: 'Milliseconds',
    dimensions: {
      PaymentMethod: paymentMethod,
      Service: 'payment-processor',
    },
  }),

  paymentSuccess: (paymentMethod: string, amount: number): MetricInput => ({
    category: 'BUSINESS',
    metricName: 'PaymentSuccess',
    value: 1,
    unit: 'Count',
    dimensions: {
      PaymentMethod: paymentMethod,
      AmountRange: getAmountRange(amount),
    },
  }),

  fraudDetectionScore: (score: number, decision: string): MetricInput => ({
    category: 'SECURITY',
    metricName: 'FraudDetectionScore',
    value: score,
    unit: 'None',
    dimensions: {
      Decision: decision,
      ScoreRange: getFraudScoreRange(score),
    },
  }),

  costSavings: (awsCost: number, stripeCost: number, paymentMethod: string): MetricInput => ({
    category: 'COST',
    metricName: 'CostSavingsAmount',
    value: stripeCost - awsCost,
    unit: 'None',
    dimensions: {
      PaymentMethod: paymentMethod,
      SavingsPercentage: String(Math.round(((stripeCost - awsCost) / stripeCost) * 100)),
    },
  }),

  transactionVolume: (amount: number, currency: string): MetricInput => ({
    category: 'BUSINESS',
    metricName: 'TransactionVolume',
    value: amount,
    unit: 'None',
    dimensions: {
      Currency: currency,
    },
  }),
};

/**
 * Helper functions for dimension categorization
 */
function getAmountRange(amount: number): string {
  if (amount < 1000) return 'Under10';
  if (amount < 5000) return '10to50';
  if (amount < 10000) return '50to100';
  if (amount < 50000) return '100to500';
  return 'Over500';
}

function getFraudScoreRange(score: number): string {
  if (score < 0.2) return 'Low';
  if (score < 0.5) return 'Medium';
  if (score < 0.8) return 'High';
  return 'Critical';
}