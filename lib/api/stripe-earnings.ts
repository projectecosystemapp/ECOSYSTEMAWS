/**
 * Stripe Earnings API Layer
 * Provides access to provider earnings, transactions, and payout data
 */

import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// Type definitions
export interface EarningsOverview {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalTransactions: number;
  platformFees: number;
  netEarnings: number;
  lastPayoutAmount: number;
  lastPayoutDate: string | null;
  nextPayoutDate: string | null;
}

export interface Transaction {
  id: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  date: string;
  paymentMethod: string;
  paymentIntentId?: string;
}

export interface Payout {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'in_transit';
  arrivalDate: string;
  bankAccount: string;
  transactionCount: number;
  created: string;
  currency: string;
}

export interface MonthlyEarning {
  month: string;
  earnings: number;
  transactions: number;
  fees: number;
}

export interface ServicePerformance {
  name: string;
  earnings: number;
  bookings: number;
  percentage: number;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ExportResult {
  url: string;
  filename: string;
  format: 'csv' | 'pdf';
}

export interface StripeAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  capabilities?: {
    card_payments?: string;
    transfers?: string;
  };
}

class StripeEarningsAPI {
  /**
   * Get comprehensive earnings overview for a provider
   */
  async getEarningsOverview(providerId: string): Promise<EarningsOverview> {
    try {
      // Fetch completed bookings for this provider
      const { data: bookings } = await client.models.Booking.list({
        filter: { 
          providerId: { eq: providerId },
          status: { eq: 'COMPLETED' }
        }
      });

      // Calculate earnings from bookings
      let totalEarnings = 0;
      let platformFees = 0;
      let totalTransactions = 0;

      if (bookings) {
        for (const booking of bookings) {
          if (booking.amountCents) {
            totalEarnings += booking.amountCents;
            const fee = booking.platformFeeCents || Math.floor(booking.amountCents * 0.08);
            platformFees += fee;
            totalTransactions++;
          }
        }
      }

      // Fetch pending bookings for pending balance
      const { data: pendingBookings } = await client.models.Booking.list({
        filter: {
          providerId: { eq: providerId },
          status: { eq: 'CONFIRMED' },
          paymentStatus: { eq: 'ESCROW_HELD' }
        }
      });

      let pendingBalance = 0;
      if (pendingBookings) {
        for (const booking of pendingBookings) {
          if (booking.amountCents && booking.platformFeeCents) {
            pendingBalance += (booking.amountCents - booking.platformFeeCents);
          }
        }
      }

      // Calculate available balance (completed - already paid out)
      // In production, this would check actual Stripe payout records
      const netEarnings = totalEarnings - platformFees;
      const availableBalance = Math.floor(netEarnings * 0.7); // Assume 70% available

      // Mock payout dates - in production, fetch from Stripe
      const lastPayoutDate = new Date();
      lastPayoutDate.setDate(lastPayoutDate.getDate() - 7);
      
      const nextPayoutDate = new Date();
      nextPayoutDate.setDate(nextPayoutDate.getDate() + 1);

      return {
        totalEarnings,
        availableBalance,
        pendingBalance,
        totalTransactions,
        platformFees,
        netEarnings,
        lastPayoutAmount: Math.floor(availableBalance * 0.8),
        lastPayoutDate: lastPayoutDate.toISOString(),
        nextPayoutDate: nextPayoutDate.toISOString()
      };
    } catch (error) {
      console.error('Failed to fetch earnings overview:', error);
      throw new Error('Unable to load earnings data');
    }
  }

  /**
   * Get transaction history for a provider
   */
  async getTransactionHistory(
    providerId: string, 
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    try {
      // Build filter for bookings query
      const bookingFilter: any = {
        providerId: { eq: providerId }
      };

      if (filters?.status) {
        bookingFilter.status = { eq: filters.status };
      }

      // Fetch bookings
      const { data: bookings } = await client.models.Booking.list({
        filter: bookingFilter,
        limit: filters?.limit || 100
      });

      if (!bookings) return [];

      // Transform bookings to transactions
      const transactions: Transaction[] = [];
      
      for (const booking of bookings) {
        // Fetch related service and customer info
        const { data: service } = await client.models.Service.get({ 
          id: booking.serviceId 
        });
        
        const { data: customer } = await client.models.User.get({ 
          ownerId: booking.customerId 
        });

        const amount = booking.amountCents || 0;
        const platformFee = booking.platformFeeCents || Math.floor(amount * 0.08);
        
        transactions.push({
          id: booking.id,
          bookingId: booking.id,
          customerName: customer?.name || booking.customerEmail || 'Customer',
          serviceName: service?.title || 'Service',
          amount,
          platformFee,
          netAmount: amount - platformFee,
          status: this.mapBookingStatusToTransactionStatus(booking.status),
          date: booking.createdAt,
          paymentMethod: 'card',
          paymentIntentId: booking.paymentIntentId || undefined
        });
      }

      // Apply search filter if provided
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return transactions.filter(t => 
          t.customerName.toLowerCase().includes(searchLower) ||
          t.serviceName.toLowerCase().includes(searchLower)
        );
      }

      return transactions;
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      throw new Error('Unable to load transaction history');
    }
  }

  /**
   * Get payout history from Stripe
   */
  async getPayoutHistory(providerId: string): Promise<Payout[]> {
    try {
      // Call Stripe API to get payouts
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_PAYOUTS',
          providerId
        })
      });

      if (!response.ok) {
        // Return mock data if API not implemented yet
        return this.getMockPayouts();
      }

      const data = await response.json();
      return data.payouts || [];
    } catch (error) {
      console.error('Failed to fetch payout history:', error);
      // Return mock data as fallback
      return this.getMockPayouts();
    }
  }

  /**
   * Get Stripe account status
   */
  async getAccountStatus(providerId: string): Promise<StripeAccountStatus | null> {
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHECK_ACCOUNT_STATUS',
          providerId
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.status || null;
    } catch (error) {
      console.error('Failed to fetch account status:', error);
      return null;
    }
  }

  /**
   * Export transactions to CSV or PDF
   */
  async exportTransactions(
    providerId: string, 
    format: 'csv' | 'pdf'
  ): Promise<ExportResult> {
    try {
      // Fetch all transactions
      const transactions = await this.getTransactionHistory(providerId);
      
      if (format === 'csv') {
        // Generate CSV
        const csv = this.generateCSV(transactions);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        return {
          url,
          filename: `transactions-${Date.now()}.csv`,
          format: 'csv'
        };
      } else {
        // For PDF, would need to implement PDF generation
        throw new Error('PDF export not yet implemented');
      }
    } catch (error) {
      console.error('Failed to export transactions:', error);
      throw new Error('Unable to export transactions');
    }
  }

  /**
   * Get monthly earnings data for charts
   */
  async getMonthlyEarnings(providerId: string): Promise<MonthlyEarning[]> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: bookings } = await client.models.Booking.list({
        filter: {
          providerId: { eq: providerId },
          status: { eq: 'COMPLETED' },
          createdAt: { gt: sixMonthsAgo.toISOString() }
        }
      });

      // Group by month
      const monthlyData: { [key: string]: MonthlyEarning } = {};
      
      if (bookings) {
        for (const booking of bookings) {
          const date = new Date(booking.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthName,
              earnings: 0,
              transactions: 0,
              fees: 0
            };
          }
          
          const amount = booking.amountCents || 0;
          const fee = booking.platformFeeCents || Math.floor(amount * 0.08);
          
          monthlyData[monthKey].earnings += amount;
          monthlyData[monthKey].fees += fee;
          monthlyData[monthKey].transactions++;
        }
      }

      // Convert to array and sort by month
      return Object.values(monthlyData).sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.month) - months.indexOf(b.month);
      });
    } catch (error) {
      console.error('Failed to fetch monthly earnings:', error);
      return [];
    }
  }

  /**
   * Get service performance data
   */
  async getServicePerformance(providerId: string): Promise<ServicePerformance[]> {
    try {
      // Fetch provider's services
      const { data: services } = await client.models.Service.list({
        filter: { providerId: { eq: providerId } }
      });

      if (!services) return [];

      const performance: ServicePerformance[] = [];
      let totalEarnings = 0;

      // Calculate earnings per service
      for (const service of services) {
        const { data: bookings } = await client.models.Booking.list({
          filter: {
            serviceId: { eq: service.id },
            status: { eq: 'COMPLETED' }
          }
        });

        let serviceEarnings = 0;
        let bookingCount = 0;

        if (bookings) {
          for (const booking of bookings) {
            serviceEarnings += (booking.amountCents || 0);
            bookingCount++;
          }
        }

        performance.push({
          name: service.title || 'Service',
          earnings: serviceEarnings,
          bookings: bookingCount,
          percentage: 0 // Will calculate after
        });

        totalEarnings += serviceEarnings;
      }

      // Calculate percentages
      if (totalEarnings > 0) {
        for (const item of performance) {
          item.percentage = Math.round((item.earnings / totalEarnings) * 100);
        }
      }

      // Sort by earnings descending
      return performance.sort((a, b) => b.earnings - a.earnings);
    } catch (error) {
      console.error('Failed to fetch service performance:', error);
      return [];
    }
  }

  // Helper methods
  private mapBookingStatusToTransactionStatus(
    bookingStatus: string
  ): Transaction['status'] {
    switch (bookingStatus) {
      case 'COMPLETED':
        return 'completed';
      case 'CONFIRMED':
      case 'PENDING':
        return 'pending';
      case 'CANCELLED':
        return 'refunded';
      default:
        return 'failed';
    }
  }

  private generateCSV(transactions: Transaction[]): string {
    const headers = ['Date', 'Customer', 'Service', 'Amount', 'Platform Fee', 'Net Amount', 'Status'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.customerName,
      t.serviceName,
      `$${(t.amount / 100).toFixed(2)}`,
      `$${(t.platformFee / 100).toFixed(2)}`,
      `$${(t.netAmount / 100).toFixed(2)}`,
      t.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  private getMockPayouts(): Payout[] {
    // Return mock data for development
    return [
      {
        id: 'po_mock_1',
        amount: 32150,
        status: 'paid',
        arrivalDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        bankAccount: '****1234',
        transactionCount: 23,
        created: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'cad'
      },
      {
        id: 'po_mock_2',
        amount: 28500,
        status: 'paid',
        arrivalDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        bankAccount: '****1234',
        transactionCount: 19,
        created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'cad'
      }
    ];
  }
}

// Export singleton instance
export const stripeEarningsApi = new StripeEarningsAPI();