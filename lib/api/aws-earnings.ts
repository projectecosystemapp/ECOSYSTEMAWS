import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// AWS Native Payment Types
export interface EarningsOverview {
  totalEarnings: number;
  totalPayouts: number;
  pendingPayouts: number;
  processingFees: number;
  netEarnings: number;
  transactionCount: number;
  averageTransaction: number;
  monthOverMonthGrowth: number;
}

export interface Transaction {
  id: string;
  serviceId: string;
  serviceName: string;
  customerEmail: string;
  amount: number;
  platformFee: number;
  providerEarnings: number;
  processingFee: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'ach';
  createdAt: string;
  completedAt?: string;
}

export interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccount: string;
  scheduledDate: string;
  completedDate?: string;
  transactionCount: number;
  processingFee: number;
  achTransferId?: string;
}

export interface MonthlyEarning {
  month: string;
  earnings: number;
  transactions: number;
  payouts: number;
  growth: number;
}

export interface ServicePerformance {
  serviceId: string;
  serviceName: string;
  totalEarnings: number;
  transactionCount: number;
  averageAmount: number;
  conversionRate: number;
  rating: number;
}

class AwsEarningsApi {
  async getEarningsOverview(providerId: string): Promise<EarningsOverview> {
    try {
      const result = await client.queries.payoutManager({
        action: 'get_earnings_overview',
        providerId,
      });

      if (result.data?.success) {
        return {
          totalEarnings: result.data.totalEarnings || 0,
          totalPayouts: result.data.totalPayouts || 0,
          pendingPayouts: result.data.pendingPayouts || 0,
          processingFees: result.data.processingFees || 0,
          netEarnings: result.data.netEarnings || 0,
          transactionCount: result.data.transactionCount || 0,
          averageTransaction: result.data.averageTransaction || 0,
          monthOverMonthGrowth: result.data.monthOverMonthGrowth || 0,
        };
      }

      throw new Error(result.data?.error || 'Failed to fetch earnings overview');
    } catch (error) {
      console.error('Error fetching earnings overview:', error);
      throw error;
    }
  }

  async getTransactions(providerId: string, page = 1, limit = 50): Promise<Transaction[]> {
    try {
      const result = await client.queries.payoutManager({
        action: 'get_transactions',
        providerId,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (result.data?.success) {
        return (result.data.transactions || []).map((tx: any) => ({
          id: tx.id,
          serviceId: tx.serviceId,
          serviceName: tx.serviceName,
          customerEmail: tx.customerEmail,
          amount: parseFloat(tx.amount),
          platformFee: parseFloat(tx.platformFee),
          providerEarnings: parseFloat(tx.providerEarnings),
          processingFee: parseFloat(tx.processingFee),
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
        }));
      }

      throw new Error(result.data?.error || 'Failed to fetch transactions');
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getPayouts(providerId: string): Promise<Payout[]> {
    try {
      const result = await client.queries.achTransferManager({
        action: 'get_provider_payouts',
        providerId,
      });

      if (result.data?.success) {
        return (result.data.payouts || []).map((payout: any) => ({
          id: payout.id,
          amount: parseFloat(payout.amount),
          status: payout.status,
          bankAccount: payout.bankAccount,
          scheduledDate: payout.scheduledDate,
          completedDate: payout.completedDate,
          transactionCount: payout.transactionCount,
          processingFee: parseFloat(payout.processingFee),
          achTransferId: payout.achTransferId,
        }));
      }

      throw new Error(result.data?.error || 'Failed to fetch payouts');
    } catch (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }
  }

  async getMonthlyEarnings(providerId: string, months = 12): Promise<MonthlyEarning[]> {
    try {
      const result = await client.queries.payoutManager({
        action: 'get_monthly_earnings',
        providerId,
        months: months.toString(),
      });

      if (result.data?.success) {
        return (result.data.monthlyEarnings || []).map((earning: any) => ({
          month: earning.month,
          earnings: parseFloat(earning.earnings),
          transactions: earning.transactions,
          payouts: parseFloat(earning.payouts),
          growth: parseFloat(earning.growth),
        }));
      }

      throw new Error(result.data?.error || 'Failed to fetch monthly earnings');
    } catch (error) {
      console.error('Error fetching monthly earnings:', error);
      throw error;
    }
  }

  async getServicePerformance(providerId: string): Promise<ServicePerformance[]> {
    try {
      const result = await client.queries.payoutManager({
        action: 'get_service_performance',
        providerId,
      });

      if (result.data?.success) {
        return (result.data.services || []).map((service: any) => ({
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          totalEarnings: parseFloat(service.totalEarnings),
          transactionCount: service.transactionCount,
          averageAmount: parseFloat(service.averageAmount),
          conversionRate: parseFloat(service.conversionRate),
          rating: parseFloat(service.rating),
        }));
      }

      throw new Error(result.data?.error || 'Failed to fetch service performance');
    } catch (error) {
      console.error('Error fetching service performance:', error);
      throw error;
    }
  }

  async requestPayout(providerId: string, amount: number): Promise<void> {
    try {
      const result = await client.mutations.achTransferManager({
        action: 'request_payout',
        providerId,
        amount: amount.toString(),
      });

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
  }

  async getCostSavingsReport(providerId: string): Promise<{
    traditionProcessorCosts: number;
    awsNativeCosts: number;
    totalSavings: number;
    savingsPercentage: number;
  }> {
    try {
      const result = await client.queries.costMonitor({
        action: 'get_cost_savings',
        providerId,
      });

      if (result.data?.success) {
        return {
          traditionProcessorCosts: parseFloat(result.data.traditionalCosts),
          awsNativeCosts: parseFloat(result.data.awsCosts),
          totalSavings: parseFloat(result.data.totalSavings),
          savingsPercentage: parseFloat(result.data.savingsPercentage),
        };
      }

      throw new Error(result.data?.error || 'Failed to fetch cost savings report');
    } catch (error) {
      console.error('Error fetching cost savings report:', error);
      throw error;
    }
  }
}

export const awsEarningsApi = new AwsEarningsApi();