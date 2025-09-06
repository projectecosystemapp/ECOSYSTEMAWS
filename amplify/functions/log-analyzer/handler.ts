import { type AppSyncResolverEvent, type Context } from 'aws-lambda';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { getDynamoDBClient, trackConnectionMetrics } from '../utils/connection-optimizer';
import { v4 as uuidv4 } from 'uuid';

/**
 * ECOSYSTEMAWS Log Analysis System
 * 
 * Comprehensive log aggregation, correlation, and analysis system for the
 * AWS native payment system. Provides real-time log insights, anomaly
 * detection, and automated troubleshooting support.
 */

interface LogAnalysisInput {
  analysisType: 'CORRELATION' | 'ANOMALY' | 'PERFORMANCE' | 'SECURITY' | 'BUSINESS';
  timeRange: {
    startTime: string;
    endTime: string;
  };
  correlationId?: string;
  services?: string[];
  logLevel?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  searchTerms?: string[];
  customQuery?: string;
}

interface LogAnalysisResponse {
  analysisId: string;
  queryId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  results: LogAnalysisResult[];
  insights: LogInsight[];
  anomalies: LogAnomaly[];
  correlationMap: CorrelationMapping[];
  summary: AnalysisSummary;
}

interface LogAnalysisResult {
  timestamp: string;
  logGroup: string;
  service: string;
  level: string;
  message: string;
  correlationId?: string;
  requestId?: string;
  duration?: number;
  errorCode?: string;
  metadata: Record<string, any>;
}

interface LogInsight {
  type: 'PATTERN' | 'TREND' | 'CORRELATION' | 'RECOMMENDATION';
  title: string;
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  actionable: boolean;
  suggestedAction?: string;
}

interface LogAnomaly {
  type: 'VOLUME' | 'PATTERN' | 'LATENCY' | 'ERROR_RATE';
  service: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  deviationScore: number;
  baselineValue: number;
  currentValue: number;
  timeWindow: string;
}

interface CorrelationMapping {
  correlationId: string;
  services: string[];
  totalEvents: number;
  duration: number;
  success: boolean;
  errorChain?: string[];
  performanceMetrics: {
    totalLatency: number;
    serviceLatencies: Record<string, number>;
  };
}

interface AnalysisSummary {
  totalLogs: number;
  errorRate: number;
  averageLatency: number;
  topErrors: Array<{ error: string; count: number }>;
  serviceHealth: Record<string, 'HEALTHY' | 'DEGRADED' | 'CRITICAL'>;
  recommendedActions: string[];
}

// Initialize AWS clients
const cloudWatchLogsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
const dynamoDb = getDynamoDBClient();

const LOG_GROUP_PREFIX = process.env.CLOUDWATCH_LOGS_GROUP_PREFIX || '/aws/lambda/ecosystem-';

export const handler = async (
  event: AppSyncResolverEvent<{ input: LogAnalysisInput }>,
  context: Context
): Promise<LogAnalysisResponse> => {
  const startTime = Date.now();
  const isColdStart = !global.isWarm;
  global.isWarm = true;

  const { input } = event.arguments;
  const analysisId = uuidv4();
  
  console.log(`[${analysisId}] Starting log analysis:`, {
    type: input.analysisType,
    timeRange: input.timeRange,
    services: input.services?.length || 'all',
    coldStart: isColdStart,
  });

  try {
    // 1. Build CloudWatch Insights query based on analysis type
    const query = buildLogInsightsQuery(input);
    const logGroups = await getRelevantLogGroups(input.services);

    // 2. Execute CloudWatch Insights query
    const queryId = await executeLogQuery(query, logGroups, input.timeRange);

    // 3. Wait for and retrieve query results
    const rawResults = await getQueryResults(queryId);

    // 4. Process and analyze log results
    const processedResults = processLogResults(rawResults);
    const insights = await generateInsights(processedResults, input.analysisType);
    const anomalies = detectAnomalies(processedResults);
    const correlationMap = await buildCorrelationMap(processedResults);

    // 5. Generate analysis summary
    const summary = generateAnalysisSummary(processedResults, insights, anomalies);

    // 6. Store analysis results for historical reference
    await storeAnalysisResults(analysisId, input, {
      results: processedResults,
      insights,
      anomalies,
      correlationMap,
      summary,
    });

    const response: LogAnalysisResponse = {
      analysisId,
      queryId,
      status: 'COMPLETED',
      results: processedResults.slice(0, 100), // Limit response size
      insights,
      anomalies,
      correlationMap,
      summary,
    };

    console.log(`[${analysisId}] Log analysis completed:`, {
      resultsCount: processedResults.length,
      insightsCount: insights.length,
      anomaliesCount: anomalies.length,
      duration: Date.now() - startTime,
    });

    return response;

  } catch (error) {
    console.error(`[${analysisId}] Log analysis failed:`, error);
    
    return {
      analysisId,
      queryId: '',
      status: 'FAILED',
      results: [],
      insights: [],
      anomalies: [],
      correlationMap: [],
      summary: {
        totalLogs: 0,
        errorRate: 0,
        averageLatency: 0,
        topErrors: [],
        serviceHealth: {},
        recommendedActions: [`Analysis failed: ${error.message}`],
      },
    };
  }
};

/**
 * Build CloudWatch Insights query based on analysis type
 */
function buildLogInsightsQuery(input: LogAnalysisInput): string {
  const baseFields = `
    fields @timestamp, @message, @requestId, @logStream
    | filter @message not like /START/ and @message not like /END/ and @message not like /REPORT/
  `;

  switch (input.analysisType) {
    case 'CORRELATION':
      return `
        ${baseFields}
        | filter @message like /${input.correlationId || ''}/
        | parse @message /correlationId[=:]\s*(?<correlationId>[^\s,}]+)/
        | parse @message /service[=:]\s*(?<service>[^\s,}]+)/
        | parse @message /duration[=:]\s*(?<duration>[0-9.]+)/
        | sort @timestamp desc
        | limit 1000
      `;

    case 'PERFORMANCE':
      return `
        ${baseFields}
        | parse @message /duration[=:]\s*(?<duration>[0-9.]+)/
        | parse @message /latency[=:]\s*(?<latency>[0-9.]+)/
        | parse @message /processingTime[=:]\s*(?<processingTime>[0-9.]+)/
        | filter duration > 100 or latency > 100 or processingTime > 100
        | stats avg(duration), max(duration), count() by bin(5m)
        | sort @timestamp desc
        | limit 500
      `;

    case 'SECURITY':
      return `
        ${baseFields}
        | filter @message like /SECURITY/ or @message like /FRAUD/ or @message like /BLOCK/
        | parse @message /fraudScore[=:]\s*(?<fraudScore>[0-9.]+)/
        | parse @message /decision[=:]\s*(?<decision>[A-Z]+)/
        | parse @message /ip[=:]\s*(?<ip>[0-9.]+)/
        | sort @timestamp desc
        | limit 500
      `;

    case 'BUSINESS':
      return `
        ${baseFields}
        | filter @message like /transaction/ or @message like /payment/ or @message like /revenue/
        | parse @message /amount[=:]\s*(?<amount>[0-9.]+)/
        | parse @message /status[=:]\s*(?<status>[A-Z_]+)/
        | parse @message /paymentMethod[=:]\s*(?<paymentMethod>[a-z_]+)/
        | stats sum(amount), count() by status, paymentMethod, bin(1h)
        | sort @timestamp desc
        | limit 500
      `;

    case 'ANOMALY':
      return `
        ${baseFields}
        | parse @message /ERROR|WARN|Exception|Fail/ as error_level
        | filter error_level != ""
        | stats count() by error_level, bin(5m)
        | sort @timestamp desc
        | limit 1000
      `;

    default:
      return `
        ${baseFields}
        ${input.searchTerms ? input.searchTerms.map(term => `| filter @message like /${term}/`).join(' ') : ''}
        ${input.logLevel ? `| filter @message like /${input.logLevel}/` : ''}
        | sort @timestamp desc
        | limit 1000
      `;
  }
}

/**
 * Get relevant log groups for analysis
 */
async function getRelevantLogGroups(services?: string[]): Promise<string[]> {
  try {
    const response = await cloudWatchLogsClient.send(new DescribeLogGroupsCommand({
      logGroupNamePrefix: LOG_GROUP_PREFIX,
    }));

    const allLogGroups = response.logGroups?.map(lg => lg.logGroupName!).filter(Boolean) || [];

    if (services && services.length > 0) {
      return allLogGroups.filter(lg => 
        services.some(service => lg.includes(service))
      );
    }

    return allLogGroups;
  } catch (error) {
    console.error('Error fetching log groups:', error);
    return [];
  }
}

/**
 * Execute CloudWatch Insights query
 */
async function executeLogQuery(
  query: string,
  logGroups: string[],
  timeRange: { startTime: string; endTime: string }
): Promise<string> {
  const startTime = Math.floor(new Date(timeRange.startTime).getTime() / 1000);
  const endTime = Math.floor(new Date(timeRange.endTime).getTime() / 1000);

  const response = await cloudWatchLogsClient.send(new StartQueryCommand({
    logGroupNames: logGroups,
    startTime,
    endTime,
    queryString: query,
  }));

  if (!response.queryId) {
    throw new Error('Failed to start CloudWatch Insights query');
  }

  return response.queryId;
}

/**
 * Get query results (with polling)
 */
async function getQueryResults(queryId: string): Promise<any[]> {
  const maxAttempts = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await cloudWatchLogsClient.send(new GetQueryResultsCommand({
      queryId,
    }));

    if (response.status === 'Complete') {
      return response.results || [];
    }

    if (response.status === 'Failed' || response.status === 'Cancelled') {
      throw new Error(`Query failed with status: ${response.status}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Query timeout - results not available');
}

/**
 * Process raw log query results
 */
function processLogResults(rawResults: any[]): LogAnalysisResult[] {
  return rawResults.map(result => {
    const fields = result.reduce((acc: any, field: any) => {
      acc[field.field] = field.value;
      return acc;
    }, {});

    return {
      timestamp: fields['@timestamp'] || '',
      logGroup: fields['@logStream'] || '',
      service: extractServiceName(fields['@logStream'] || ''),
      level: extractLogLevel(fields['@message'] || ''),
      message: fields['@message'] || '',
      correlationId: fields.correlationId,
      requestId: fields['@requestId'],
      duration: parseFloat(fields.duration) || undefined,
      errorCode: extractErrorCode(fields['@message'] || ''),
      metadata: {
        ...fields,
      },
    };
  });
}

/**
 * Generate insights from processed results
 */
async function generateInsights(
  results: LogAnalysisResult[],
  analysisType: string
): Promise<LogInsight[]> {
  const insights: LogInsight[] = [];

  // Performance insights
  if (analysisType === 'PERFORMANCE' || analysisType === 'ANOMALY') {
    const durations = results
      .filter(r => r.duration)
      .map(r => r.duration!);
    
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      if (avgDuration > 200) {
        insights.push({
          type: 'TREND',
          title: 'High Average Latency Detected',
          description: `Average processing time is ${avgDuration.toFixed(2)}ms, exceeding target of 200ms`,
          confidence: 0.9,
          evidence: [`${durations.length} samples analyzed`, `Max duration: ${maxDuration}ms`],
          actionable: true,
          suggestedAction: 'Review Lambda memory allocation and optimize code paths',
        });
      }
    }
  }

  // Error pattern insights
  const errorMessages = results
    .filter(r => r.level === 'ERROR')
    .map(r => r.message);
    
  if (errorMessages.length > 0) {
    const errorCounts = errorMessages.reduce((acc, msg) => {
      const key = extractErrorPattern(msg);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topError = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (topError && topError[1] > 5) {
      insights.push({
        type: 'PATTERN',
        title: 'Recurring Error Pattern Detected',
        description: `Error "${topError[0]}" occurred ${topError[1]} times`,
        confidence: 0.8,
        evidence: [`${topError[1]} occurrences`, 'Consistent error pattern'],
        actionable: true,
        suggestedAction: 'Investigate root cause and implement error handling',
      });
    }
  }

  // Service correlation insights
  const serviceCorrelations = buildServiceCorrelations(results);
  if (serviceCorrelations.length > 0) {
    insights.push({
      type: 'CORRELATION',
      title: 'Cross-Service Dependencies Identified',
      description: `Found ${serviceCorrelations.length} correlated service interactions`,
      confidence: 0.7,
      evidence: serviceCorrelations.map(c => `${c.from} → ${c.to}: ${c.strength}`),
      actionable: false,
    });
  }

  return insights;
}

/**
 * Detect log anomalies
 */
function detectAnomalies(results: LogAnalysisResult[]): LogAnomaly[] {
  const anomalies: LogAnomaly[] = [];

  // Error rate anomaly detection
  const errorRate = results.filter(r => r.level === 'ERROR').length / results.length;
  if (errorRate > 0.05) { // 5% error rate threshold
    anomalies.push({
      type: 'ERROR_RATE',
      service: 'payment-system',
      description: `Error rate of ${(errorRate * 100).toFixed(2)}% exceeds normal threshold`,
      severity: errorRate > 0.1 ? 'HIGH' : 'MEDIUM',
      deviationScore: errorRate / 0.01, // Baseline 1% error rate
      baselineValue: 0.01,
      currentValue: errorRate,
      timeWindow: '1h',
    });
  }

  // Volume anomaly detection
  const logVolume = results.length;
  const expectedVolume = 1000; // Baseline expectation
  
  if (Math.abs(logVolume - expectedVolume) / expectedVolume > 0.5) {
    anomalies.push({
      type: 'VOLUME',
      service: 'payment-system',
      description: `Log volume of ${logVolume} deviates significantly from baseline`,
      severity: logVolume < expectedVolume * 0.3 ? 'HIGH' : 'MEDIUM',
      deviationScore: Math.abs(logVolume - expectedVolume) / expectedVolume,
      baselineValue: expectedVolume,
      currentValue: logVolume,
      timeWindow: '1h',
    });
  }

  return anomalies;
}

/**
 * Build correlation mapping
 */
async function buildCorrelationMap(results: LogAnalysisResult[]): Promise<CorrelationMapping[]> {
  const correlations = new Map<string, CorrelationMapping>();

  results
    .filter(r => r.correlationId)
    .forEach(result => {
      const corrId = result.correlationId!;
      
      if (!correlations.has(corrId)) {
        correlations.set(corrId, {
          correlationId: corrId,
          services: [],
          totalEvents: 0,
          duration: 0,
          success: true,
          performanceMetrics: {
            totalLatency: 0,
            serviceLatencies: {},
          },
        });
      }

      const correlation = correlations.get(corrId)!;
      
      if (!correlation.services.includes(result.service)) {
        correlation.services.push(result.service);
      }
      
      correlation.totalEvents++;
      
      if (result.duration) {
        correlation.performanceMetrics.totalLatency += result.duration;
        correlation.performanceMetrics.serviceLatencies[result.service] = 
          (correlation.performanceMetrics.serviceLatencies[result.service] || 0) + result.duration;
      }
      
      if (result.level === 'ERROR') {
        correlation.success = false;
        correlation.errorChain = correlation.errorChain || [];
        correlation.errorChain.push(`${result.service}: ${result.errorCode || 'Unknown error'}`);
      }
    });

  return Array.from(correlations.values()).slice(0, 50); // Limit response size
}

/**
 * Generate analysis summary
 */
function generateAnalysisSummary(
  results: LogAnalysisResult[],
  insights: LogInsight[],
  anomalies: LogAnomaly[]
): AnalysisSummary {
  const totalLogs = results.length;
  const errors = results.filter(r => r.level === 'ERROR');
  const errorRate = totalLogs > 0 ? errors.length / totalLogs : 0;
  
  const durations = results
    .filter(r => r.duration)
    .map(r => r.duration!);
  const averageLatency = durations.length > 0 ? 
    durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Count errors by type
  const errorCounts = errors.reduce((acc, error) => {
    const pattern = extractErrorPattern(error.message);
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topErrors = Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));

  // Assess service health
  const serviceHealth: Record<string, 'HEALTHY' | 'DEGRADED' | 'CRITICAL'> = {};
  const serviceStats = results.reduce((acc, result) => {
    if (!acc[result.service]) {
      acc[result.service] = { total: 0, errors: 0 };
    }
    acc[result.service].total++;
    if (result.level === 'ERROR') {
      acc[result.service].errors++;
    }
    return acc;
  }, {} as Record<string, { total: number; errors: number }>);

  Object.entries(serviceStats).forEach(([service, stats]) => {
    const serviceErrorRate = stats.errors / stats.total;
    if (serviceErrorRate > 0.1) {
      serviceHealth[service] = 'CRITICAL';
    } else if (serviceErrorRate > 0.05) {
      serviceHealth[service] = 'DEGRADED';
    } else {
      serviceHealth[service] = 'HEALTHY';
    }
  });

  // Generate recommended actions
  const recommendedActions: string[] = [];
  
  if (errorRate > 0.05) {
    recommendedActions.push('Investigate high error rate in payment processing pipeline');
  }
  
  if (averageLatency > 200) {
    recommendedActions.push('Optimize Lambda functions for better performance');
  }
  
  if (anomalies.some(a => a.severity === 'HIGH')) {
    recommendedActions.push('Address high-severity anomalies immediately');
  }
  
  insights.filter(i => i.actionable).forEach(insight => {
    if (insight.suggestedAction) {
      recommendedActions.push(insight.suggestedAction);
    }
  });

  return {
    totalLogs,
    errorRate,
    averageLatency,
    topErrors,
    serviceHealth,
    recommendedActions: recommendedActions.slice(0, 10), // Limit recommendations
  };
}

/**
 * Store analysis results for historical reference
 */
async function storeAnalysisResults(
  analysisId: string,
  input: LogAnalysisInput,
  results: any
): Promise<void> {
  try {
    const analysisRecord = {
      id: analysisId,
      analysisType: input.analysisType,
      timeRange: input.timeRange,
      correlationId: input.correlationId,
      services: input.services,
      resultsCount: results.results.length,
      insightsCount: results.insights.length,
      anomaliesCount: results.anomalies.length,
      summary: results.summary,
      timestamp: new Date().toISOString(),
      ttl: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000), // 30 days TTL
    };

    await dynamoDb.put({
      TableName: process.env.LOG_ANALYSIS_TABLE || 'LogAnalysis',
      Item: analysisRecord,
    });

    // Store correlation mappings for future reference
    for (const correlation of results.correlationMap) {
      await dynamoDb.put({
        TableName: process.env.CORRELATION_INDEX_TABLE || 'CorrelationIndex',
        Item: {
          correlationId: correlation.correlationId,
          analysisId,
          services: correlation.services,
          success: correlation.success,
          duration: correlation.performanceMetrics.totalLatency,
          timestamp: new Date().toISOString(),
          ttl: Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000), // 7 days TTL
        },
      });
    }
  } catch (error) {
    console.error('Failed to store analysis results:', error);
  }
}

/**
 * Helper functions
 */
function extractServiceName(logStream: string): string {
  const match = logStream.match(/ecosystem-([^-]+)/);
  return match ? match[1] : 'unknown';
}

function extractLogLevel(message: string): string {
  if (message.includes('ERROR')) return 'ERROR';
  if (message.includes('WARN')) return 'WARN';
  if (message.includes('INFO')) return 'INFO';
  if (message.includes('DEBUG')) return 'DEBUG';
  return 'INFO';
}

function extractErrorCode(message: string): string | undefined {
  const match = message.match(/error[Cc]ode[:\s]*([A-Z0-9_]+)/);
  return match ? match[1] : undefined;
}

function extractErrorPattern(message: string): string {
  // Extract meaningful error patterns
  const patterns = [
    /Connection\s+timeout/i,
    /Database\s+error/i,
    /Authentication\s+failed/i,
    /Rate\s+limit\s+exceeded/i,
    /Invalid\s+request/i,
    /Service\s+unavailable/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(message)) {
      return pattern.source.replace(/\\s\+/g, ' ').replace(/[\\()]/g, '');
    }
  }

  // Generic error extraction
  const match = message.match(/Error[:\s]+([^.\n]+)/);
  return match ? match[1].trim() : 'Generic error';
}

function buildServiceCorrelations(results: LogAnalysisResult[]): Array<{from: string; to: string; strength: number}> {
  // Simple correlation analysis - in practice would be more sophisticated
  const serviceConnections: Array<{from: string; to: string; strength: number}> = [];
  
  // This is a simplified implementation - real correlation analysis would be more complex
  const services = Array.from(new Set(results.map(r => r.service)));
  
  services.forEach(serviceA => {
    services.forEach(serviceB => {
      if (serviceA !== serviceB) {
        const correlatedEvents = results.filter(r => 
          r.correlationId && 
          results.some(r2 => 
            r2.correlationId === r.correlationId && 
            r2.service === serviceB &&
            r.service === serviceA
          )
        ).length;
        
        if (correlatedEvents > 0) {
          serviceConnections.push({
            from: serviceA,
            to: serviceB,
            strength: correlatedEvents,
          });
        }
      }
    });
  });
  
  return serviceConnections.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

// Global variable to track warm starts
declare global {
  var isWarm: boolean;
}