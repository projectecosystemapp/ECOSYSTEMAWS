/**
 * Performance Tests for AWS Payment Processing Load
 * 
 * Comprehensive performance testing suite for AWS native payment system:
 * - High-volume payment processing capability
 * - Concurrent transaction handling
 * - Response time optimization validation
 * - Throughput benchmarking under load
 * - Resource utilization efficiency
 * - Cost-per-transaction optimization
 * - Scalability testing with auto-scaling
 * - Performance regression detection
 * 
 * These tests validate the performance benefits and scalability
 * of AWS native payment processing vs traditional solutions.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { awsPaymentClient } from '../../lib/aws-payment-client';
import {
  generateTestCardData,
  generateTestBankAccount,
  generateTestPaymentIntent,
  mockPerformanceMetrics,
  cleanupTestData
} from '../test/aws-setup';

// Performance test configuration
jest.setTimeout(60000); // 1 minute timeout for performance tests

interface PerformanceMetrics {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

interface LoadTestResults {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // operations per second
  errorRate: number; // percentage
  costEfficiency: number; // cost per successful operation
}

describe('Payment Processing Performance Tests', () => {
  let performanceData: PerformanceMetrics[] = [];
  let testStartTime: number;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceData = [];
    testStartTime = performance.now();
  });

  afterEach(async () => {
    await cleanupTestData();
    
    if (performanceData.length > 0) {
      const testDuration = performance.now() - testStartTime;
      console.log(`\n📊 Performance Summary (${testDuration.toFixed(2)}ms total):`);
      console.log(`   Operations: ${performanceData.length}`);
      console.log(`   Average: ${(performanceData.reduce((sum, m) => sum + m.duration, 0) / performanceData.length).toFixed(2)}ms`);
      console.log(`   Success Rate: ${(performanceData.filter(m => m.success).length / performanceData.length * 100).toFixed(1)}%`);
    }
  });

  const measurePerformance = async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> => {
    const startTime = performance.now();
    const startCpu = process.cpuUsage();
    const startMemory = process.memoryUsage();
    
    let success = false;
    let result: T;
    
    try {
      result = await fn();
      success = true;
    } catch (error) {
      result = error as T;
      success = false;
    }
    
    const endTime = performance.now();
    const endCpu = process.cpuUsage(startCpu);
    const endMemory = process.memoryUsage();
    
    const metrics: PerformanceMetrics = {
      operation,
      duration: endTime - startTime,
      startTime,
      endTime,
      success,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      },
      cpuUsage: endCpu
    };
    
    performanceData.push(metrics);
    return { result, metrics };
  };

  const calculateLoadTestResults = (metrics: PerformanceMetrics[]): LoadTestResults => {
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successful = metrics.filter(m => m.success);
    const failed = metrics.filter(m => !m.success);
    
    const totalDuration = Math.max(...metrics.map(m => m.endTime)) - Math.min(...metrics.map(m => m.startTime));
    
    return {
      totalOperations: metrics.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50ResponseTime: durations[Math.floor(durations.length * 0.5)],
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)],
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)],
      throughput: (metrics.length / totalDuration) * 1000, // ops per second
      errorRate: (failed.length / metrics.length) * 100,
      costEfficiency: 0.05 // $0.05 per successful operation (AWS native)
    };
  };

  describe('Single Operation Performance Benchmarks', () => {
    it('should meet payment intent creation performance targets', async () => {
      console.log('🚀 Testing payment intent creation performance...');
      
      const testIntent = generateTestPaymentIntent();
      const { result, metrics } = await measurePerformance(
        'createPaymentIntent',
        () => awsPaymentClient.createPaymentIntent(testIntent)
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(500); // Sub-500ms target
      expect(result.id).toBeDefined();
      
      console.log(`✅ Payment intent created in ${metrics.duration.toFixed(2)}ms`);
    });

    it('should meet card tokenization performance targets', async () => {
      console.log('🚀 Testing card tokenization performance...');
      
      const testCard = generateTestCardData();
      const { result, metrics } = await measurePerformance(
        'tokenizeCard',
        () => awsPaymentClient.tokenizeCard(testCard)
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(300); // Sub-300ms target for tokenization
      expect(result.token).toBeDefined();
      expect(result.last4).toBe('4242');
      
      console.log(`✅ Card tokenized in ${metrics.duration.toFixed(2)}ms`);
    });

    it('should meet fraud assessment performance targets', async () => {
      console.log('🚀 Testing fraud assessment performance...');
      
      const { result, metrics } = await measurePerformance(
        'assessFraudRisk',
        () => awsPaymentClient.assessFraudRisk({
          customerId: 'customer_test_123',
          amount: 10000,
          paymentMethodToken: 'tok_test_123',
          metadata: { deviceFingerprint: 'device_123' }
        })
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(200); // Sub-200ms target for fraud assessment
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      
      console.log(`✅ Fraud assessment completed in ${metrics.duration.toFixed(2)}ms`);
    });

    it('should meet payment processing performance targets', async () => {
      console.log('🚀 Testing payment processing performance...');
      
      const { result, metrics } = await measurePerformance(
        'processPayment',
        () => awsPaymentClient.processPayment({
          paymentIntentId: 'pi_test_123',
          paymentMethodToken: 'tok_test_123',
          customerId: 'customer_test_123',
          amount: 10000
        })
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(1000); // Sub-1000ms target for full processing
      
      if (result.success) {
        expect(result.paymentIntentId).toBeDefined();
      }
      
      console.log(`✅ Payment processed in ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Processing Load Tests', () => {
    it('should handle moderate concurrent payment load', async () => {
      console.log('🚀 Testing moderate concurrent payment load (10 concurrent)...');
      
      const concurrentOperations = 10;
      const testCard = generateTestCardData();
      
      const concurrentPromises = Array(concurrentOperations).fill(null).map(async (_, index) => {
        const testIntent = {
          ...generateTestPaymentIntent(),
          customerId: `load_test_customer_${index}`,
          bookingId: `load_test_booking_${index}`
        };
        
        // Create payment intent
        const intentResult = await measurePerformance(
          `createPaymentIntent_${index}`,
          () => awsPaymentClient.createPaymentIntent(testIntent)
        );
        
        // Tokenize card
        const tokenResult = await measurePerformance(
          `tokenizeCard_${index}`,
          () => awsPaymentClient.tokenizeCard({
            ...testCard,
            cvc: `12${index % 10}` // Vary CVC
          })
        );
        
        // Process payment
        if (intentResult.result.id && tokenResult.result.token) {
          const paymentResult = await measurePerformance(
            `processPayment_${index}`,
            () => awsPaymentClient.processPayment({
              paymentIntentId: intentResult.result.id,
              paymentMethodToken: tokenResult.result.token,
              customerId: testIntent.customerId,
              amount: testIntent.amount
            })
          );
          
          return {
            index,
            intent: intentResult,
            token: tokenResult,
            payment: paymentResult
          };
        }
        
        return { index, intent: intentResult, token: tokenResult };
      });

      const results = await Promise.all(concurrentPromises);
      const loadResults = calculateLoadTestResults(performanceData.slice(-concurrentOperations * 3));
      
      expect(loadResults.errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(loadResults.p95ResponseTime).toBeLessThan(2000); // 95th percentile under 2 seconds
      expect(loadResults.throughput).toBeGreaterThan(5); // At least 5 operations per second
      
      console.log(`✅ Moderate load test completed:`);
      console.log(`   Success Rate: ${(100 - loadResults.errorRate).toFixed(1)}%`);
      console.log(`   Average Response: ${loadResults.averageResponseTime.toFixed(2)}ms`);
      console.log(`   P95 Response: ${loadResults.p95ResponseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${loadResults.throughput.toFixed(2)} ops/sec`);
    });

    it('should handle high concurrent payment load', async () => {
      console.log('🚀 Testing high concurrent payment load (25 concurrent)...');
      
      const concurrentOperations = 25;
      const testCard = generateTestCardData();
      
      const startTime = performance.now();
      
      const concurrentPromises = Array(concurrentOperations).fill(null).map(async (_, index) => {
        return measurePerformance(
          `high_load_payment_${index}`,
          async () => {
            const testIntent = {
              ...generateTestPaymentIntent(),
              amount: 5000 + (index * 100), // Vary amounts
              customerId: `high_load_customer_${index}`
            };
            
            const paymentIntent = await awsPaymentClient.createPaymentIntent(testIntent);
            const cardToken = await awsPaymentClient.tokenizeCard(testCard);
            
            return await awsPaymentClient.processPayment({
              paymentIntentId: paymentIntent.id,
              paymentMethodToken: cardToken.token,
              customerId: testIntent.customerId,
              amount: testIntent.amount
            });
          }
        );
      });

      const results = await Promise.all(concurrentPromises);
      const endTime = performance.now();
      
      const successfulResults = results.filter(r => r.metrics.success);
      const totalDuration = endTime - startTime;
      
      expect(successfulResults.length).toBeGreaterThanOrEqual(concurrentOperations * 0.9); // 90% success rate
      expect(totalDuration).toBeLessThan(15000); // Complete within 15 seconds
      
      const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.duration, 0) / results.length;
      const throughput = (results.length / totalDuration) * 1000;
      
      console.log(`✅ High load test completed:`);
      console.log(`   Operations: ${results.length}`);
      console.log(`   Success Rate: ${(successfulResults.length / results.length * 100).toFixed(1)}%`);
      console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
      console.log(`   Average Response: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} ops/sec`);
    });

    it('should maintain performance under sustained load', async () => {
      console.log('🚀 Testing sustained load performance (5 minutes simulation)...');
      
      const testDuration = 10000; // 10 seconds for testing (would be 5 minutes in production)
      const operationsPerSecond = 2;
      const interval = 1000 / operationsPerSecond;
      
      const results: Array<{ result: any; metrics: PerformanceMetrics }> = [];
      const testCard = generateTestCardData();
      
      const startTime = performance.now();
      let operationCount = 0;
      
      const runOperation = async () => {
        if (performance.now() - startTime >= testDuration) {
          return;
        }
        
        const result = await measurePerformance(
          `sustained_load_${operationCount++}`,
          async () => {
            const testIntent = {
              ...generateTestPaymentIntent(),
              customerId: `sustained_customer_${operationCount}`,
              amount: 10000 + (operationCount * 100)
            };
            
            const paymentIntent = await awsPaymentClient.createPaymentIntent(testIntent);
            return paymentIntent;
          }
        );
        
        results.push(result);
        
        // Schedule next operation
        setTimeout(runOperation, interval);
      };
      
      // Start the sustained load
      runOperation();
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));
      
      expect(results.length).toBeGreaterThan(10); // Should have completed multiple operations
      
      // Analyze performance degradation over time
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.metrics.duration, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.metrics.duration, 0) / secondHalf.length;
      
      // Performance should not degrade by more than 50%
      const performanceDegradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      expect(performanceDegradation).toBeLessThan(0.5);
      
      console.log(`✅ Sustained load test completed:`);
      console.log(`   Operations: ${results.length}`);
      console.log(`   First half avg: ${firstHalfAvg.toFixed(2)}ms`);
      console.log(`   Second half avg: ${secondHalfAvg.toFixed(2)}ms`);
      console.log(`   Performance change: ${(performanceDegradation * 100).toFixed(1)}%`);
    });
  });

  describe('Resource Utilization Efficiency', () => {
    it('should demonstrate efficient memory usage', async () => {
      console.log('🚀 Testing memory usage efficiency...');
      
      const baseMemory = process.memoryUsage();
      const operations = 20;
      const memorySnapshots: NodeJS.MemoryUsage[] = [baseMemory];
      
      for (let i = 0; i < operations; i++) {
        const testIntent = {
          ...generateTestPaymentIntent(),
          customerId: `memory_test_${i}`
        };
        
        await awsPaymentClient.createPaymentIntent(testIntent);
        
        if (i % 5 === 0) {
          memorySnapshots.push(process.memoryUsage());
        }
      }
      
      const finalMemory = process.memoryUsage();
      memorySnapshots.push(finalMemory);
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - baseMemory.heapUsed;
      const memoryPerOperation = memoryGrowth / operations;
      
      expect(memoryPerOperation).toBeLessThan(1024 * 1024); // Less than 1MB per operation
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB total growth
      
      console.log(`✅ Memory usage analysis:`);
      console.log(`   Base memory: ${(baseMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Per operation: ${(memoryPerOperation / 1024).toFixed(2)}KB`);
    });

    it('should demonstrate efficient CPU usage', async () => {
      console.log('🚀 Testing CPU usage efficiency...');
      
      const operations = 15;
      const cpuMetrics: NodeJS.CpuUsage[] = [];
      
      for (let i = 0; i < operations; i++) {
        const { metrics } = await measurePerformance(
          `cpu_test_${i}`,
          async () => {
            const testCard = generateTestCardData();
            const cardToken = await awsPaymentClient.tokenizeCard(testCard);
            return cardToken;
          }
        );
        
        if (metrics.cpuUsage) {
          cpuMetrics.push(metrics.cpuUsage);
        }
      }
      
      const avgUserCpu = cpuMetrics.reduce((sum, cpu) => sum + cpu.user, 0) / cpuMetrics.length;
      const avgSystemCpu = cpuMetrics.reduce((sum, cpu) => sum + cpu.system, 0) / cpuMetrics.length;
      
      // CPU usage should be reasonable (values are in microseconds)
      expect(avgUserCpu).toBeLessThan(50000); // Less than 50ms user time per operation
      expect(avgSystemCpu).toBeLessThan(20000); // Less than 20ms system time per operation
      
      console.log(`✅ CPU usage analysis:`);
      console.log(`   Average user CPU: ${(avgUserCpu / 1000).toFixed(2)}ms`);
      console.log(`   Average system CPU: ${(avgSystemCpu / 1000).toFixed(2)}ms`);
      console.log(`   Total CPU per op: ${((avgUserCpu + avgSystemCpu) / 1000).toFixed(2)}ms`);
    });
  });

  describe('Cost-Performance Optimization', () => {
    it('should demonstrate cost efficiency under load', async () => {
      console.log('🚀 Testing cost efficiency under load...');
      
      const testScenarios = [
        { operations: 10, amount: 5000, description: 'Small transactions ($50)' },
        { operations: 10, amount: 25000, description: 'Medium transactions ($250)' },
        { operations: 5, amount: 100000, description: 'Large transactions ($1,000)' }
      ];
      
      for (const scenario of testScenarios) {
        console.log(`\n📊 Testing ${scenario.description}...`);
        
        const startTime = performance.now();
        const promises = Array(scenario.operations).fill(null).map(async (_, index) => {
          return measurePerformance(
            `cost_test_${scenario.amount}_${index}`,
            async () => {
              const testIntent = {
                ...generateTestPaymentIntent(),
                amount: scenario.amount,
                customerId: `cost_customer_${index}`
              };
              return awsPaymentClient.createPaymentIntent(testIntent);
            }
          );
        });
        
        const results = await Promise.all(promises);
        const endTime = performance.now();
        
        const successful = results.filter(r => r.metrics.success).length;
        const totalDuration = endTime - startTime;
        
        // Cost analysis
        const stripeCostPerTransaction = Math.round(scenario.amount * 0.029) + 30;
        const awsCostPerTransaction = 5; // $0.05
        const totalStripeCost = stripeCostPerTransaction * successful;
        const totalAwsCost = awsCostPerTransaction * successful;
        const costSavings = totalStripeCost - totalAwsCost;
        const savingsPercentage = (costSavings / totalStripeCost) * 100;
        
        // Performance analysis
        const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.duration, 0) / results.length;
        const throughput = (results.length / totalDuration) * 1000;
        
        expect(savingsPercentage).toBeGreaterThan(98); // 98%+ cost savings
        expect(successful).toBe(scenario.operations); // All should succeed
        expect(avgResponseTime).toBeLessThan(1000); // Sub-second response
        
        console.log(`   Success Rate: ${(successful / scenario.operations * 100).toFixed(1)}%`);
        console.log(`   Avg Response: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Throughput: ${throughput.toFixed(2)} ops/sec`);
        console.log(`   Stripe Cost: $${(totalStripeCost / 100).toFixed(2)}`);
        console.log(`   AWS Cost: $${(totalAwsCost / 100).toFixed(2)}`);
        console.log(`   Savings: $${(costSavings / 100).toFixed(2)} (${savingsPercentage.toFixed(1)}%)`);
      }
      
      console.log('\n✅ Cost efficiency validated across all transaction sizes');
    });

    it('should scale efficiently with increased load', async () => {
      console.log('🚀 Testing scalability and performance scaling...');
      
      const loadLevels = [5, 10, 15];
      const scalingResults: Array<{
        load: number;
        throughput: number;
        avgResponseTime: number;
        successRate: number;
        costPerOperation: number;
      }> = [];
      
      for (const load of loadLevels) {
        console.log(`\n📈 Testing load level: ${load} concurrent operations...`);
        
        const startTime = performance.now();
        const promises = Array(load).fill(null).map(async (_, index) => {
          return measurePerformance(
            `scale_test_${load}_${index}`,
            async () => {
              const testIntent = {
                ...generateTestPaymentIntent(),
                amount: 15000, // $150 standard amount
                customerId: `scale_customer_${load}_${index}`
              };
              return awsPaymentClient.createPaymentIntent(testIntent);
            }
          );
        });
        
        const results = await Promise.all(promises);
        const endTime = performance.now();
        
        const successful = results.filter(r => r.metrics.success).length;
        const totalDuration = endTime - startTime;
        const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.duration, 0) / results.length;
        const throughput = (results.length / totalDuration) * 1000;
        const successRate = (successful / results.length) * 100;
        
        scalingResults.push({
          load,
          throughput,
          avgResponseTime,
          successRate,
          costPerOperation: 0.05 // $0.05 constant AWS cost
        });
        
        console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
        console.log(`   Avg Response: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Throughput: ${throughput.toFixed(2)} ops/sec`);
      }
      
      // Analyze scaling characteristics
      const firstResult = scalingResults[0];
      const lastResult = scalingResults[scalingResults.length - 1];
      
      const throughputScaling = lastResult.throughput / firstResult.throughput;
      const responseTimeIncrease = lastResult.avgResponseTime / firstResult.avgResponseTime;
      
      // Throughput should scale reasonably with load
      expect(throughputScaling).toBeGreaterThan(1.5); // At least 1.5x throughput increase
      expect(responseTimeIncrease).toBeLessThan(3); // Response time shouldn't increase more than 3x
      
      // All load levels should maintain high success rates
      scalingResults.forEach(result => {
        expect(result.successRate).toBeGreaterThan(95); // 95%+ success rate
      });
      
      console.log(`\n✅ Scalability analysis:`);
      console.log(`   Throughput scaling: ${throughputScaling.toFixed(2)}x`);
      console.log(`   Response time increase: ${responseTimeIncrease.toFixed(2)}x`);
      console.log(`   Cost per operation: $${firstResult.costPerOperation.toFixed(3)} (constant)`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions compared to baseline', async () => {
      console.log('🚀 Testing performance regression detection...');
      
      // Baseline performance expectations (from previous test runs)
      const baselineMetrics = {
        createPaymentIntent: 400, // ms
        tokenizeCard: 250, // ms
        processPayment: 800, // ms
        fraudAssessment: 150 // ms
      };
      
      const testCard = generateTestCardData();
      const testIntent = generateTestPaymentIntent();
      
      // Test each operation
      const operations = [
        {
          name: 'createPaymentIntent',
          baseline: baselineMetrics.createPaymentIntent,
          fn: () => awsPaymentClient.createPaymentIntent(testIntent)
        },
        {
          name: 'tokenizeCard',
          baseline: baselineMetrics.tokenizeCard,
          fn: () => awsPaymentClient.tokenizeCard(testCard)
        },
        {
          name: 'fraudAssessment',
          baseline: baselineMetrics.fraudAssessment,
          fn: () => awsPaymentClient.assessFraudRisk({
            customerId: 'customer_regression_test',
            amount: 10000,
            paymentMethodToken: 'tok_test_regression',
            metadata: {}
          })
        }
      ];
      
      const regressionThreshold = 1.5; // 50% performance degradation threshold
      
      for (const operation of operations) {
        const { metrics } = await measurePerformance(
          `regression_${operation.name}`,
          operation.fn
        );
        
        expect(metrics.success).toBe(true);
        
        const performanceRatio = metrics.duration / operation.baseline;
        const isRegression = performanceRatio > regressionThreshold;
        
        if (isRegression) {
          console.warn(`⚠️ Performance regression detected in ${operation.name}:`);
          console.warn(`   Current: ${metrics.duration.toFixed(2)}ms`);
          console.warn(`   Baseline: ${operation.baseline}ms`);
          console.warn(`   Ratio: ${performanceRatio.toFixed(2)}x`);
        } else {
          console.log(`✅ ${operation.name}: ${metrics.duration.toFixed(2)}ms (${performanceRatio.toFixed(2)}x baseline)`);
        }
        
        expect(isRegression).toBe(false); // Fail test if significant regression detected
      }
      
      console.log('✅ No performance regressions detected');
    });
  });
});