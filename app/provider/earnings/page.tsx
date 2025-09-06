'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  PiggyBank,
  ArrowUpRight
} from 'lucide-react';

const client = generateClient<Schema>();

interface EarningsData {
  totalEarnings: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
  completedBookings: number;
  pendingBookings: number;
  averageBookingValue: number;
  costSavings: {
    monthlyVolume: number;
    stripeCost: number;
    awsCost: number;
    savings: number;
    savingsPercentage: number;
  };
}

interface Transaction {
  id: string;
  date: string;
  type: 'payment' | 'payout' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  description: string;
  bookingId?: string;
  customerId?: string;
  fees: number;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  lastFourDigits: string;
  isDefault: boolean;
  status: 'active' | 'pending_verification' | 'verified';
}

export default function ProviderEarningsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    loadEarningsData();
  }, [selectedTimeRange]);

  const loadEarningsData = async () => {
    setIsLoading(true);
    try {
      // Load provider earnings data from AWS native payment system
      const earningsResult = await client.mutations.manageProviderEarnings({
        action: 'get_earnings_summary',
        timeRange: selectedTimeRange,
        includeProjections: true,
        includeCostComparison: true, // AWS vs Stripe comparison
      });

      if (earningsResult.data?.success) {
        setEarningsData(earningsResult.data.earningsData);
      }

      // Load transaction history
      const transactionsResult = await client.mutations.manageProviderEarnings({
        action: 'get_transaction_history',
        timeRange: selectedTimeRange,
        limit: 50,
      });

      if (transactionsResult.data?.success) {
        setTransactions(transactionsResult.data.transactions || []);
      }

      // Load bank accounts for ACH payouts
      const bankAccountsResult = await client.mutations.manageBankAccount({
        action: 'list',
      });

      if (bankAccountsResult.data?.success) {
        setBankAccounts(bankAccountsResult.data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPayout = async (amount: number) => {
    try {
      const result = await client.mutations.manageACHTransfer({
        action: 'request_payout',
        amount,
        transferType: 'payout',
        priority: 'standard',
        metadata: {
          source: 'earnings_dashboard',
          requestedBy: 'provider',
        }
      });

      if (result.data?.success) {
        alert('Payout requested successfully! Funds will arrive in 1-2 business days via ACH.');
        loadEarningsData(); // Refresh data
      } else {
        alert(result.data?.error || 'Payout request failed');
      }
    } catch (error) {
      console.error('Payout request error:', error);
      alert('Payout request failed. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'payout':
        return <Download className="h-4 w-4 text-blue-600" />;
      case 'refund':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading earnings data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!earningsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No earnings data available</h2>
          <p className="text-gray-600">Complete your first booking to see earnings data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AWS Native Earnings Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your earnings with 98% cost savings vs traditional processors</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button onClick={() => loadEarningsData()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* AWS Cost Savings Banner */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <PiggyBank className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  AWS Native Payment Processing
                </h3>
                <p className="text-green-700">
                  You're saving {earningsData.costSavings.savingsPercentage}% compared to Stripe (${earningsData.costSavings.stripeCost}/month → ${earningsData.costSavings.awsCost}/month)
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-900">
                {formatCurrency(earningsData.costSavings.savings)}
              </div>
              <div className="text-sm text-green-600">Monthly savings</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-green-200">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-900">
                {formatCurrency(earningsData.costSavings.monthlyVolume)}
              </div>
              <div className="text-sm text-green-600">Monthly Volume</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 line-through">
                {formatCurrency(earningsData.costSavings.stripeCost)}
              </div>
              <div className="text-xs text-gray-500">Stripe would cost</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-900">
                {formatCurrency(earningsData.costSavings.awsCost)}
              </div>
              <div className="text-sm text-green-600">AWS actual cost</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-900 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 mr-1" />
                98%
              </div>
              <div className="text-sm text-green-600">Cost reduction</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earningsData.totalEarnings)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>15% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available for Payout</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earningsData.pendingPayouts)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Download className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <Button 
                size="sm" 
                onClick={() => requestPayout(earningsData.pendingPayouts)}
                disabled={earningsData.pendingPayouts <= 0}
              >
                Request ACH Payout
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earningsData.thisMonthEarnings)}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <span>{earningsData.completedBookings} completed services</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Service Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earningsData.averageBookingValue)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <span>{earningsData.pendingBookings} pending bookings</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="payouts">ACH Payout Settings</TabsTrigger>
          <TabsTrigger value="analytics">Cost Analytics</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No transactions yet</p>
                    <p className="text-sm text-gray-500 mt-1">Complete your first service booking to see transactions</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(transaction.date)} • {transaction.bookingId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {transaction.type === 'refund' ? '-' : '+'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </span>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                        {transaction.fees > 0 && (
                          <p className="text-xs text-gray-500">
                            AWS fee: {formatCurrency(transaction.fees)} (vs ${(transaction.amount * 0.029 + 0.30).toFixed(2)} Stripe)
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout Settings Tab */}
        <TabsContent value="payouts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connected Bank Accounts</CardTitle>
                <p className="text-sm text-gray-600">ACH direct deposits for instant payouts</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bankAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No bank accounts connected</p>
                      <Button onClick={() => window.location.href = '/provider/onboarding/bank-account'}>
                        Connect Bank Account
                      </Button>
                    </div>
                  ) : (
                    bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`p-4 border rounded-lg ${
                          account.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {account.bankName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {account.accountType} •••• {account.lastFourDigits}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {account.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            <Badge className={getStatusColor(account.status)}>
                              {account.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Schedule</CardTitle>
                <p className="text-sm text-gray-600">Automated ACH transfers</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Auto Payouts</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Schedule</span>
                    <span className="text-sm text-gray-900">Daily at 6 PM EST</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Minimum Amount</span>
                    <span className="text-sm text-gray-900">{formatCurrency(25)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Transfer Method</span>
                    <span className="text-sm text-gray-900">ACH Direct Deposit</span>
                  </div>
                  <div className="pt-4 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      Update Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Comparison Analytics</CardTitle>
                <p className="text-sm text-gray-600">AWS vs Traditional Payment Processors</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(earningsData.costSavings.stripeCost)}
                      </div>
                      <div className="text-sm text-red-600 mt-1">Stripe Monthly Cost</div>
                      <div className="text-xs text-red-500 mt-1">2.9% + $0.30 per transaction</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(earningsData.costSavings.awsCost)}
                      </div>
                      <div className="text-sm text-green-600 mt-1">AWS Monthly Cost</div>
                      <div className="text-xs text-green-500 mt-1">~0.3% total processing</div>
                    </div>
                  </div>
                  
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <div className="text-4xl font-bold text-blue-600">
                      {formatCurrency(earningsData.costSavings.savings)}
                    </div>
                    <div className="text-lg text-blue-600 mt-2">Monthly Savings</div>
                    <div className="text-sm text-blue-500 mt-1">
                      {formatCurrency(earningsData.costSavings.savings * 12)}/year savings
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <p className="text-sm text-gray-600">Your service performance</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {earningsData.completedBookings}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">Completed Services</div>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(earningsData.averageBookingValue)}
                    </div>
                    <div className="text-sm text-green-600 mt-1">Average Service Value</div>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {earningsData.costSavings.savingsPercentage}%
                    </div>
                    <div className="text-sm text-purple-600 mt-1">Cost Reduction vs Stripe</div>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">AWS Payment Benefits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">98% lower fees</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">Direct ACH payouts</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">PCI DSS compliance</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">AWS fraud detection</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}