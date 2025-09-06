import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { performance } from 'perf_hooks';

// Performance testing for AWS native payment system
describe('Payment System Load Tests', () => {
  let client: any;
  const TEST_TIMEOUT = 300000; // 5 minutes for load tests

  beforeAll(async () => {
    client = generateClient<Schema>();
  }, TEST_TIMEOUT);

  describe('Throughput Testing', () => {
    it('should handle 10,000 TPS payment processing', async () => {
      const targetTPS = 10000; // 10K transactions per second
      const testDuration = 10; // 10 seconds
      const totalTransactions = targetTPS * testDuration;
      
      console.log(`Starting load test: ${totalTransactions} transactions over ${testDuration} seconds`);
      
      // Generate test payments
      const payments = Array.from({ length: totalTransactions }, (_, i) => ({
        customerId: `load-customer-${i}`,
        providerId: `load-provider-${Math.floor(i / 100)}`, // 100 payments per provider
        amount: 5000 + (i % 20000), // $50-$250 range
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123',
        metadata: {
          testRun: 'load-test-10k-tps',
          batchId: Math.floor(i / 1000)
        }
      }));

      const startTime = performance.now();
      
      // Process payments in batches to manage memory and connections
      const batchSize = 1000;
      const batches = [];
      
      for (let i = 0; i < payments.length; i += batchSize) {
        batches.push(payments.slice(i, i + batchSize));
      }

      const results = [];
      let processedCount = 0;

      // Process batches concurrently but with controlled concurrency
      const processBatch = async (batch: any[]) => {
        const batchPromises = batch.map(async (payment) => {
          try {
            const result = await client.mutations.processPayment({
              action: 'process_payment',
              ...payment
            });
            processedCount++;
            
            if (processedCount % 1000 === 0) {
              console.log(`Processed ${processedCount}/${totalTransactions} payments`);
            }
            
            return result;
          } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        return Promise.allSettled(batchPromises);
      };

      // Process up to 10 batches concurrently
      const maxConcurrentBatches = 10;
      for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
        const concurrentBatches = batches.slice(i, i + maxConcurrentBatches);
        const batchResults = await Promise.all(concurrentBatches.map(processBatch));
        results.push(...batchResults.flat());
      }

      const endTime = performance.now();
      const actualDuration = (endTime - startTime) / 1000; // Convert to seconds

      // Analyze results
      const successful = results.filter(r => 
        r.status === 'fulfilled' && 
        (r as any).value.data?.success === true
      ).length;

      const failed = results.length - successful;
      const actualTPS = successful / actualDuration;
      const successRate = (successful / results.length) * 100;

      console.log(`\nLoad Test Results:`);
      console.log(`Total transactions: ${results.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);
      console.log(`Duration: ${actualDuration.toFixed(2)} seconds`);
      console.log(`Actual TPS: ${actualTPS.toFixed(2)}`);
      console.log(`Success rate: ${successRate.toFixed(2)}%`);

      // Performance assertions
      expect(successful).toBeGreaterThan(totalTransactions * 0.95); // 95% success rate
      expect(actualTPS).toBeGreaterThan(targetTPS * 0.8); // 80% of target TPS
      expect(successRate).toBeGreaterThan(95);
    }, TEST_TIMEOUT);

    it('should maintain sub-200ms latency under normal load', async () => {
      const normalLoad = 1000; // 1K concurrent transactions
      const latencyTarget = 200; // 200ms
      
      const payments = Array.from({ length: normalLoad }, (_, i) => ({
        customerId: `latency-customer-${i}`,
        providerId: `latency-provider-${i}`,
        amount: 10000, // $100.00
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      }));

      const latencies: number[] = [];
      
      const promises = payments.map(async (payment) => {
        const startTime = performance.now();
        
        try {
          const result = await client.mutations.processPayment({
            action: 'process_payment',
            ...payment
          });
          
          const endTime = performance.now();
          const latency = endTime - startTime;
          latencies.push(latency);
          
          return result;
        } catch (error) {
          const endTime = performance.now();
          latencies.push(endTime - startTime);
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.allSettled(promises);
      
      // Calculate latency statistics
      latencies.sort((a, b) => a - b);
      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      const maxLatency = Math.max(...latencies);

      const successful = results.filter(r => 
        r.status === 'fulfilled' && 
        !(r as any).value.error
      ).length;

      console.log(`\nLatency Test Results (${normalLoad} concurrent requests):`);
      console.log(`Successful: ${successful}/${normalLoad}`);
      console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`P50 latency: ${p50.toFixed(2)}ms`);
      console.log(`P95 latency: ${p95.toFixed(2)}ms`);
      console.log(`P99 latency: ${p99.toFixed(2)}ms`);
      console.log(`Max latency: ${maxLatency.toFixed(2)}ms`);

      // Latency assertions
      expect(avgLatency).toBeLessThan(latencyTarget);
      expect(p95).toBeLessThan(latencyTarget * 2); // P95 should be under 400ms
      expect(successful).toBeGreaterThan(normalLoad * 0.95); // 95% success rate
    }, TEST_TIMEOUT);
  });

  describe('Stress Testing', () => {
    it('should handle system overload gracefully', async () => {
      const overload = 5000; // High concurrent load
      const stressPayments = Array.from({ length: overload }, (_, i) => ({
        customerId: `stress-customer-${i}`,
        providerId: `stress-provider-${Math.floor(i / 50)}`,
        amount: Math.floor(Math.random() * 50000) + 5000, // $50-$500 range
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      }));

      const startTime = performance.now();
      
      const promises = stressPayments.map(async (payment, index) => {
        // Add some jitter to simulate real-world conditions
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        try {
          const result = await client.mutations.processPayment({
            action: 'process_payment',
            ...payment
          });
          return { success: result.data?.success, index };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            index 
          };
        }
      });

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      const successful = results.filter(r => 
        r.status === 'fulfilled' && (r as any).value.success === true
      ).length;

      const failed = results.length - successful;
      const throughput = successful / duration;

      console.log(`\nStress Test Results:`);
      console.log(`Total requests: ${overload}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);
      console.log(`Duration: ${duration.toFixed(2)} seconds`);
      console.log(`Throughput: ${throughput.toFixed(2)} TPS`);

      // System should degrade gracefully, not crash
      expect(successful).toBeGreaterThan(overload * 0.7); // At least 70% success under stress
      expect(throughput).toBeGreaterThan(100); // Maintain minimum throughput
    }, TEST_TIMEOUT);

    it('should recover after stress conditions', async () => {
      // First, apply stress
      const stressLoad = 1000;
      const stressPromises = Array.from({ length: stressLoad }, (_, i) => 
        client.mutations.processPayment({
          action: 'process_payment',
          customerId: `recovery-stress-${i}`,
          providerId: 'recovery-provider',
          amount: 10000,
          currency: 'USD',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123'
        }).catch(() => ({ success: false }))
      );

      await Promise.allSettled(stressPromises);
      
      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second cooldown

      // Test normal operations after stress
      const normalLoad = 100;
      const recoveryPromises = Array.from({ length: normalLoad }, (_, i) =>
        client.mutations.processPayment({
          action: 'process_payment',
          customerId: `recovery-normal-${i}`,
          providerId: 'recovery-provider',
          amount: 10000,
          currency: 'USD',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123'
        })
      );

      const recoveryResults = await Promise.allSettled(recoveryPromises);
      const recoverySuccessful = recoveryResults.filter(r => 
        r.status === 'fulfilled' && (r as any).value.data?.success === true
      ).length;

      const recoveryRate = (recoverySuccessful / normalLoad) * 100;

      console.log(`\nRecovery Test Results:`);
      console.log(`Post-stress successful transactions: ${recoverySuccessful}/${normalLoad}`);
      console.log(`Recovery success rate: ${recoveryRate.toFixed(2)}%`);

      // System should recover to normal performance levels
      expect(recoveryRate).toBeGreaterThan(90); // 90%+ recovery rate
    }, TEST_TIMEOUT);
  });

  describe('Scalability Testing', () => {
    it('should scale linearly with increased load', async () => {
      const loadLevels = [100, 500, 1000, 2000];
      const results = [];

      for (const load of loadLevels) {
        console.log(`\nTesting with ${load} concurrent payments...`);
        
        const payments = Array.from({ length: load }, (_, i) => ({
          customerId: `scale-customer-${load}-${i}`,
          providerId: `scale-provider-${Math.floor(i / 10)}`,
          amount: 10000,
          currency: 'USD',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123'
        }));

        const startTime = performance.now();
        
        const promises = payments.map(payment =>
          client.mutations.processPayment({
            action: 'process_payment',
            ...payment
          }).catch(() => ({ success: false }))
        );

        const loadResults = await Promise.allSettled(promises);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        const successful = loadResults.filter(r => 
          r.status === 'fulfilled' && (r as any).value.data?.success === true
        ).length;

        const throughput = successful / duration;
        const successRate = (successful / load) * 100;

        results.push({
          load,
          successful,
          duration,
          throughput,
          successRate
        });

        console.log(`Load: ${load}, Success: ${successful}, Rate: ${successRate.toFixed(2)}%, TPS: ${throughput.toFixed(2)}`);

        // Brief pause between load levels
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Analyze scaling behavior
      console.log(`\nScalability Analysis:`);
      results.forEach(result => {
        console.log(`Load: ${result.load}, TPS: ${result.throughput.toFixed(2)}, Success Rate: ${result.successRate.toFixed(2)}%`);
      });

      // Verify reasonable scaling
      const throughputRatios = [];
      for (let i = 1; i < results.length; i++) {
        const ratio = results[i].throughput / results[0].throughput;
        const loadRatio = results[i].load / results[0].load;
        throughputRatios.push(ratio / loadRatio);
      }

      const avgScalingEfficiency = throughputRatios.reduce((sum, r) => sum + r, 0) / throughputRatios.length;
      
      console.log(`Average scaling efficiency: ${(avgScalingEfficiency * 100).toFixed(2)}%`);

      // System should scale reasonably well
      expect(avgScalingEfficiency).toBeGreaterThan(0.5); // At least 50% scaling efficiency
      
      // Success rates should remain high across all load levels
      results.forEach(result => {
        expect(result.successRate).toBeGreaterThan(85);
      });
    }, TEST_TIMEOUT);
  });

  describe('Memory and Resource Testing', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const sustainedLoad = 500;
      const testRounds = 10;
      const roundDuration = 30000; // 30 seconds per round

      console.log(`Starting sustained load test: ${sustainedLoad} TPS for ${testRounds} rounds`);

      const memoryUsage = [];

      for (let round = 0; round < testRounds; round++) {
        console.log(`Round ${round + 1}/${testRounds}`);

        // Record initial memory usage
        const initialMemory = process.memoryUsage();
        
        const payments = Array.from({ length: sustainedLoad }, (_, i) => ({
          customerId: `sustained-customer-${round}-${i}`,
          providerId: `sustained-provider-${Math.floor(i / 20)}`,
          amount: 10000,
          currency: 'USD',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123'
        }));

        const roundStartTime = performance.now();
        
        const promises = payments.map(payment =>
          client.mutations.processPayment({
            action: 'process_payment',
            ...payment
          }).catch(() => ({ success: false }))
        );

        const results = await Promise.allSettled(promises);
        const roundEndTime = performance.now();

        const successful = results.filter(r => 
          r.status === 'fulfilled' && (r as any).value.data?.success === true
        ).length;

        const finalMemory = process.memoryUsage();
        const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

        memoryUsage.push({
          round: round + 1,
          successful,
          duration: (roundEndTime - roundStartTime) / 1000,
          memoryDelta: memoryDelta / 1024 / 1024, // Convert to MB
          totalMemory: finalMemory.heapUsed / 1024 / 1024
        });

        console.log(`Round ${round + 1}: ${successful} successful, Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        // Brief pause between rounds
        if (round < testRounds - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Analyze memory stability
      const avgMemoryDelta = memoryUsage.reduce((sum, m) => sum + m.memoryDelta, 0) / memoryUsage.length;
      const maxMemory = Math.max(...memoryUsage.map(m => m.totalMemory));
      const minMemory = Math.min(...memoryUsage.map(m => m.totalMemory));
      const memoryRange = maxMemory - minMemory;

      console.log(`\nMemory Analysis:`);
      console.log(`Average memory delta per round: ${avgMemoryDelta.toFixed(2)}MB`);
      console.log(`Memory range: ${memoryRange.toFixed(2)}MB (${minMemory.toFixed(2)}MB - ${maxMemory.toFixed(2)}MB)`);

      // Memory usage should remain stable
      expect(avgMemoryDelta).toBeLessThan(50); // Less than 50MB average increase per round
      expect(memoryRange).toBeLessThan(200); // Total memory range under 200MB

      // Performance should remain consistent
      const avgSuccessRate = memoryUsage.reduce((sum, m) => sum + (m.successful / sustainedLoad), 0) / testRounds * 100;
      expect(avgSuccessRate).toBeGreaterThan(90);
    }, TEST_TIMEOUT);
  });

  describe('Fraud Detection Performance', () => {
    it('should maintain fraud detection speed under high load', async () => {
      const fraudTestLoad = 1000;
      const mixedRiskPayments = Array.from({ length: fraudTestLoad }, (_, i) => {
        const riskLevel = i % 4; // Mix of risk levels
        const baseAmount = 10000;
        
        return {
          customerId: `fraud-perf-customer-${i}`,
          providerId: `fraud-perf-provider-${i}`,
          amount: baseAmount * (riskLevel + 1), // $100, $200, $300, $400
          currency: 'USD',
          cardNumber: riskLevel === 3 ? '4000000000000002' : '4242424242424242', // High risk card for level 3
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123',
          metadata: {
            riskLevel,
            testType: 'fraud-performance'
          }
        };
      });

      const startTime = performance.now();
      const fraudLatencies: number[] = [];

      const promises = mixedRiskPayments.map(async (payment) => {
        const paymentStartTime = performance.now();
        
        try {
          const result = await client.mutations.processPayment({
            action: 'process_payment',
            ...payment
          });
          
          const paymentEndTime = performance.now();
          fraudLatencies.push(paymentEndTime - paymentStartTime);
          
          return result;
        } catch (error) {
          const paymentEndTime = performance.now();
          fraudLatencies.push(paymentEndTime - paymentStartTime);
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();

      // Analyze fraud detection performance
      const successful = results.filter(r => 
        r.status === 'fulfilled' && !(r as any).value.error
      ).length;

      const totalDuration = (endTime - startTime) / 1000;
      fraudLatencies.sort((a, b) => a - b);
      
      const avgFraudLatency = fraudLatencies.reduce((sum, l) => sum + l, 0) / fraudLatencies.length;
      const p95FraudLatency = fraudLatencies[Math.floor(fraudLatencies.length * 0.95)];

      console.log(`\nFraud Detection Performance:`);
      console.log(`Total payments processed: ${fraudTestLoad}`);
      console.log(`Successful: ${successful}`);
      console.log(`Total duration: ${totalDuration.toFixed(2)} seconds`);
      console.log(`Average fraud detection latency: ${avgFraudLatency.toFixed(2)}ms`);
      console.log(`P95 fraud detection latency: ${p95FraudLatency.toFixed(2)}ms`);

      // Fraud detection should not significantly impact performance
      expect(avgFraudLatency).toBeLessThan(500); // Under 500ms average
      expect(p95FraudLatency).toBeLessThan(1000); // Under 1s for P95
      expect(successful).toBeGreaterThan(fraudTestLoad * 0.6); // At least 60% success (some will be blocked by fraud detection)
    }, TEST_TIMEOUT);
  });

  describe('Database Performance', () => {
    it('should handle high write throughput to DynamoDB', async () => {
      const writeLoad = 2000;
      const concurrentWrites = Array.from({ length: writeLoad }, (_, i) => ({
        customerId: `db-write-customer-${i}`,
        providerId: `db-write-provider-${Math.floor(i / 100)}`,
        amount: 5000 + (i * 10), // Varying amounts
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123',
        metadata: {
          testType: 'database-write-performance',
          batchId: Math.floor(i / 50)
        }
      }));

      const startTime = performance.now();
      
      const promises = concurrentWrites.map(payment =>
        client.mutations.processPayment({
          action: 'process_payment',
          ...payment
        }).catch(error => ({ 
          error: error instanceof Error ? error.message : 'Write failed',
          isError: true
        }))
      );

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && !(r as any).value.isError
      ).length;

      const writeLatency = (endTime - startTime) / 1000;
      const writesTPS = successful / writeLatency;

      console.log(`\nDynamoDB Write Performance:`);
      console.log(`Total write operations: ${writeLoad}`);
      console.log(`Successful writes: ${successful}`);
      console.log(`Write latency: ${writeLatency.toFixed(2)} seconds`);
      console.log(`Writes per second: ${writesTPS.toFixed(2)}`);

      // Database should handle high write throughput
      expect(successful).toBeGreaterThan(writeLoad * 0.95); // 95% success rate
      expect(writesTPS).toBeGreaterThan(500); // At least 500 writes per second
    }, TEST_TIMEOUT);

    it('should handle concurrent read operations efficiently', async () => {
      // First, create some test payments to read
      const setupPayments = Array.from({ length: 100 }, (_, i) => ({
        customerId: `read-setup-customer-${i}`,
        providerId: `read-setup-provider-${i}`,
        amount: 10000,
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      }));

      const setupResults = await Promise.allSettled(
        setupPayments.map(payment =>
          client.mutations.processPayment({
            action: 'process_payment',
            ...payment
          })
        )
      );

      const setupPaymentIds = setupResults
        .filter(r => r.status === 'fulfilled' && (r as any).value.data?.success)
        .map(r => (r as any).value.data?.paymentId)
        .filter(id => id);

      expect(setupPaymentIds.length).toBeGreaterThan(50); // At least half should succeed

      // Now test concurrent reads
      const readLoad = 1000;
      const readPromises = Array.from({ length: readLoad }, (_, i) => {
        const paymentId = setupPaymentIds[i % setupPaymentIds.length];
        return client.queries.validatePayment({ paymentId });
      });

      const readStartTime = performance.now();
      const readResults = await Promise.allSettled(readPromises);
      const readEndTime = performance.now();

      const successfulReads = readResults.filter(r => 
        r.status === 'fulfilled' && (r as any).value.data?.success === true
      ).length;

      const readLatency = (readEndTime - readStartTime) / 1000;
      const readsTPS = successfulReads / readLatency;

      console.log(`\nDynamoDB Read Performance:`);
      console.log(`Total read operations: ${readLoad}`);
      console.log(`Successful reads: ${successfulReads}`);
      console.log(`Read latency: ${readLatency.toFixed(2)} seconds`);
      console.log(`Reads per second: ${readsTPS.toFixed(2)}`);

      // Read operations should be very fast
      expect(successfulReads).toBeGreaterThan(readLoad * 0.95); // 95% success rate
      expect(readsTPS).toBeGreaterThan(1000); // At least 1000 reads per second
      expect(readLatency).toBeLessThan(10); // Complete within 10 seconds
    }, TEST_TIMEOUT);
  });
});

// Performance test utilities
export const measureLatency = async (operation: () => Promise<any>): Promise<{ result: any, latency: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  return { result, latency: endTime - startTime };
};

export const generateLoadTestData = (count: number, options = {}) => {
  const defaults = {
    amountRange: [5000, 50000], // $50-$500
    customerPrefix: 'load-customer',
    providerPrefix: 'load-provider',
    cardNumber: '4242424242424242'
  };
  
  const config = { ...defaults, ...options };
  
  return Array.from({ length: count }, (_, i) => ({
    customerId: `${config.customerPrefix}-${i}`,
    providerId: `${config.providerPrefix}-${Math.floor(i / 10)}`,
    amount: Math.floor(Math.random() * (config.amountRange[1] - config.amountRange[0])) + config.amountRange[0],
    currency: 'USD',
    cardNumber: config.cardNumber,
    expiryMonth: '12',
    expiryYear: '2025',
    cvc: '123',
    metadata: {
      testRun: 'load-test',
      index: i
    }
  }));
};

export const analyzeResults = (results: any[]) => {
  const successful = results.filter(r => r.status === 'fulfilled' && r.value?.data?.success === true);
  const failed = results.filter(r => r.status === 'rejected' || r.value?.data?.success === false);
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: (successful.length / results.length) * 100,
    errorTypes: failed.reduce((acc, f) => {
      const error = f.status === 'rejected' ? f.reason?.message : f.value?.data?.error;
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
};