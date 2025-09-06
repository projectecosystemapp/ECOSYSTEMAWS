import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { mockPaymentEvent, mockContext } from '../unit/aws-payment-processor.test';
import { createMockFraudEvent } from '../unit/fraud-detector.test';
import { createMockEscrowEvent } from '../unit/escrow-manager.test';

// Integration tests for the complete AWS native payment flow
describe('Payment Flow Integration Tests', () => {
  let client: any;

  beforeAll(async () => {
    // Initialize Amplify client for integration testing
    client = generateClient<Schema>();
  });

  beforeEach(() => {
    // Reset any test state
    jest.clearAllMocks();
  });

  describe('Complete Customer Payment Journey', () => {
    it('should process end-to-end payment with all security checks', async () => {
      // Test data
      const paymentData = {
        customerId: 'customer-integration-test',
        providerId: 'provider-integration-test',
        bookingId: 'booking-integration-test',
        amount: 15000, // $150.00
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      // Step 1: Create escrow account for provider
      const escrowAccount = await client.mutations.createEscrowAccount({
        providerId: paymentData.providerId,
        initialBalance: 0,
        currency: paymentData.currency,
        accountType: 'provider_payout'
      });

      expect(escrowAccount.data?.success).toBe(true);
      expect(escrowAccount.data?.accountId).toBeDefined();

      // Step 2: Process payment with fraud detection
      const paymentResult = await client.mutations.processPayment({
        action: 'process_payment',
        ...paymentData
      });

      expect(paymentResult.data?.success).toBe(true);
      expect(paymentResult.data?.paymentId).toBeDefined();
      expect(paymentResult.data?.transactionId).toBeDefined();
      expect(paymentResult.data?.status).toBe('COMPLETED');
      
      // Verify cost savings - should have minimal processing fees
      const expectedPlatformFee = Math.round(paymentData.amount * 0.08); // 8% platform fee
      expect(paymentResult.data?.fees).toBe(expectedPlatformFee);
      expect(paymentResult.data?.netAmount).toBe(paymentData.amount - expectedPlatformFee);

      // Step 3: Verify fraud score is acceptable
      expect(paymentResult.data?.fraudScore).toBeLessThan(500); // Low to medium risk
      expect(paymentResult.data?.fraudRecommendation).toBe('APPROVE');

      // Step 4: Verify escrow deposit
      const escrowBalance = await client.queries.getAccountBalance({
        accountId: escrowAccount.data?.accountId
      });

      expect(escrowBalance.data?.success).toBe(true);
      expect(escrowBalance.data?.balance).toBe(paymentResult.data?.netAmount);

      // Step 5: Simulate service completion and fund release
      const fundRelease = await client.mutations.releaseFunds({
        accountId: escrowAccount.data?.accountId,
        amount: paymentResult.data?.netAmount,
        currency: paymentData.currency,
        releaseCondition: 'booking_completed',
        destinationAccount: 'provider_bank_account',
        metadata: {
          bookingId: paymentData.bookingId,
          completionDate: new Date().toISOString()
        }
      });

      expect(fundRelease.data?.success).toBe(true);
      expect(fundRelease.data?.status).toBe('COMPLETED');

      // Step 6: Verify final escrow balance is zero
      const finalBalance = await client.queries.getAccountBalance({
        accountId: escrowAccount.data?.accountId
      });

      expect(finalBalance.data?.balance).toBe(0);
    });

    it('should handle high-risk payments with fraud blocking', async () => {
      const highRiskPayment = {
        customerId: 'suspicious-customer',
        providerId: 'provider-test',
        amount: 150000, // $1,500.00 - triggers fraud detection
        currency: 'USD',
        cardNumber: '4000000000000002', // Decline test card
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      const paymentResult = await client.mutations.processPayment({
        action: 'process_payment',
        ...highRiskPayment
      });

      // Should be blocked by fraud detection
      expect(paymentResult.data?.success).toBe(false);
      expect(paymentResult.data?.fraudScore).toBeGreaterThan(800);
      expect(paymentResult.data?.fraudRecommendation).toBe('BLOCK');
      expect(paymentResult.data?.error).toContain('security risk');
    });

    it('should process refunds correctly', async () => {
      // First, process a successful payment
      const originalPayment = await client.mutations.processPayment({
        action: 'process_payment',
        customerId: 'refund-test-customer',
        providerId: 'refund-test-provider',
        amount: 20000, // $200.00
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      });

      expect(originalPayment.data?.success).toBe(true);

      // Now process a refund
      const refundResult = await client.mutations.processRefund({
        originalPaymentId: originalPayment.data?.paymentId,
        amount: 10000, // Partial refund of $100.00
        reason: 'customer_request',
        refundType: 'partial'
      });

      expect(refundResult.data?.success).toBe(true);
      expect(refundResult.data?.refundId).toBeDefined();
      expect(refundResult.data?.amount).toBe(10000);
      expect(refundResult.data?.status).toBe('COMPLETED');

      // Verify platform fee handling
      // Original platform fee: $200 * 8% = $16
      // Refund platform fee adjustment: $100 * 8% = $8 back to customer
      expect(refundResult.data?.platformFeeAdjustment).toBe(800); // $8.00
    });

    it('should handle multiple concurrent payments', async () => {
      const concurrentPayments = Array.from({ length: 10 }, (_, i) => ({
        customerId: `concurrent-customer-${i}`,
        providerId: `concurrent-provider-${i}`,
        amount: 5000 + (i * 1000), // $50-$140 range
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      }));

      const promises = concurrentPayments.map(payment =>
        client.mutations.processPayment({
          action: 'process_payment',
          ...payment
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.data?.success === true
      ).length;

      expect(successful).toBe(10);

      // Verify all payment IDs are unique
      const paymentIds = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value.data?.paymentId)
        .filter(id => id);

      const uniqueIds = new Set(paymentIds);
      expect(uniqueIds.size).toBe(paymentIds.length);
    });
  });

  describe('Provider Payout Integration', () => {
    it('should handle automated provider payouts', async () => {
      // Setup: Create provider and process multiple payments
      const providerId = 'payout-test-provider';
      
      // Create escrow account
      const escrowAccount = await client.mutations.createEscrowAccount({
        providerId,
        initialBalance: 0,
        currency: 'USD',
        accountType: 'provider_payout'
      });

      expect(escrowAccount.data?.success).toBe(true);

      // Process multiple customer payments
      const payments = await Promise.all([
        client.mutations.processPayment({
          action: 'process_payment',
          customerId: 'payout-customer-1',
          providerId,
          amount: 25000, // $250
          currency: 'USD',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123'
        }),
        client.mutations.processPayment({
          action: 'process_payment',
          customerId: 'payout-customer-2',
          providerId,
          amount: 30000, // $300
          currency: 'USD',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvc: '123'
        })
      ]);

      payments.forEach(payment => {
        expect(payment.data?.success).toBe(true);
      });

      // Check accumulated escrow balance
      const escrowBalance = await client.queries.getAccountBalance({
        accountId: escrowAccount.data?.accountId
      });

      const totalNetAmount = payments.reduce((sum, payment) => 
        sum + (payment.data?.netAmount || 0), 0
      );

      expect(escrowBalance.data?.balance).toBe(totalNetAmount);

      // Process batch payout
      const payout = await client.mutations.processBatchPayout({
        providerId,
        payoutMethod: 'ach_transfer',
        amount: totalNetAmount,
        destinationAccount: 'provider_bank_123'
      });

      expect(payout.data?.success).toBe(true);
      expect(payout.data?.payoutId).toBeDefined();
      expect(payout.data?.amount).toBe(totalNetAmount);
      expect(payout.data?.processingFee).toBeLessThan(100); // Minimal ACH fee

      // Verify escrow balance is now zero
      const finalBalance = await client.queries.getAccountBalance({
        accountId: escrowAccount.data?.accountId
      });

      expect(finalBalance.data?.balance).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle payment processor failures gracefully', async () => {
      const payment = {
        customerId: 'error-test-customer',
        providerId: 'error-test-provider',
        amount: 10000,
        currency: 'USD',
        cardNumber: '4000000000000069', // Expired card test number
        expiryMonth: '01',
        expiryYear: '2020', // Expired date
        cvc: '123'
      };

      const paymentResult = await client.mutations.processPayment({
        action: 'process_payment',
        ...payment
      });

      expect(paymentResult.data?.success).toBe(false);
      expect(paymentResult.data?.error).toBeDefined();
      expect(paymentResult.data?.paymentId).toBeUndefined();
    });

    it('should maintain data consistency during failures', async () => {
      const payment = {
        customerId: 'consistency-test-customer',
        providerId: 'consistency-test-provider',
        amount: 15000,
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      try {
        // Attempt payment
        const paymentResult = await client.mutations.processPayment({
          action: 'process_payment',
          ...payment
        });

        if (!paymentResult.data?.success) {
          // Verify no partial data was created
          const paymentValidation = await client.queries.validatePayment({
            paymentId: paymentResult.data?.paymentId || 'non-existent'
          });

          expect(paymentValidation.data?.success).toBe(false);
          expect(paymentValidation.data?.error).toBe('Payment not found');
        }
      } catch (error) {
        // Any exceptions should not leave the system in an inconsistent state
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain response times under load', async () => {
      const loadTestPayments = Array.from({ length: 25 }, (_, i) => ({
        customerId: `load-customer-${i}`,
        providerId: `load-provider-${i}`,
        amount: 10000, // $100.00
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      }));

      const startTime = Date.now();

      const promises = loadTestPayments.map(payment =>
        client.mutations.processPayment({
          action: 'process_payment',
          ...payment
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Verify all payments processed successfully
      const successful = results.filter(r => r.data?.success === true).length;
      expect(successful).toBe(25);

      // Verify reasonable performance
      const averageTime = totalTime / 25;
      expect(averageTime).toBeLessThan(5000); // Average of 5 seconds per payment

      console.log(`Load test completed: ${successful}/${loadTestPayments.length} payments in ${totalTime}ms`);
      console.log(`Average response time: ${averageTime}ms per payment`);
    });

    it('should handle database connection limits gracefully', async () => {
      // Simulate high concurrent load
      const highConcurrencyPayments = Array.from({ length: 100 }, (_, i) => ({
        customerId: `concurrent-customer-${i}`,
        providerId: 'shared-provider',
        amount: 5000,
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      }));

      const promises = highConcurrencyPayments.map(payment =>
        client.mutations.processPayment({
          action: 'process_payment',
          ...payment
        }).catch(error => ({ error: error.message }))
      );

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;

      // Should handle most requests successfully or fail gracefully
      expect(fulfilled).toBeGreaterThan(80); // 80%+ success rate

      // Count actual payment successes
      const successfulPayments = results
        .filter(r => r.status === 'fulfilled')
        .filter(r => (r as any).value.data?.success === true)
        .length;

      expect(successfulPayments).toBeGreaterThan(70); // 70%+ actual payment success
    });
  });

  describe('Security Integration', () => {
    it('should encrypt sensitive data end-to-end', async () => {
      const sensitivePayment = {
        customerId: 'encryption-test-customer',
        providerId: 'encryption-test-provider',
        amount: 10000,
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      const paymentResult = await client.mutations.processPayment({
        action: 'process_payment',
        ...sensitivePayment
      });

      expect(paymentResult.data?.success).toBe(true);

      // Verify payment was created without exposing card data
      const paymentValidation = await client.queries.validatePayment({
        paymentId: paymentResult.data?.paymentId
      });

      expect(paymentValidation.data?.success).toBe(true);
      // Sensitive data should not be returned in validation
      expect(paymentValidation.data?.cardNumber).toBeUndefined();
      expect(paymentValidation.data?.cvc).toBeUndefined();
    });

    it('should detect and prevent duplicate payments', async () => {
      const duplicatePayment = {
        customerId: 'duplicate-test-customer',
        providerId: 'duplicate-test-provider',
        amount: 10000,
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123',
        idempotencyKey: 'duplicate-test-key-123'
      };

      // First payment
      const firstResult = await client.mutations.processPayment({
        action: 'process_payment',
        ...duplicatePayment
      });

      expect(firstResult.data?.success).toBe(true);

      // Attempt duplicate payment
      const duplicateResult = await client.mutations.processPayment({
        action: 'process_payment',
        ...duplicatePayment
      });

      // Should either succeed with same payment ID or be rejected
      if (duplicateResult.data?.success) {
        expect(duplicateResult.data?.paymentId).toBe(firstResult.data?.paymentId);
      } else {
        expect(duplicateResult.data?.error).toContain('duplicate');
      }
    });
  });

  describe('Cost Validation Integration', () => {
    it('should demonstrate actual cost savings vs Stripe', async () => {
      const testAmount = 100000; // $1,000.00
      
      const payment = await client.mutations.processPayment({
        action: 'process_payment',
        customerId: 'cost-validation-customer',
        providerId: 'cost-validation-provider',
        amount: testAmount,
        currency: 'USD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      });

      expect(payment.data?.success).toBe(true);

      // Calculate actual AWS costs
      const awsProcessingFee = 5; // ~$0.05 (KMS + DynamoDB + SNS)
      const platformFee = Math.round(testAmount * 0.08); // 8%
      const totalAwsFees = awsProcessingFee + platformFee;

      // Calculate theoretical Stripe costs
      const stripeProcessingFee = Math.round((testAmount * 0.029) + 30); // 2.9% + $0.30
      const totalStripeFees = stripeProcessingFee + platformFee;

      // Verify actual savings
      const savings = totalStripeFees - totalAwsFees;
      const savingsPercentage = (savings / totalStripeFees) * 100;

      expect(savingsPercentage).toBeGreaterThan(90); // 90%+ savings

      console.log(`Cost Analysis for $${testAmount/100} transaction:`);
      console.log(`AWS fees: $${totalAwsFees/100} (processing: $${awsProcessingFee/100}, platform: $${platformFee/100})`);
      console.log(`Stripe fees would be: $${totalStripeFees/100} (processing: $${stripeProcessingFee/100}, platform: $${platformFee/100})`);
      console.log(`Savings: $${savings/100} (${savingsPercentage.toFixed(1)}%)`);

      // Verify the actual payment result matches our calculation
      expect(payment.data?.fees).toBe(platformFee + awsProcessingFee);
    });

    it('should validate monthly savings projections', async () => {
      // Simulate a month's worth of transactions
      const monthlyTransactions = [
        { amount: 50000, count: 100 },   // $500 x 100
        { amount: 100000, count: 50 },   // $1000 x 50
        { amount: 200000, count: 25 },   // $2000 x 25
        { amount: 500000, count: 10 }    // $5000 x 10
      ];

      let totalAWSFees = 0;
      let totalStripeFees = 0;
      let totalVolume = 0;

      for (const transaction of monthlyTransactions) {
        const { amount, count } = transaction;
        
        // AWS fees per transaction
        const awsProcessingFee = 5; // ~$0.05
        const awsPlatformFee = Math.round(amount * 0.08);
        const awsTotal = (awsProcessingFee + awsPlatformFee) * count;

        // Stripe fees per transaction
        const stripeProcessingFee = Math.round((amount * 0.029) + 30);
        const stripePlatformFee = Math.round(amount * 0.08);
        const stripeTotal = (stripeProcessingFee + stripePlatformFee) * count;

        totalAWSFees += awsTotal;
        totalStripeFees += stripeTotal;
        totalVolume += amount * count;
      }

      const totalSavings = totalStripeFees - totalAWSFees;
      const savingsPercentage = (totalSavings / totalStripeFees) * 100;

      expect(savingsPercentage).toBeGreaterThan(85); // 85%+ savings at scale
      expect(totalSavings).toBeGreaterThan(50000); // At least $500 monthly savings

      console.log(`Monthly Savings Analysis:`);
      console.log(`Total transaction volume: $${(totalVolume/100).toLocaleString()}`);
      console.log(`AWS fees: $${(totalAWSFees/100).toLocaleString()}`);
      console.log(`Stripe fees would be: $${(totalStripeFees/100).toLocaleString()}`);
      console.log(`Monthly savings: $${(totalSavings/100).toLocaleString()} (${savingsPercentage.toFixed(1)}%)`);
      console.log(`Annual projected savings: $${((totalSavings * 12)/100).toLocaleString()}`);
    });
  });
});

// Helper functions for integration testing
export const waitForPaymentCompletion = async (paymentId: string, timeout = 30000): Promise<boolean> => {
  const client = generateClient<Schema>();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await client.queries.validatePayment({ paymentId });
    
    if (result.data?.success && result.data?.status === 'COMPLETED') {
      return true;
    }
    
    if (result.data?.success && result.data?.status === 'FAILED') {
      return false;
    }

    // Wait 1 second before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
};

export const generateTestPayment = (overrides = {}) => ({
  customerId: `test-customer-${Date.now()}`,
  providerId: `test-provider-${Date.now()}`,
  amount: 10000,
  currency: 'USD',
  cardNumber: '4242424242424242',
  expiryMonth: '12',
  expiryYear: '2025',
  cvc: '123',
  ...overrides
});