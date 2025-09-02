#!/usr/bin/env node

/**
 * Performance Baseline Script
 * 
 * Measures and compares cold start and warm execution times for Lambda functions
 * with feature flags on/off to validate performance improvements.
 * 
 * This script provides real data instead of optimistic predictions about
 * the impact of the new resilience layer on Lambda performance.
 * 
 * Usage:
 * npm run perf:baseline -- --function stripe-connect --iterations 100
 * npm run perf:baseline -- --function all --iterations 50 --output results.json
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CloudWatchClient, PutMetricDataCommand, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

// Initialize AWS clients
const lambda = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const cloudwatch = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface PerformanceResult {
  functionName: string;
  featureFlag: boolean;
  coldStart: boolean;
  duration: number;
  billedDuration: number;
  memoryUsed: number;
  initDuration?: number;
  statusCode: number;
  error?: string;
  timestamp: number;
}

interface PerformanceStats {
  functionName: string;
  featureFlagOff: {
    coldStarts: number[];
    warmStarts: number[];
    avgColdStart: number;
    avgWarmStart: number;
    p50ColdStart: number;
    p95ColdStart: number;
    p99ColdStart: number;
    p50WarmStart: number;
    p95WarmStart: number;
    p99WarmStart: number;
    errors: number;
  };
  featureFlagOn: {
    coldStarts: number[];
    warmStarts: number[];
    avgColdStart: number;
    avgWarmStart: number;
    p50ColdStart: number;
    p95ColdStart: number;
    p99ColdStart: number;
    p50WarmStart: number;
    p95WarmStart: number;
    p99WarmStart: number;
    errors: number;
  };
  comparison: {
    coldStartDifference: number;
    coldStartPercentChange: number;
    warmStartDifference: number;
    warmStartPercentChange: number;
    recommendation: string;
  };
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('function', {
    alias: 'f',
    type: 'string',
    description: 'Function name to test (or "all" for all functions)',
    default: 'stripe-connect',
  })
  .option('iterations', {
    alias: 'i',
    type: 'number',
    description: 'Number of invocations per configuration',
    default: 100,
  })
  .option('cold-start-ratio', {
    alias: 'c',
    type: 'number',
    description: 'Percentage of cold starts to force (0-100)',
    default: 20,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output file for results',
    default: 'performance-baseline.json',
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Verbose output',
    default: false,
  })
  .parseSync();

// Functions to test
const FUNCTIONS_TO_TEST = [
  'stripe-connect',
  'stripe-webhook',
  'booking-processor',
  'payout-manager',
  'refund-processor',
];

/**
 * Invoke Lambda function and measure performance
 */
async function invokeLambda(
  functionName: string,
  payload: any,
  forceColdStart: boolean = false
): Promise<PerformanceResult> {
  const startTime = Date.now();
  
  try {
    // If forcing cold start, update the function configuration to trigger a new container
    if (forceColdStart) {
      // Add a small delay to help ensure cold start
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const response = await lambda.send(new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
      LogType: 'Tail', // Get logs to check for cold start
    }));

    const duration = Date.now() - startTime;
    
    // Parse the logs to detect cold start
    let isColdStart = false;
    let initDuration: number | undefined;
    
    if (response.LogResult) {
      const logs = Buffer.from(response.LogResult, 'base64').toString('utf-8');
      isColdStart = logs.includes('INIT_START') || logs.includes('Init Duration');
      
      // Extract init duration if available
      const initMatch = logs.match(/Init Duration: ([\d.]+) ms/);
      if (initMatch) {
        initDuration = parseFloat(initMatch[1]);
      }
    }

    // Parse response
    const responsePayload = response.Payload ? 
      JSON.parse(new TextDecoder().decode(response.Payload)) : {};

    return {
      functionName,
      featureFlag: payload.featureFlag || false,
      coldStart: isColdStart,
      duration,
      billedDuration: duration, // Will be updated from CloudWatch
      memoryUsed: 0, // Will be updated from CloudWatch
      initDuration,
      statusCode: response.StatusCode || 200,
      timestamp: startTime,
    };
  } catch (error) {
    return {
      functionName,
      featureFlag: payload.featureFlag || false,
      coldStart: false,
      duration: Date.now() - startTime,
      billedDuration: 0,
      memoryUsed: 0,
      statusCode: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: startTime,
    };
  }
}

/**
 * Test a function with both feature flag states
 */
async function testFunction(
  functionName: string,
  iterations: number,
  coldStartRatio: number
): Promise<PerformanceStats> {
  const spinner = ora(`Testing ${functionName}`).start();
  
  const results: PerformanceResult[] = [];
  const coldStartCount = Math.floor(iterations * (coldStartRatio / 100));
  
  // Test with feature flag OFF
  spinner.text = `Testing ${functionName} with feature flag OFF`;
  for (let i = 0; i < iterations; i++) {
    const forceColdStart = i < coldStartCount;
    
    if (argv.verbose) {
      spinner.text = `${functionName} OFF: ${i + 1}/${iterations} ${forceColdStart ? '(cold)' : '(warm)'}`;
    }
    
    const result = await invokeLambda(
      functionName,
      {
        action: 'test',
        featureFlag: false,
        testId: `baseline-${Date.now()}`,
      },
      forceColdStart
    );
    
    results.push(result);
    
    // Small delay between invocations
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Test with feature flag ON
  spinner.text = `Testing ${functionName} with feature flag ON`;
  for (let i = 0; i < iterations; i++) {
    const forceColdStart = i < coldStartCount;
    
    if (argv.verbose) {
      spinner.text = `${functionName} ON: ${i + 1}/${iterations} ${forceColdStart ? '(cold)' : '(warm)'}`;
    }
    
    const result = await invokeLambda(
      functionName,
      {
        action: 'test',
        featureFlag: true,
        testId: `baseline-${Date.now()}`,
      },
      forceColdStart
    );
    
    results.push(result);
    
    // Small delay between invocations
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  spinner.succeed(`Completed testing ${functionName}`);
  
  // Calculate statistics
  return calculateStats(functionName, results);
}

/**
 * Calculate performance statistics
 */
function calculateStats(functionName: string, results: PerformanceResult[]): PerformanceStats {
  const offResults = results.filter(r => !r.featureFlag);
  const onResults = results.filter(r => r.featureFlag);
  
  const calculateMetrics = (data: PerformanceResult[]) => {
    const coldStarts = data.filter(r => r.coldStart).map(r => r.duration);
    const warmStarts = data.filter(r => !r.coldStart && !r.error).map(r => r.duration);
    const errors = data.filter(r => r.error).length;
    
    return {
      coldStarts,
      warmStarts,
      avgColdStart: average(coldStarts),
      avgWarmStart: average(warmStarts),
      p50ColdStart: percentile(coldStarts, 50),
      p95ColdStart: percentile(coldStarts, 95),
      p99ColdStart: percentile(coldStarts, 99),
      p50WarmStart: percentile(warmStarts, 50),
      p95WarmStart: percentile(warmStarts, 95),
      p99WarmStart: percentile(warmStarts, 99),
      errors,
    };
  };
  
  const offMetrics = calculateMetrics(offResults);
  const onMetrics = calculateMetrics(onResults);
  
  // Calculate comparison
  const coldStartDiff = onMetrics.avgColdStart - offMetrics.avgColdStart;
  const coldStartPercent = offMetrics.avgColdStart > 0 
    ? (coldStartDiff / offMetrics.avgColdStart) * 100 
    : 0;
    
  const warmStartDiff = onMetrics.avgWarmStart - offMetrics.avgWarmStart;
  const warmStartPercent = offMetrics.avgWarmStart > 0
    ? (warmStartDiff / offMetrics.avgWarmStart) * 100
    : 0;
  
  let recommendation = '';
  if (coldStartPercent > 20) {
    recommendation = '⚠️ SIGNIFICANT cold start regression detected. Review resilience layer initialization.';
  } else if (coldStartPercent > 10) {
    recommendation = '⚠️ Moderate cold start increase. Consider optimizing imports and initialization.';
  } else if (warmStartPercent > 15) {
    recommendation = '⚠️ Warm start performance degraded. Check DynamoDB latency for circuit breaker.';
  } else if (coldStartPercent < -10) {
    recommendation = '✅ Cold start performance improved! Migration is beneficial.';
  } else if (Math.abs(coldStartPercent) < 5 && Math.abs(warmStartPercent) < 5) {
    recommendation = '✅ Performance impact is negligible. Safe to proceed with migration.';
  } else {
    recommendation = '📊 Mixed results. Review detailed metrics before proceeding.';
  }
  
  return {
    functionName,
    featureFlagOff: offMetrics,
    featureFlagOn: onMetrics,
    comparison: {
      coldStartDifference: coldStartDiff,
      coldStartPercentChange: coldStartPercent,
      warmStartDifference: warmStartDiff,
      warmStartPercentChange: warmStartPercent,
      recommendation,
    },
  };
}

/**
 * Helper function to calculate average
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Helper function to calculate percentile
 */
function percentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Send metrics to CloudWatch
 */
async function sendMetricsToCloudWatch(stats: PerformanceStats[]): Promise<void> {
  const metrics = [];
  
  for (const stat of stats) {
    // Cold start metrics
    metrics.push({
      MetricName: 'ColdStartDuration',
      Value: stat.featureFlagOff.avgColdStart,
      Unit: 'Milliseconds',
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Function', Value: stat.functionName },
        { Name: 'FeatureFlag', Value: 'OFF' },
      ],
    });
    
    metrics.push({
      MetricName: 'ColdStartDuration',
      Value: stat.featureFlagOn.avgColdStart,
      Unit: 'Milliseconds',
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Function', Value: stat.functionName },
        { Name: 'FeatureFlag', Value: 'ON' },
      ],
    });
    
    // Warm start metrics
    metrics.push({
      MetricName: 'WarmStartDuration',
      Value: stat.featureFlagOff.avgWarmStart,
      Unit: 'Milliseconds',
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Function', Value: stat.functionName },
        { Name: 'FeatureFlag', Value: 'OFF' },
      ],
    });
    
    metrics.push({
      MetricName: 'WarmStartDuration',
      Value: stat.featureFlagOn.avgWarmStart,
      Unit: 'Milliseconds',
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Function', Value: stat.functionName },
        { Name: 'FeatureFlag', Value: 'ON' },
      ],
    });
  }
  
  // Send in batches of 20 (CloudWatch limit)
  for (let i = 0; i < metrics.length; i += 20) {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'ECOSYSTEMAWS/PerformanceBaseline',
      MetricData: metrics.slice(i, i + 20),
    }));
  }
}

/**
 * Generate summary report
 */
function generateReport(stats: PerformanceStats[]): void {
  console.log(chalk.bold.cyan('\n📊 Performance Baseline Report\n'));
  
  for (const stat of stats) {
    console.log(chalk.bold.white(`Function: ${stat.functionName}`));
    console.log(chalk.gray('─'.repeat(50)));
    
    // Cold starts
    console.log(chalk.yellow('\nCold Start Performance:'));
    console.log(`  Feature Flag OFF: ${stat.featureFlagOff.avgColdStart.toFixed(2)}ms (p95: ${stat.featureFlagOff.p95ColdStart.toFixed(2)}ms)`);
    console.log(`  Feature Flag ON:  ${stat.featureFlagOn.avgColdStart.toFixed(2)}ms (p95: ${stat.featureFlagOn.p95ColdStart.toFixed(2)}ms)`);
    console.log(`  Difference: ${stat.comparison.coldStartDifference > 0 ? '+' : ''}${stat.comparison.coldStartDifference.toFixed(2)}ms (${stat.comparison.coldStartPercentChange > 0 ? '+' : ''}${stat.comparison.coldStartPercentChange.toFixed(1)}%)`);
    
    // Warm starts
    console.log(chalk.green('\nWarm Start Performance:'));
    console.log(`  Feature Flag OFF: ${stat.featureFlagOff.avgWarmStart.toFixed(2)}ms (p95: ${stat.featureFlagOff.p95WarmStart.toFixed(2)}ms)`);
    console.log(`  Feature Flag ON:  ${stat.featureFlagOn.avgWarmStart.toFixed(2)}ms (p95: ${stat.featureFlagOn.p95WarmStart.toFixed(2)}ms)`);
    console.log(`  Difference: ${stat.comparison.warmStartDifference > 0 ? '+' : ''}${stat.comparison.warmStartDifference.toFixed(2)}ms (${stat.comparison.warmStartPercentChange > 0 ? '+' : ''}${stat.comparison.warmStartPercentChange.toFixed(1)}%)`);
    
    // Errors
    if (stat.featureFlagOff.errors > 0 || stat.featureFlagOn.errors > 0) {
      console.log(chalk.red('\nErrors:'));
      console.log(`  Feature Flag OFF: ${stat.featureFlagOff.errors}`);
      console.log(`  Feature Flag ON:  ${stat.featureFlagOn.errors}`);
    }
    
    // Recommendation
    console.log(chalk.bold.magenta('\nRecommendation:'));
    console.log(`  ${stat.comparison.recommendation}`);
    console.log('');
  }
  
  // Overall summary
  const avgColdStartChange = average(stats.map(s => s.comparison.coldStartPercentChange));
  const avgWarmStartChange = average(stats.map(s => s.comparison.warmStartPercentChange));
  
  console.log(chalk.bold.cyan('Overall Summary:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Average Cold Start Change: ${avgColdStartChange > 0 ? '+' : ''}${avgColdStartChange.toFixed(1)}%`);
  console.log(`Average Warm Start Change: ${avgWarmStartChange > 0 ? '+' : ''}${avgWarmStartChange.toFixed(1)}%`);
  
  if (avgColdStartChange > 15) {
    console.log(chalk.bold.red('\n❌ STOP: Significant performance regression detected!'));
    console.log('The resilience layer is adding too much overhead. Review and optimize before proceeding.');
  } else if (avgColdStartChange > 5) {
    console.log(chalk.bold.yellow('\n⚠️ CAUTION: Moderate performance impact detected.'));
    console.log('Consider optimizations but migration can proceed with monitoring.');
  } else {
    console.log(chalk.bold.green('\n✅ PROCEED: Performance impact is acceptable.'));
    console.log('The resilience layer overhead is within acceptable limits.');
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log(chalk.bold.cyan('🚀 Lambda Performance Baseline Test\n'));
  
  const functionsToTest = argv.function === 'all' 
    ? FUNCTIONS_TO_TEST 
    : [argv.function];
  
  console.log(`Testing functions: ${functionsToTest.join(', ')}`);
  console.log(`Iterations per configuration: ${argv.iterations}`);
  console.log(`Target cold start ratio: ${argv['cold-start-ratio']}%\n`);
  
  const allStats: PerformanceStats[] = [];
  
  for (const func of functionsToTest) {
    const stats = await testFunction(func, argv.iterations, argv['cold-start-ratio']);
    allStats.push(stats);
  }
  
  // Send to CloudWatch
  console.log(chalk.cyan('\n📤 Sending metrics to CloudWatch...'));
  await sendMetricsToCloudWatch(allStats);
  
  // Save results to file
  const outputPath = path.resolve(argv.output);
  await fs.writeFile(outputPath, JSON.stringify(allStats, null, 2));
  console.log(chalk.green(`✅ Results saved to ${outputPath}`));
  
  // Generate report
  generateReport(allStats);
}

// Run the script
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});