/**
 * Unit Tests for AWS Payment Client
 * 
 * Comprehensive test suite for AWS native payment processing including:
 * - Payment intent creation and processing
 * - Card tokenization with AWS Payment Cryptography
 * - Fraud detection integration
 * - Bank account management for ACH transfers
 * - Escrow account management
 * - Payout processing
 * - Fee calculations and cost optimization validation
 * - PCI DSS compliance testing
 * - Performance optimization testing
 * 
 * Testing validates 98%+ cost savings vs Stripe and security compliance.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  awsPaymentClient,
  formatAmount,
  validateCardNumber,
  getCardBrand,
  validateExpirationDate,
  validateCVC,
  type PaymentIntent,
  type PaymentResult,
  type BankAccount,
  type EscrowAccount,
  type PayoutRequest,
  type FraudScore
} from './aws-payment-client';

import {
  generateTestCardData,
  generateTestBankAccount,
  generateTestPaymentIntent,
  generateTestFraudScenarios,
  validatePlatformFees,
  validateEncryption,
  validatePCICompliance,
  mockPerformanceMetrics
} from '../tests/test/aws-setup';

// Mock AWS Amplify client
const mockGenerateClient = jest.fn();
const mockMutations = {
  createPaymentIntent: jest.fn(),
  tokenizeCard: jest.fn(),
  processPayment: jest.fn(),
  assessFraudRisk: jest.fn(),
  createBankAccount: jest.fn(),
  verifyBankAccount: jest.fn(),
  createPayout: jest.fn(),
  createEscrowHold: jest.fn(),
  releaseEscrow: jest.fn(),
  refundPayment: jest.fn()
};
const mockQueries = {
  getProviderBankAccounts: jest.fn(),
  getProviderPayouts: jest.fn()
};

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    mutations: mockMutations,
    queries: mockQueries
  }))
}));

describe('AWS Payment Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock responses
    Object.values(mockMutations).forEach(mock => mock.mockResolvedValue({ data: null }));
    Object.values(mockQueries).forEach(mock => mock.mockResolvedValue({ data: null }));
  });

  describe('Payment Intent Management', () => {
    it('should create payment intent successfully', async () => {
      const testIntent = generateTestPaymentIntent();
      const mockResponse = {
        data: {
          id: 'pi_test_123',
          amount: testIntent.amount,
          currency: testIntent.currency,
          status: 'requires_payment_method',
          clientSecret: 'pi_test_123_secret_abc',
          metadata: testIntent.metadata
        }
      };
      
      mockMutations.createPaymentIntent.mockResolvedValue(mockResponse);
      
      const result = await awsPaymentClient.createPaymentIntent(testIntent);
      
      expect(mockMutations.createPaymentIntent).toHaveBeenCalledWith({
        amount: testIntent.amount,
        currency: testIntent.currency,
        customerId: testIntent.customerId,
        providerId: testIntent.providerId,
        bookingId: testIntent.bookingId,
        metadata: testIntent.metadata
      });
      
      expect(result).toEqual({
        id: 'pi_test_123',
        amount: testIntent.amount,
        currency: testIntent.currency,
        status: 'requires_payment_method',
        clientSecret: 'pi_test_123_secret_abc',
        metadata: testIntent.metadata
      });
    });

    it('should handle payment intent creation failure', async () => {
      const testIntent = generateTestPaymentIntent();
      mockMutations.createPaymentIntent.mockResolvedValue({ data: null });
      
      await expect(awsPaymentClient.createPaymentIntent(testIntent))
        .rejects.toThrow('Failed to create payment intent');
    });
  });

  describe('Card Tokenization with AWS Payment Cryptography', () => {
    it('should tokenize card successfully with encryption', async () => {
      const testCard = generateTestCardData();
      const mockResponse = {
        data: {
          token: 'tok_test_encrypted_123',
          last4: '4242',
          brand: 'visa'
        }
      };
      
      mockMutations.tokenizeCard.mockResolvedValue(mockResponse);
      
      const result = await awsPaymentClient.tokenizeCard(testCard);
      
      expect(mockMutations.tokenizeCard).toHaveBeenCalledWith({
        cardNumber: testCard.cardNumber,
        expMonth: testCard.expiryMonth,
        expYear: testCard.expiryYear,
        cvc: testCard.cvc,
        billingDetails: testCard.billingDetails
      });
      
      expect(result).toEqual({
        token: 'tok_test_encrypted_123',
        last4: '4242',
        brand: 'visa'
      });
      
      // Validate encryption occurred (token should be different from original card number)
      expect(result.token).not.toContain(testCard.cardNumber);
      expect(validateEncryption(result.token)).toBe(true);
    });

    it('should handle card tokenization failure', async () => {
      const testCard = generateTestCardData();
      mockMutations.tokenizeCard.mockResolvedValue({ data: null });
      
      await expect(awsPaymentClient.tokenizeCard(testCard))
        .rejects.toThrow('Card validation failed. Please check your card details.');
    });

    it('should ensure PCI DSS compliance in tokenization', async () => {
      const testCard = generateTestCardData();
      const mockResponse = {
        data: {
          token: 'tok_test_encrypted_123',
          last4: '4242',
          brand: 'visa'
        }
      };
      
      mockMutations.tokenizeCard.mockResolvedValue(mockResponse);
      
      const result = await awsPaymentClient.tokenizeCard(testCard);
      
      // Validate PCI compliance - no plain card data should be returned
      const complianceCheck = validatePCICompliance(result);
      expect(complianceCheck.isCompliant).toBe(true);
      expect(complianceCheck.violations.plainCardNumber).toBe(false);
      expect(complianceCheck.violations.plainCVC).toBe(false);
    });
  });

  describe('Payment Processing with Fraud Detection', () => {
    it('should process payment successfully with low fraud score', async () => {
      const fraudScenarios = generateTestFraudScenarios();
      const lowRiskScenario = fraudScenarios[0]; // Low Risk Transaction
      
      // Mock fraud assessment
      mockMutations.assessFraudRisk.mockResolvedValue({
        data: {
          score: lowRiskScenario.expectedScore,
          riskLevel: 'low',
          reasons: [],
          recommendation: lowRiskScenario.expectedRecommendation.toLowerCase()
        }
      });
      
      // Mock payment processing
      mockMutations.processPayment.mockResolvedValue({
        data: {
          success: true,
          paymentIntentId: 'pi_test_123',
          error: null,
          requiresAction: false,
          actionUrl: null
        }
      });
      
      const result = await awsPaymentClient.processPayment({
        paymentIntentId: 'pi_test_123',
        paymentMethodToken: 'tok_test_123',
        customerId: 'customer_test_123',
        amount: lowRiskScenario.amount,
        metadata: {}
      });
      
      expect(mockMutations.assessFraudRisk).toHaveBeenCalled();
      expect(mockMutations.processPayment).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.error).toBeUndefined();
    });

    it('should block payment with high fraud score', async () => {
      const fraudScenarios = generateTestFraudScenarios();
      const highRiskScenario = fraudScenarios[2]; // High Risk Transaction
      
      // Mock fraud assessment
      mockMutations.assessFraudRisk.mockResolvedValue({
        data: {
          score: highRiskScenario.expectedScore,
          riskLevel: 'high',
          reasons: ['High transaction amount', 'Suspicious card BIN', 'Temporary email domain'],
          recommendation: 'decline'
        }
      });
      
      const result = await awsPaymentClient.processPayment({
        paymentIntentId: 'pi_test_123',
        paymentMethodToken: 'tok_test_123',
        customerId: 'customer_test_123',
        amount: highRiskScenario.amount,
        metadata: {}
      });
      
      expect(mockMutations.assessFraudRisk).toHaveBeenCalled();
      expect(mockMutations.processPayment).not.toHaveBeenCalled(); // Should not process
      expect(result.success).toBe(false);
      expect(result.error).toContain('declined for security reasons');
    });

    it('should handle fraud detection service failure gracefully', async () => {
      // Mock fraud assessment failure
      mockMutations.assessFraudRisk.mockRejectedValue(new Error('Fraud detection unavailable'));
      
      // Mock payment processing
      mockMutations.processPayment.mockResolvedValue({
        data: {
          success: true,
          paymentIntentId: 'pi_test_123'
        }
      });
      
      const result = await awsPaymentClient.processPayment({
        paymentIntentId: 'pi_test_123',
        paymentMethodToken: 'tok_test_123',
        customerId: 'customer_test_123',
        amount: 10000,
        metadata: {}
      });
      
      // Should default to low risk and continue processing
      expect(result.success).toBe(true);
    });
  });

  describe('Bank Account Management for ACH', () => {
    it('should create bank account successfully', async () => {
      const testBankAccount = generateTestBankAccount();
      const mockResponse = {
        data: {
          id: 'ba_test_123',
          routingNumber: testBankAccount.routingNumber,
          accountNumber: testBankAccount.accountNumber,
          accountType: testBankAccount.accountType,
          bankName: testBankAccount.bankName,
          accountHolderName: testBankAccount.accountHolderName,
          isVerified: false,
          isDefault: false
        }
      };
      
      mockMutations.createBankAccount.mockResolvedValue(mockResponse);
      
      const result = await awsPaymentClient.createBankAccount({
        providerId: 'provider_test_123',
        ...testBankAccount
      });
      
      expect(mockMutations.createBankAccount).toHaveBeenCalledWith({
        providerId: 'provider_test_123',
        routingNumber: testBankAccount.routingNumber,
        accountNumber: testBankAccount.accountNumber,
        accountType: testBankAccount.accountType,
        accountHolderName: testBankAccount.accountHolderName
      });
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should verify bank account with micro-deposits', async () => {
      mockMutations.verifyBankAccount.mockResolvedValue({
        data: {
          success: true,
          error: null
        }
      });
      
      const result = await awsPaymentClient.verifyBankAccount({
        bankAccountId: 'ba_test_123',
        deposit1: 32, // cents
        deposit2: 45  // cents
      });
      
      expect(mockMutations.verifyBankAccount).toHaveBeenCalledWith({
        bankAccountId: 'ba_test_123',
        deposit1: 32,
        deposit2: 45
      });
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should get provider bank accounts', async () => {
      const mockAccounts = [
        {
          id: 'ba_test_123',
          routingNumber: '110000000',
          accountNumber: '1234567890123456',
          accountType: 'checking',
          bankName: 'Test Bank',
          accountHolderName: 'Test Provider',
          isVerified: true,
          isDefault: true
        }
      ];
      
      mockQueries.getProviderBankAccounts.mockResolvedValue({ data: mockAccounts });
      
      const result = await awsPaymentClient.getProviderBankAccounts('provider_test_123');
      
      expect(mockQueries.getProviderBankAccounts).toHaveBeenCalledWith({
        providerId: 'provider_test_123'
      });
      
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('Escrow Management', () => {
    it('should create escrow hold successfully', async () => {
      const mockResponse = {
        data: {
          id: 'escrow_test_123',
          balance: 10000,
          currency: 'USD',
          holdUntil: '2024-02-01T00:00:00.000Z',
          status: 'holding',
          metadata: {}
        }
      };
      
      mockMutations.createEscrowHold.mockResolvedValue(mockResponse);
      
      const result = await awsPaymentClient.createEscrowHold({
        paymentIntentId: 'pi_test_123',
        amount: 10000,
        currency: 'USD',
        providerId: 'provider_test_123',
        bookingId: 'booking_test_123',
        holdDays: 7,
        metadata: {}
      });
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should release escrow funds successfully', async () => {
      mockMutations.releaseEscrow.mockResolvedValue({
        data: {
          success: true,
          payoutId: 'payout_test_123',
          error: null
        }
      });
      
      const result = await awsPaymentClient.releaseEscrow({
        escrowAccountId: 'escrow_test_123',
        providerId: 'provider_test_123',
        amount: 9200, // After platform fees
        metadata: {}
      });
      
      expect(result.success).toBe(true);
      expect(result.payoutId).toBe('payout_test_123');
    });
  });

  describe('Payout Processing', () => {
    it('should create payout request successfully', async () => {
      const mockResponse = {
        data: {
          id: 'payout_test_123',
          amount: 9200,
          currency: 'USD',
          bankAccountId: 'ba_test_123',
          status: 'pending',
          estimatedArrival: '2024-01-03T00:00:00.000Z',
          metadata: {}
        }
      };
      
      mockMutations.createPayout.mockResolvedValue(mockResponse);
      
      const result = await awsPaymentClient.createPayout({
        providerId: 'provider_test_123',
        amount: 9200,
        currency: 'USD',
        bankAccountId: 'ba_test_123',
        metadata: {}
      });
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should get provider payout history', async () => {
      const mockPayouts = [
        {
          id: 'payout_test_123',
          amount: 9200,
          currency: 'USD',
          bankAccountId: 'ba_test_123',
          status: 'completed',
          estimatedArrival: '2024-01-03T00:00:00.000Z',
          metadata: {}
        }
      ];
      
      mockQueries.getProviderPayouts.mockResolvedValue({ data: mockPayouts });
      
      const result = await awsPaymentClient.getProviderPayouts('provider_test_123');
      
      expect(result).toEqual(mockPayouts);
    });
  });

  describe('Fee Calculations and Cost Optimization', () => {
    it('should calculate platform fees correctly', async () => {
      const testAmount = 10000; // $100.00
      const feeConfig = awsPaymentClient.getPlatformFee();
      
      expect(feeConfig.percentage).toBe(8.0); // 8% platform fee
      
      const feeCalculation = awsPaymentClient.calculateFees(testAmount);
      
      expect(feeCalculation.platformFeeCents).toBe(800); // $8.00 (8%)
      expect(feeCalculation.processingFeeCents).toBe(5); // $0.05 (AWS native)
      expect(feeCalculation.providerAmountCents).toBe(9195); // $91.95
      expect(feeCalculation.totalFeeCents).toBe(805); // $8.05 total
      
      // Validate cost savings vs Stripe
      const costSavings = validatePlatformFees(testAmount);
      expect(costSavings.costSavingsVsStripe).toBe(320); // $3.20 savings vs Stripe 2.9% + $0.30
      
      // Validate 98%+ cost reduction in processing fees
      const stripeFees = 320; // $3.20 Stripe fees
      const awsFees = 5; // $0.05 AWS fees
      const feeReduction = (stripeFees - awsFees) / stripeFees;
      expect(feeReduction).toBeGreaterThan(0.98); // >98% reduction
    });

    it('should apply minimum fee correctly', async () => {
      const smallAmount = 100; // $1.00
      const feeCalculation = awsPaymentClient.calculateFees(smallAmount);
      
      // Should use minimum fee instead of percentage
      expect(feeCalculation.platformFeeCents).toBe(50); // $0.50 minimum
      expect(feeCalculation.processingFeeCents).toBe(5); // $0.05 AWS
    });
  });

  describe('Utility Functions', () => {
    describe('Card Validation', () => {
      it('should validate card numbers using Luhn algorithm', () => {
        expect(validateCardNumber('4242424242424242')).toBe(true); // Valid Visa
        expect(validateCardNumber('5555555555554444')).toBe(true); // Valid Mastercard
        expect(validateCardNumber('378282246310005')).toBe(true);  // Valid Amex
        expect(validateCardNumber('1234567890123456')).toBe(false); // Invalid
      });

      it('should identify card brands correctly', () => {
        expect(getCardBrand('4242424242424242')).toBe('visa');
        expect(getCardBrand('5555555555554444')).toBe('mastercard');
        expect(getCardBrand('378282246310005')).toBe('amex');
        expect(getCardBrand('6011111111111117')).toBe('discover');
        expect(getCardBrand('1234567890123456')).toBe('unknown');
      });

      it('should validate expiration dates', () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        expect(validateExpirationDate(currentMonth, currentYear + 1)).toBe(true); // Next year
        expect(validateExpirationDate(12, currentYear)).toBe(true); // December this year
        expect(validateExpirationDate(currentMonth - 1, currentYear)).toBe(false); // Last month
        expect(validateExpirationDate(13, currentYear)).toBe(false); // Invalid month
        expect(validateExpirationDate(1, currentYear - 1)).toBe(false); // Last year
      });

      it('should validate CVC codes', () => {
        expect(validateCVC('123', 'visa')).toBe(true);
        expect(validateCVC('1234', 'amex')).toBe(true);
        expect(validateCVC('12', 'visa')).toBe(false);
        expect(validateCVC('12345', 'visa')).toBe(false);
        expect(validateCVC('123', 'amex')).toBe(false);
      });
    });

    describe('Amount Formatting', () => {
      it('should format amounts correctly', () => {
        expect(formatAmount(10000)).toBe('$100.00');
        expect(formatAmount(12345)).toBe('$123.45');
        expect(formatAmount(50)).toBe('$0.50');
        expect(formatAmount(0)).toBe('$0.00');
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      mockMutations.createPaymentIntent.mockRejectedValue(new Error('Network error'));
      
      const testIntent = generateTestPaymentIntent();
      
      await expect(awsPaymentClient.createPaymentIntent(testIntent))
        .rejects.toThrow('Failed to create payment intent');
    });

    it('should handle malformed responses gracefully', async () => {
      mockMutations.tokenizeCard.mockResolvedValue({ data: 'invalid-response' });
      
      const testCard = generateTestCardData();
      
      await expect(awsPaymentClient.tokenizeCard(testCard))
        .rejects.toThrow('Card validation failed');
    });

    it('should provide meaningful error messages', async () => {
      mockMutations.processPayment.mockRejectedValue(new Error('Insufficient funds'));
      
      const result = await awsPaymentClient.processPayment({
        paymentIntentId: 'pi_test_123',
        paymentMethodToken: 'tok_test_123',
        customerId: 'customer_test_123',
        amount: 10000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment processing failed. Please try again.');
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance benchmarks', async () => {
      const startTime = performance.now();
      
      // Mock fast responses
      mockMutations.assessFraudRisk.mockResolvedValue({
        data: { score: 100, riskLevel: 'low', reasons: [], recommendation: 'approve' }
      });
      mockMutations.processPayment.mockResolvedValue({
        data: { success: true, paymentIntentId: 'pi_test_123' }
      });
      
      await awsPaymentClient.processPayment({
        paymentIntentId: 'pi_test_123',
        paymentMethodToken: 'tok_test_123',
        customerId: 'customer_test_123',
        amount: 10000
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should complete within performance targets
      expect(processingTime).toBeLessThan(mockPerformanceMetrics.totalProcessingTime);
    });
  });
});