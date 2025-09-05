import { type AppSyncResolverEvent, type Context } from 'aws-lambda';
import { getDynamoDBClient, trackConnectionMetrics } from '../utils/connection-optimizer';
import { CloudWatchClient, PutMetricDataCommand, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

/**
 * ROI Dashboard Handler
 * 
 * Provides comprehensive real-time cost tracking and ROI analysis
 * for the AWS-native payment system migration from Stripe
 */

interface DashboardQuery {
  timeframe: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  includeProjections?: boolean;
  includeTrends?: boolean;
}

interface ROIDashboardData {
  // Real-time metrics
  currentSavingsPercentage: number;
  targetSavingsPercentage: number;
  totalSavingsToday: number;
  totalSavingsThisMonth: number;
  totalSavingsThisYear: number;
  
  // Cost breakdown
  awsCostBreakdown: {
    lambdaCosts: number;
    dynamoDbCosts: number;
    paymentCryptographyCosts: number;
    achCosts: number;
    otherAWSCosts: number;
  };
  
  // Transaction metrics
  transactionMetrics: {
    totalTransactions: number;
    averageCostPerTransaction: number;
    averageSavingsPerTransaction: number;
    costEfficiencyScore: number;
  };
  
  // Comparative analysis
  stripeVsAWSComparison: {
    stripeTotalCost: number;
    awsTotalCost: number;
    totalSavings: number;
    savingsPercentage: number;
    breakEvenPoint: string;
  };
  
  // Projections
  projections: {
    monthlyProjection: number;
    yearlyProjection: number;
    fiveYearProjection: number;
    roiPercentage: number;
  };
  
  // Performance metrics
  performanceMetrics: {
    averageProcessingTime: number;
    costPerSecond: number;
    efficiencyRating: 'excellent' | 'good' | 'fair' | 'poor';
    optimizationOpportunities: string[];
  };
  
  // Trend analysis
  trends: {
    costTrend: 'decreasing' | 'stable' | 'increasing';
    savingsTrend: 'improving' | 'stable' | 'declining';
    volumeTrend: 'growing' | 'stable' | 'declining';
    recommendations: string[];
  };
  
  // Real-time alerts
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
    actionRequired?: boolean;
  }>;
}

const dynamoDb = getDynamoDBClient();
const cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });

export const handler = async (
  event: AppSyncResolverEvent<{ input: DashboardQuery }>,
  context: Context
): Promise<ROIDashboardData> => {
  const startTime = Date.now();
  const isColdStart = !global.isWarm;
  global.isWarm = true;

  try {
    console.log('Generating ROI dashboard data:', JSON.stringify(event.arguments.input));
    
    const { input } = event.arguments;
    
    // Gather data in parallel for optimal performance
    const [
      costMetrics,
      savingsReports,
      transactionData,
      batchOptimizations,
      cloudWatchMetrics
    ] = await Promise.all([
      getCostMetrics(input.timeframe, input.startDate, input.endDate),
      getSavingsReports(input.timeframe, input.startDate, input.endDate),
      getTransactionData(input.timeframe, input.startDate, input.endDate),
      getBatchOptimizations(input.timeframe, input.startDate, input.endDate),
      getCloudWatchMetrics(input.timeframe, input.startDate, input.endDate),
    ]);
    
    // Calculate comprehensive dashboard data
    const dashboardData = await calculateROIDashboard({
      costMetrics,
      savingsReports,
      transactionData,
      batchOptimizations,
      cloudWatchMetrics,
      timeframe: input.timeframe,
      includeProjections: input.includeProjections || false,
      includeTrends: input.includeTrends || false,
    });
    
    // Publish dashboard metrics to CloudWatch
    await publishDashboardMetrics(dashboardData);
    
    // Track performance metrics
    trackConnectionMetrics('roi-dashboard', {
      connectionTime: 75, // Connection pooled
      requestTime: Date.now() - startTime,
      coldStart: isColdStart,
      architecture: 'arm64',
      memorySize: 512,
    });
    
    return dashboardData;
    
  } catch (error) {
    console.error('ROI dashboard generation error:', error);
    
    // Return minimal dashboard data on error
    return getEmptyDashboardData();
  }
};

async function getCostMetrics(timeframe: string, startDate?: string, endDate?: string) {
  const tableName = process.env.COST_METRIC_TABLE || 'CostMetric';
  
  try {
    const params: any = {
      TableName: tableName,
      IndexName: 'metricsByType',
      KeyConditionExpression: 'metricType = :metricType',
      ExpressionAttributeValues: {
        ':metricType': 'transaction_cost',
      },
    };
    
    // Add time-based filtering if dates provided
    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND #timestamp BETWEEN :startDate AND :endDate';
      params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
      params.ExpressionAttributeValues[':startDate'] = startDate;
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }
    
    const result = await dynamoDb.query(params);
    return result.Items || [];
    
  } catch (error) {
    console.error('Error fetching cost metrics:', error);
    return [];
  }
}

async function getSavingsReports(timeframe: string, startDate?: string, endDate?: string) {
  const tableName = process.env.SAVINGS_REPORT_TABLE || 'SavingsReport';
  
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'reportsByType',
      KeyConditionExpression: 'reportType = :reportType',
      ExpressionAttributeValues: {
        ':reportType': timeframe === 'realtime' || timeframe === 'hourly' ? 'daily' : timeframe,
      },
    });
    
    return result.Items || [];
    
  } catch (error) {
    console.error('Error fetching savings reports:', error);
    return [];
  }
}

async function getTransactionData(timeframe: string, startDate?: string, endDate?: string) {
  const tableName = process.env.PAYMENT_TRANSACTION_TABLE || 'PaymentTransaction';
  
  try {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'transactionsByStatus',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
      },
    });
    
    return result.Items || [];
    
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    return [];
  }
}

async function getBatchOptimizations(timeframe: string, startDate?: string, endDate?: string) {
  const tableName = process.env.BATCH_OPTIMIZATION_TABLE || 'BatchOptimization';
  
  try {
    const result = await dynamoDb.scan({
      TableName: tableName,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
      },
    });
    
    return result.Items || [];
    
  } catch (error) {
    console.error('Error fetching batch optimizations:', error);
    return [];
  }
}

async function getCloudWatchMetrics(timeframe: string, startDate?: string, endDate?: string) {
  try {
    const endTime = endDate ? new Date(endDate) : new Date();
    const startTime = startDate ? new Date(startDate) : new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await cloudWatch.send(new GetMetricStatisticsCommand({
      Namespace: process.env.CLOUDWATCH_NAMESPACE || 'ECOSYSTEMAWS/PaymentCosts',
      MetricName: 'TransactionCost',
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600, // 1 hour periods
      Statistics: ['Average', 'Sum', 'Maximum', 'Minimum'],
    }));
    
    return result.Datapoints || [];
    
  } catch (error) {
    console.error('Error fetching CloudWatch metrics:', error);
    return [];
  }
}

async function calculateROIDashboard(data: {
  costMetrics: any[];
  savingsReports: any[];
  transactionData: any[];
  batchOptimizations: any[];
  cloudWatchMetrics: any[];
  timeframe: string;
  includeProjections: boolean;
  includeTrends: boolean;
}): Promise<ROIDashboardData> {
  
  const { costMetrics, savingsReports, transactionData, batchOptimizations } = data;
  
  // Calculate real-time metrics
  const totalTransactions = transactionData.length;
  const totalAwsCostCents = costMetrics.reduce((sum, metric) => sum + (metric.awsCostCents || 0), 0);
  const totalStripeBaselineCosts = costMetrics.reduce((sum, metric) => sum + (metric.stripeBaselineCostCents || 0), 0);
  const totalSavingsCents = totalStripeBaselineCosts - totalAwsCostCents;
  const currentSavingsPercentage = totalStripeBaselineCosts > 0 ? (totalSavingsCents / totalStripeBaselineCosts) * 100 : 0;
  
  // Calculate cost breakdown
  const awsCostBreakdown = {
    lambdaCosts: costMetrics.reduce((sum, metric) => sum + (metric.lambdaCostCents || 0), 0) / 100,
    dynamoDbCosts: costMetrics.reduce((sum, metric) => sum + (metric.dynamoDbCostCents || 0), 0) / 100,
    paymentCryptographyCosts: costMetrics.reduce((sum, metric) => sum + (metric.paymentCryptoCostCents || 0), 0) / 100,
    achCosts: costMetrics.reduce((sum, metric) => sum + (metric.achCostCents || 0), 0) / 100,
    otherAWSCosts: 0, // Could include S3, CloudWatch, etc.
  };
  
  // Calculate transaction metrics
  const averageCostPerTransaction = totalTransactions > 0 ? (totalAwsCostCents / totalTransactions) / 100 : 0;
  const averageSavingsPerTransaction = totalTransactions > 0 ? (totalSavingsCents / totalTransactions) / 100 : 0;
  const targetCostCents = parseInt(process.env.TARGET_COST_PER_TRANSACTION_CENTS || '10');
  const costEfficiencyScore = Math.max(0, Math.min(100, ((targetCostCents - (totalAwsCostCents / totalTransactions)) / targetCostCents) * 100));
  
  // Calculate projections
  const projections = data.includeProjections ? calculateProjections(
    totalSavingsCents,
    totalTransactions,
    data.timeframe
  ) : {
    monthlyProjection: 0,
    yearlyProjection: 0,
    fiveYearProjection: 0,
    roiPercentage: 0,
  };
  
  // Analyze trends
  const trends = data.includeTrends ? analyzeTrends(costMetrics, savingsReports) : {
    costTrend: 'stable' as const,
    savingsTrend: 'stable' as const,
    volumeTrend: 'stable' as const,
    recommendations: [],
  };
  
  // Generate alerts
  const alerts = generateAlerts(currentSavingsPercentage, averageCostPerTransaction, costEfficiencyScore);
  
  return {
    currentSavingsPercentage,
    targetSavingsPercentage: parseInt(process.env.SAVINGS_TARGET_PERCENTAGE || '98'),
    totalSavingsToday: totalSavingsCents / 100,
    totalSavingsThisMonth: totalSavingsCents / 100, // Would calculate monthly in real implementation
    totalSavingsThisYear: totalSavingsCents / 100, // Would calculate yearly in real implementation
    
    awsCostBreakdown,
    
    transactionMetrics: {
      totalTransactions,
      averageCostPerTransaction,
      averageSavingsPerTransaction,
      costEfficiencyScore,
    },
    
    stripeVsAWSComparison: {
      stripeTotalCost: totalStripeBaselineCosts / 100,
      awsTotalCost: totalAwsCostCents / 100,
      totalSavings: totalSavingsCents / 100,
      savingsPercentage: currentSavingsPercentage,
      breakEvenPoint: calculateBreakEvenPoint(totalAwsCostCents, totalSavingsCents),
    },
    
    projections,
    
    performanceMetrics: {
      averageProcessingTime: calculateAverageProcessingTime(costMetrics),
      costPerSecond: calculateCostPerSecond(totalAwsCostCents, costMetrics),
      efficiencyRating: getEfficiencyRating(costEfficiencyScore),
      optimizationOpportunities: identifyOptimizationOpportunities(costMetrics, batchOptimizations),
    },
    
    trends,
    alerts,
  };
}

function calculateProjections(totalSavingsCents: number, totalTransactions: number, timeframe: string) {
  const dailySavings = timeframe === 'daily' ? totalSavingsCents : totalSavingsCents; // Simplification
  const monthlySavings = dailySavings * 30;
  const yearlySavings = dailySavings * 365;
  const fiveYearSavings = yearlySavings * 5;
  
  // Assume initial migration cost of $50,000
  const migrationCost = 5000000; // $50,000 in cents
  const roiPercentage = yearlySavings > 0 ? ((yearlySavings - migrationCost) / migrationCost) * 100 : 0;
  
  return {
    monthlyProjection: monthlySavings / 100,
    yearlyProjection: yearlySavings / 100,
    fiveYearProjection: fiveYearSavings / 100,
    roiPercentage,
  };
}

function analyzeTrends(costMetrics: any[], savingsReports: any[]) {
  // Simplified trend analysis - would be more sophisticated in real implementation
  const recentCosts = costMetrics.slice(-10);
  const oldCosts = costMetrics.slice(0, 10);
  
  const recentAvgCost = recentCosts.reduce((sum, metric) => sum + metric.awsCostCents, 0) / recentCosts.length;
  const oldAvgCost = oldCosts.reduce((sum, metric) => sum + metric.awsCostCents, 0) / oldCosts.length;
  
  const costTrend = recentAvgCost > oldAvgCost * 1.1 ? 'increasing' : 
                   recentAvgCost < oldAvgCost * 0.9 ? 'decreasing' : 'stable';
  
  return {
    costTrend,
    savingsTrend: 'improving' as const, // Simplified
    volumeTrend: 'growing' as const, // Simplified
    recommendations: [
      'Consider increasing batch sizes for ACH transfers',
      'Monitor ARM64 Lambda adoption rate',
      'Review DynamoDB read/write patterns for optimization',
    ],
  };
}

function generateAlerts(savingsPercentage: number, avgCost: number, efficiencyScore: number) {
  const alerts = [];
  const targetSavings = parseInt(process.env.SAVINGS_TARGET_PERCENTAGE || '98');
  const maxCost = parseInt(process.env.MAXIMUM_ACCEPTABLE_COST_CENTS || '20') / 100;
  
  if (savingsPercentage < targetSavings * 0.9) {
    alerts.push({
      severity: 'warning' as const,
      message: `Savings percentage (${savingsPercentage.toFixed(1)}%) is below target (${targetSavings}%)`,
      timestamp: new Date().toISOString(),
      actionRequired: true,
    });
  }
  
  if (avgCost > maxCost) {
    alerts.push({
      severity: 'critical' as const,
      message: `Average cost per transaction ($${avgCost.toFixed(2)}) exceeds maximum acceptable cost ($${maxCost})`,
      timestamp: new Date().toISOString(),
      actionRequired: true,
    });
  }
  
  if (efficiencyScore < 70) {
    alerts.push({
      severity: 'warning' as const,
      message: `Cost efficiency score (${efficiencyScore.toFixed(0)}) indicates optimization opportunities`,
      timestamp: new Date().toISOString(),
      actionRequired: false,
    });
  }
  
  return alerts;
}

function calculateBreakEvenPoint(totalAwsCosts: number, totalSavings: number): string {
  // Simplified calculation - assume migration cost of $50,000
  const migrationCostCents = 5000000;
  const dailySavings = totalSavings; // Assuming input is daily savings
  
  if (dailySavings <= 0) return 'Never (no savings)';
  
  const daysToBreakEven = migrationCostCents / dailySavings;
  
  if (daysToBreakEven < 1) return 'Already achieved';
  if (daysToBreakEven < 30) return `${Math.ceil(daysToBreakEven)} days`;
  if (daysToBreakEven < 365) return `${Math.ceil(daysToBreakEven / 30)} months`;
  
  return `${Math.ceil(daysToBreakEven / 365)} years`;
}

function calculateAverageProcessingTime(costMetrics: any[]): number {
  if (costMetrics.length === 0) return 0;
  
  const totalProcessingTime = costMetrics.reduce((sum, metric) => sum + (metric.processingTimeMs || 100), 0);
  return totalProcessingTime / costMetrics.length;
}

function calculateCostPerSecond(totalCostCents: number, costMetrics: any[]): number {
  const totalProcessingTimeMs = costMetrics.reduce((sum, metric) => sum + (metric.processingTimeMs || 100), 0);
  const totalProcessingTimeSeconds = totalProcessingTimeMs / 1000;
  
  return totalProcessingTimeSeconds > 0 ? (totalCostCents / 100) / totalProcessingTimeSeconds : 0;
}

function getEfficiencyRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

function identifyOptimizationOpportunities(costMetrics: any[], batchOptimizations: any[]): string[] {
  const opportunities = [];
  
  // Analyze Lambda costs
  const avgLambdaCost = costMetrics.reduce((sum, metric) => sum + (metric.lambdaCostCents || 0), 0) / costMetrics.length;
  if (avgLambdaCost > 5) { // Above 5 cents
    opportunities.push('Consider further Lambda memory optimization');
  }
  
  // Analyze batch efficiency
  const batchSavings = batchOptimizations.reduce((sum, batch) => sum + (batch.estimatedSavingsCents || 0), 0);
  const totalBatches = batchOptimizations.length;
  if (batchSavings / totalBatches < 100) { // Less than $1 savings per batch
    opportunities.push('Improve ACH batch sizing for greater cost efficiency');
  }
  
  // Analyze DynamoDB costs
  const avgDynamoCost = costMetrics.reduce((sum, metric) => sum + (metric.dynamoDbCostCents || 0), 0) / costMetrics.length;
  if (avgDynamoCost > 3) { // Above 3 cents
    opportunities.push('Consider DynamoDB on-demand billing optimization');
  }
  
  return opportunities;
}

async function publishDashboardMetrics(dashboardData: ROIDashboardData): Promise<void> {
  const namespace = process.env.CLOUDWATCH_NAMESPACE || 'ECOSYSTEMAWS/ROIDashboard';
  
  const metrics = [
    {
      MetricName: 'SavingsPercentage',
      Value: dashboardData.currentSavingsPercentage,
      Unit: 'Percent',
    },
    {
      MetricName: 'CostEfficiencyScore',
      Value: dashboardData.transactionMetrics.costEfficiencyScore,
      Unit: 'Count',
    },
    {
      MetricName: 'AverageCostPerTransaction',
      Value: dashboardData.transactionMetrics.averageCostPerTransaction,
      Unit: 'Count',
    },
    {
      MetricName: 'ROIPercentage',
      Value: dashboardData.projections.roiPercentage,
      Unit: 'Percent',
    },
  ];
  
  await cloudWatch.send(new PutMetricDataCommand({
    Namespace: namespace,
    MetricData: metrics,
  }));
}

function getEmptyDashboardData(): ROIDashboardData {
  return {
    currentSavingsPercentage: 0,
    targetSavingsPercentage: 98,
    totalSavingsToday: 0,
    totalSavingsThisMonth: 0,
    totalSavingsThisYear: 0,
    
    awsCostBreakdown: {
      lambdaCosts: 0,
      dynamoDbCosts: 0,
      paymentCryptographyCosts: 0,
      achCosts: 0,
      otherAWSCosts: 0,
    },
    
    transactionMetrics: {
      totalTransactions: 0,
      averageCostPerTransaction: 0,
      averageSavingsPerTransaction: 0,
      costEfficiencyScore: 0,
    },
    
    stripeVsAWSComparison: {
      stripeTotalCost: 0,
      awsTotalCost: 0,
      totalSavings: 0,
      savingsPercentage: 0,
      breakEvenPoint: 'Unknown',
    },
    
    projections: {
      monthlyProjection: 0,
      yearlyProjection: 0,
      fiveYearProjection: 0,
      roiPercentage: 0,
    },
    
    performanceMetrics: {
      averageProcessingTime: 0,
      costPerSecond: 0,
      efficiencyRating: 'poor',
      optimizationOpportunities: [],
    },
    
    trends: {
      costTrend: 'stable',
      savingsTrend: 'stable',
      volumeTrend: 'stable',
      recommendations: [],
    },
    
    alerts: [{
      severity: 'warning',
      message: 'Dashboard data unavailable - using fallback values',
      timestamp: new Date().toISOString(),
      actionRequired: false,
    }],
  };
}

// Global variable to track warm starts
declare global {
  var isWarm: boolean;
}