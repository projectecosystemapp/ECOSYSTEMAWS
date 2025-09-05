'use client';

import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/amplify/data/resource';

// Types for AWS native payment processing
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
    funding: string;
  };
  bankAccount?: {
    last4: string;
    routingNumber: string;
    bankName: string;
    accountType: 'checking' | 'savings';
  };
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'requires_action' | 'canceled';
  clientSecret: string;
  metadata: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

export interface BankAccount {
  id: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  bankName: string;
  accountHolderName: string;
  isVerified: boolean;
  isDefault: boolean;
}

export interface EscrowAccount {
  id: string;
  balance: number;
  currency: string;
  holdUntil: string;
  status: 'holding' | 'released' | 'refunded';
  metadata: Record<string, string>;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  bankAccountId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedArrival: string;
  metadata: Record<string, string>;
}

export interface FraudScore {
  score: number; // 0-1, where 1 is highest fraud risk
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendation: 'approve' | 'review' | 'decline';
}

class AWSPaymentClient {
  private client = generateClient<Schema>();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize AWS Payment Cryptography and other services
      console.log('Initializing AWS Payment Client...');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AWS Payment Client:', error);
      throw new Error('Payment system initialization failed');
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Create a payment intent for AWS native processing
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId: string;
    providerId: string;
    bookingId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.createPaymentIntent({
        amount: params.amount,
        currency: params.currency,
        customerId: params.customerId,
        providerId: params.providerId,
        bookingId: params.bookingId,
        metadata: params.metadata || {},
      });

      if (!response.data) {
        throw new Error('Failed to create payment intent');
      }

      return {
        id: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
        status: response.data.status as PaymentIntent['status'],
        clientSecret: response.data.clientSecret,
        metadata: response.data.metadata || {},
      };
    } catch (error) {
      console.error('Create payment intent failed:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Tokenize card details using AWS Payment Cryptography
   */
  async tokenizeCard(cardDetails: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    billingDetails?: {
      name?: string;
      email?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    };
  }): Promise<{ token: string; last4: string; brand: string }> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.tokenizeCard({
        cardNumber: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
        billingDetails: cardDetails.billingDetails || {},
      });

      if (!response.data) {
        throw new Error('Card tokenization failed');
      }

      return {
        token: response.data.token,
        last4: response.data.last4,
        brand: response.data.brand,
      };
    } catch (error) {
      console.error('Card tokenization failed:', error);
      throw new Error('Card validation failed. Please check your card details.');
    }
  }

  /**
   * Process payment with fraud detection
   */
  async processPayment(params: {
    paymentIntentId: string;
    paymentMethodToken: string;
    customerId: string;
    amount: number;
    metadata?: Record<string, string>;
  }): Promise<PaymentResult> {
    await this.ensureInitialized();

    try {
      // First, run fraud detection
      const fraudScore = await this.assessFraudRisk({
        customerId: params.customerId,
        amount: params.amount,
        paymentMethodToken: params.paymentMethodToken,
        metadata: params.metadata || {},
      });

      // Decline high-risk transactions automatically
      if (fraudScore.recommendation === 'decline') {
        return {
          success: false,
          error: 'Transaction declined for security reasons',
        };
      }

      // Process the payment
      const response = await this.client.mutations.processPayment({
        paymentIntentId: params.paymentIntentId,
        paymentMethodToken: params.paymentMethodToken,
        customerId: params.customerId,
        fraudScore: fraudScore.score,
        metadata: params.metadata || {},
      });

      if (!response.data) {
        throw new Error('Payment processing failed');
      }

      return {
        success: response.data.success,
        paymentIntentId: response.data.paymentIntentId,
        error: response.data.error || undefined,
        requiresAction: response.data.requiresAction || false,
        actionUrl: response.data.actionUrl || undefined,
      };
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: 'Payment processing failed. Please try again.',
      };
    }
  }

  /**
   * Assess fraud risk using AWS Fraud Detector
   */
  async assessFraudRisk(params: {
    customerId: string;
    amount: number;
    paymentMethodToken: string;
    metadata: Record<string, string>;
  }): Promise<FraudScore> {
    try {
      const response = await this.client.mutations.assessFraudRisk({
        customerId: params.customerId,
        amount: params.amount,
        paymentMethodToken: params.paymentMethodToken,
        metadata: params.metadata,
      });

      if (!response.data) {
        // Default to low risk if fraud detection fails
        return {
          score: 0.1,
          riskLevel: 'low',
          reasons: [],
          recommendation: 'approve',
        };
      }

      return {
        score: response.data.score,
        riskLevel: response.data.riskLevel as FraudScore['riskLevel'],
        reasons: response.data.reasons || [],
        recommendation: response.data.recommendation as FraudScore['recommendation'],
      };
    } catch (error) {
      console.error('Fraud risk assessment failed:', error);
      // Default to low risk if fraud detection fails
      return {
        score: 0.1,
        riskLevel: 'low',
        reasons: ['Fraud detection unavailable'],
        recommendation: 'approve',
      };
    }
  }

  /**
   * Create bank account for provider payouts
   */
  async createBankAccount(params: {
    providerId: string;
    routingNumber: string;
    accountNumber: string;
    accountType: 'checking' | 'savings';
    accountHolderName: string;
  }): Promise<BankAccount> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.createBankAccount({
        providerId: params.providerId,
        routingNumber: params.routingNumber,
        accountNumber: params.accountNumber,
        accountType: params.accountType,
        accountHolderName: params.accountHolderName,
      });

      if (!response.data) {
        throw new Error('Bank account creation failed');
      }

      return {
        id: response.data.id,
        routingNumber: response.data.routingNumber,
        accountNumber: response.data.accountNumber,
        accountType: response.data.accountType as BankAccount['accountType'],
        bankName: response.data.bankName,
        accountHolderName: response.data.accountHolderName,
        isVerified: response.data.isVerified,
        isDefault: response.data.isDefault,
      };
    } catch (error) {
      console.error('Bank account creation failed:', error);
      throw new Error('Failed to add bank account. Please verify your account details.');
    }
  }

  /**
   * Verify bank account using micro-deposits
   */
  async verifyBankAccount(params: {
    bankAccountId: string;
    deposit1: number;
    deposit2: number;
  }): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.verifyBankAccount({
        bankAccountId: params.bankAccountId,
        deposit1: params.deposit1,
        deposit2: params.deposit2,
      });

      return {
        success: response.data?.success || false,
        error: response.data?.error || undefined,
      };
    } catch (error) {
      console.error('Bank account verification failed:', error);
      return {
        success: false,
        error: 'Verification failed. Please check the deposit amounts.',
      };
    }
  }

  /**
   * Create payout request for provider
   */
  async createPayout(params: {
    providerId: string;
    amount: number;
    currency: string;
    bankAccountId: string;
    metadata?: Record<string, string>;
  }): Promise<PayoutRequest> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.createPayout({
        providerId: params.providerId,
        amount: params.amount,
        currency: params.currency,
        bankAccountId: params.bankAccountId,
        metadata: params.metadata || {},
      });

      if (!response.data) {
        throw new Error('Payout creation failed');
      }

      return {
        id: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
        bankAccountId: response.data.bankAccountId,
        status: response.data.status as PayoutRequest['status'],
        estimatedArrival: response.data.estimatedArrival,
        metadata: response.data.metadata || {},
      };
    } catch (error) {
      console.error('Payout creation failed:', error);
      throw new Error('Failed to initiate payout. Please try again.');
    }
  }

  /**
   * Manage escrow account - hold funds until service completion
   */
  async createEscrowHold(params: {
    paymentIntentId: string;
    amount: number;
    currency: string;
    providerId: string;
    bookingId: string;
    holdDays: number;
    metadata?: Record<string, string>;
  }): Promise<EscrowAccount> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.createEscrowHold({
        paymentIntentId: params.paymentIntentId,
        amount: params.amount,
        currency: params.currency,
        providerId: params.providerId,
        bookingId: params.bookingId,
        holdDays: params.holdDays,
        metadata: params.metadata || {},
      });

      if (!response.data) {
        throw new Error('Escrow hold creation failed');
      }

      return {
        id: response.data.id,
        balance: response.data.balance,
        currency: response.data.currency,
        holdUntil: response.data.holdUntil,
        status: response.data.status as EscrowAccount['status'],
        metadata: response.data.metadata || {},
      };
    } catch (error) {
      console.error('Escrow hold creation failed:', error);
      throw new Error('Failed to secure payment in escrow');
    }
  }

  /**
   * Release escrow funds to provider
   */
  async releaseEscrow(params: {
    escrowAccountId: string;
    providerId: string;
    amount?: number; // Partial release if specified
    metadata?: Record<string, string>;
  }): Promise<{ success: boolean; payoutId?: string; error?: string }> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.releaseEscrow({
        escrowAccountId: params.escrowAccountId,
        providerId: params.providerId,
        amount: params.amount,
        metadata: params.metadata || {},
      });

      return {
        success: response.data?.success || false,
        payoutId: response.data?.payoutId || undefined,
        error: response.data?.error || undefined,
      };
    } catch (error) {
      console.error('Escrow release failed:', error);
      return {
        success: false,
        error: 'Failed to release escrow funds',
      };
    }
  }

  /**
   * Refund payment from escrow
   */
  async refundPayment(params: {
    paymentIntentId: string;
    amount?: number; // Partial refund if specified
    reason: string;
    metadata?: Record<string, string>;
  }): Promise<{ success: boolean; refundId?: string; error?: string }> {
    await this.ensureInitialized();

    try {
      const response = await this.client.mutations.refundPayment({
        paymentIntentId: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason,
        metadata: params.metadata || {},
      });

      return {
        success: response.data?.success || false,
        refundId: response.data?.refundId || undefined,
        error: response.data?.error || undefined,
      };
    } catch (error) {
      console.error('Payment refund failed:', error);
      return {
        success: false,
        error: 'Failed to process refund',
      };
    }
  }

  /**
   * Get provider's bank accounts
   */
  async getProviderBankAccounts(providerId: string): Promise<BankAccount[]> {
    await this.ensureInitialized();

    try {
      const response = await this.client.queries.getProviderBankAccounts({
        providerId,
      });

      if (!response.data) {
        return [];
      }

      return response.data.map((account: any) => ({
        id: account.id,
        routingNumber: account.routingNumber,
        accountNumber: account.accountNumber,
        accountType: account.accountType as BankAccount['accountType'],
        bankName: account.bankName,
        accountHolderName: account.accountHolderName,
        isVerified: account.isVerified,
        isDefault: account.isDefault,
      }));
    } catch (error) {
      console.error('Failed to get provider bank accounts:', error);
      return [];
    }
  }

  /**
   * Get provider's payout history
   */
  async getProviderPayouts(providerId: string): Promise<PayoutRequest[]> {
    await this.ensureInitialized();

    try {
      const response = await this.client.queries.getProviderPayouts({
        providerId,
      });

      if (!response.data) {
        return [];
      }

      return response.data.map((payout: any) => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        bankAccountId: payout.bankAccountId,
        status: payout.status as PayoutRequest['status'],
        estimatedArrival: payout.estimatedArrival,
        metadata: payout.metadata || {},
      }));
    } catch (error) {
      console.error('Failed to get provider payouts:', error);
      return [];
    }
  }

  /**
   * Get platform fee configuration
   */
  getPlatformFee(): { percentage: number; minimumCents: number } {
    return {
      percentage: 8.0, // 8% platform fee
      minimumCents: parseInt(process.env.MINIMUM_TRANSACTION_CENTS || '50', 10),
    };
  }

  /**
   * Calculate fees for a transaction
   */
  calculateFees(amountCents: number): {
    platformFeeCents: number;
    processingFeeCents: number;
    providerAmountCents: number;
    totalFeeCents: number;
  } {
    const platformFee = this.getPlatformFee();
    const platformFeeCents = Math.max(
      Math.round(amountCents * (platformFee.percentage / 100)),
      platformFee.minimumCents
    );

    // AWS native processing costs are minimal
    const processingFeeCents = 5; // ~$0.05 per transaction
    const totalFeeCents = platformFeeCents + processingFeeCents;
    const providerAmountCents = amountCents - totalFeeCents;

    return {
      platformFeeCents,
      processingFeeCents,
      providerAmountCents,
      totalFeeCents,
    };
  }
}

// Create a singleton instance
export const awsPaymentClient = new AWSPaymentClient();

// Export for direct use
export default awsPaymentClient;

// Utility functions
export function formatAmount(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function validateCardNumber(cardNumber: string): boolean {
  // Basic Luhn algorithm validation
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);

    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }

    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function getCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');

  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6/.test(digits)) return 'discover';

  return 'unknown';
}

export function validateExpirationDate(month: number, year: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (month < 1 || month > 12) return false;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

export function validateCVC(cvc: string, cardBrand: string): boolean {
  const digits = cvc.replace(/\D/g, '');

  if (cardBrand === 'amex') {
    return digits.length === 4;
  }

  return digits.length === 3;
}