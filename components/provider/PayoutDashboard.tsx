'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { awsPaymentClient, PayoutRequest, BankAccount, formatAmount } from '@/lib/aws-payment-client';

interface PayoutSummary {
  totalEarnings: number;
  availableBalance: number;
  pendingPayouts: number;
  lastPayoutDate: string | null;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

interface EscrowHold {
  id: string;
  amount: number;
  serviceName: string;
  customerName: string;
  holdUntil: string;
  status: 'holding' | 'releasing' | 'released';
}

interface PayoutDashboardProps {
  providerId: string;
  onError?: (error: string) => void;
}

export function PayoutDashboard({ providerId, onError }: PayoutDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [escrowHolds, setEscrowHolds] = useState<EscrowHold[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setIsRefreshing(true);
      
      const [payoutHistory, accounts] = await Promise.all([
        awsPaymentClient.getProviderPayouts(providerId),
        awsPaymentClient.getProviderBankAccounts(providerId),
      ]);

      setPayouts(payoutHistory);
      setBankAccounts(accounts);

      // Calculate summary statistics
      const now = new Date();
      const thisMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const lastMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));

      const completedPayouts = payoutHistory.filter(p => p.status === 'completed');
      const pendingPayouts = payoutHistory.filter(p => p.status === 'pending' || p.status === 'processing');

      const totalEarnings = completedPayouts.reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

      // Mock data for this month and last month earnings (would come from service completions)
      const thisMonthEarnings = completedPayouts
        .filter(p => new Date(p.estimatedArrival) >= thisMonthStart)
        .reduce((sum, p) => sum + p.amount, 0);

      const lastMonthEarnings = completedPayouts
        .filter(p => {
          const date = new Date(p.estimatedArrival);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const lastPayout = completedPayouts
        .sort((a, b) => new Date(b.estimatedArrival).getTime() - new Date(a.estimatedArrival).getTime())[0];

      setSummary({
        totalEarnings,
        availableBalance: 0, // Would be calculated from completed services minus payouts
        pendingPayouts: pendingAmount,
        lastPayoutDate: lastPayout?.estimatedArrival || null,
        thisMonthEarnings,
        lastMonthEarnings,
      });

      // Mock escrow holds data
      setEscrowHolds([
        {
          id: '1',
          amount: 8500,
          serviceName: 'House Cleaning Service',
          customerName: 'Sarah Johnson',
          holdUntil: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'holding',
        },
        {
          id: '2',
          amount: 12000,
          serviceName: 'Lawn Care Package',
          customerName: 'Mike Wilson',
          holdUntil: format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'releasing',
        },
      ]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [providerId]);

  // Filter payouts based on selected criteria
  const filteredPayouts = payouts.filter(payout => {
    const statusMatch = selectedStatus === 'all' || payout.status === selectedStatus;
    
    const payoutDate = new Date(payout.estimatedArrival);
    const now = new Date();
    let dateMatch = true;

    switch (selectedTimeRange) {
      case '7d':
        dateMatch = payoutDate >= subDays(now, 7);
        break;
      case '30d':
        dateMatch = payoutDate >= subDays(now, 30);
        break;
      case '90d':
        dateMatch = payoutDate >= subDays(now, 90);
        break;
      case 'all':
        dateMatch = true;
        break;
    }

    return statusMatch && dateMatch;
  });

  const getStatusBadge = (status: PayoutRequest['status']) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    const icons = {
      pending: Clock,
      processing: RefreshCw,
      completed: CheckCircle,
      failed: AlertCircle,
    };

    const Icon = icons[status];
    
    return (
      <Badge className={variants[status]}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getEscrowStatusBadge = (status: EscrowHold['status']) => {
    const variants = {
      holding: 'bg-orange-100 text-orange-800',
      releasing: 'bg-blue-100 text-blue-800',
      released: 'bg-green-100 text-green-800',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading payout dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No payout data available.</AlertDescription>
      </Alert>
    );
  }

  const earningsChange = summary.lastMonthEarnings > 0 
    ? ((summary.thisMonthEarnings - summary.lastMonthEarnings) / summary.lastMonthEarnings) * 100
    : 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payout Dashboard</h1>
          <p className="text-gray-600">Manage your earnings and payout schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(summary.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(summary.availableBalance)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(summary.pendingPayouts)}</div>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            {earningsChange >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(summary.thisMonthEarnings)}</div>
            <p className={`text-xs ${earningsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {earningsChange >= 0 ? '+' : ''}{earningsChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Escrow Holdings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Funds in Escrow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escrowHolds.length > 0 ? (
            <div className="space-y-4">
              {escrowHolds.map((hold) => (
                <div key={hold.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{hold.serviceName}</div>
                    <div className="text-sm text-gray-600">Customer: {hold.customerName}</div>
                    <div className="text-xs text-gray-500">
                      Available: {format(new Date(hold.holdUntil), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{formatAmount(hold.amount)}</div>
                      {getEscrowStatusBadge(hold.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No funds currently in escrow
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Payout Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bankAccounts.length > 0 ? (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="font-medium">{account.bankName}</div>
                      <div className="text-sm text-gray-600">
                        {account.accountType} ****{account.last4}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.isDefault && (
                      <Badge variant="outline">Default</Badge>
                    )}
                    {account.isVerified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No bank accounts configured</p>
              <Button>Add Bank Account</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payout History</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length > 0 ? (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{formatAmount(payout.amount)}</div>
                      {getStatusBadge(payout.status)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(new Date(payout.estimatedArrival), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Bank ****{bankAccounts.find(acc => acc.id === payout.bankAccountId)?.last4}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No payouts found for the selected criteria
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cost Savings Information */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Cost Savings with AWS Native Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-700">$0.25</div>
              <div className="text-sm text-green-600">ACH Transfer Fee</div>
              <div className="text-xs text-gray-600">vs $0.25 + 0.25% with Stripe</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">~$0.05</div>
              <div className="text-sm text-green-600">Processing Fee per Transaction</div>
              <div className="text-xs text-gray-600">vs 2.9% + $0.30 with Stripe</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">98%</div>
              <div className="text-sm text-green-600">Cost Reduction</div>
              <div className="text-xs text-gray-600">Compared to traditional processors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}