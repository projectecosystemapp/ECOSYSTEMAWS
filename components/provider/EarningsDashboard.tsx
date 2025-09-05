'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Search,
  Filter,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  RefreshCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { awsEarningsApi, type EarningsOverview, type Transaction, type Payout, type MonthlyEarning, type ServicePerformance } from '@/lib/api/aws-earnings';
import { formatPrice, formatDate } from '@/utils/format';


const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function EarningsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarning[]>([]);
  const [servicePerformance, setServicePerformance] = useState<ServicePerformance[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  
  // Filters and pagination
  const [timeFilter, setTimeFilter] = useState('30days');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    initializeProvider();
  }, []);

  useEffect(() => {
    if (providerId) {
      fetchEarningsData();
    }
  }, [timeFilter, providerId, retryCount]);

  const initializeProvider = async () => {
    try {
      const user = await getCurrentUser();
      setProviderId(user.userId);
    } catch (err) {
      console.error('Failed to get current user:', err);
      setError('Authentication error. Please sign in again.');
      setLoading(false);
    }
  };

  const fetchEarningsData = async () => {
    if (!providerId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel for better performance
      const [overviewData, transactionsData, payoutsData, monthlyData, performanceData] = await Promise.allSettled([
        awsEarningsApi.getEarningsOverview(providerId),
        awsEarningsApi.getTransactions(providerId, 1, 100),
        awsEarningsApi.getPayouts(providerId),
        awsEarningsApi.getMonthlyEarnings(providerId),
        awsEarningsApi.getServicePerformance(providerId)
      ]);

      // Handle overview data
      if (overviewData.status === 'fulfilled') {
        setOverview(overviewData.value);
      } else {
        console.error('Failed to fetch overview:', overviewData.reason);
      }

      // Handle transactions
      if (transactionsData.status === 'fulfilled') {
        setTransactions(transactionsData.value);
        setTotalPages(Math.ceil(transactionsData.value.length / itemsPerPage));
      } else {
        console.error('Failed to fetch transactions:', transactionsData.reason);
      }

      // Handle payouts
      if (payoutsData.status === 'fulfilled') {
        setPayouts(payoutsData.value);
      } else {
        console.error('Failed to fetch payouts:', payoutsData.reason);
      }

      // Handle monthly earnings
      if (monthlyData.status === 'fulfilled') {
        setMonthlyEarnings(monthlyData.value);
      } else {
        console.error('Failed to fetch monthly earnings:', monthlyData.reason);
      }

      // Handle service performance
      if (performanceData.status === 'fulfilled') {
        setServicePerformance(performanceData.value);
      } else {
        console.error('Failed to fetch service performance:', performanceData.reason);
      }

      // If all critical data failed, show error
      if (overviewData.status === 'rejected' && transactionsData.status === 'rejected') {
        setError('Unable to load earnings data. Please try again.');
      }
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      setError('An unexpected error occurred. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!providerId) return;
    
    try {
      // TODO: Implement export functionality with AWS earnings API
      console.log('Export functionality not yet implemented with AWS API');
      
      // Create download link
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(result.url), 100);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'refunded':
        return <Badge variant="secondary">Refunded</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Overview cards skeleton */}
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-semibold">Unable to Load Earnings</h2>
      <p className="text-gray-600 text-center max-w-md">
        {error || 'Something went wrong while loading your earnings data.'}
      </p>
      <Button onClick={handleRetry} variant="outline">
        <RefreshCcw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Wallet className="h-12 w-12 text-gray-400" />
      <h2 className="text-xl font-semibold">No Earnings Yet</h2>
      <p className="text-gray-600 text-center max-w-md">
        Start providing services to see your earnings here.
      </p>
      <Link href="/provider/services/new">
        <Button>
          Create Your First Service
        </Button>
      </Link>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState />;
  }

  if (!overview || overview.totalEarnings === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your earnings, transactions, and payouts</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setRetryCount(prev => prev + 1)}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(overview?.totalEarnings || 0)}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(overview?.availableBalance || 0)}</div>
            <p className="text-xs text-gray-600 mt-1">
              Ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(overview?.pendingBalance || 0)}</div>
            <p className="text-xs text-gray-600 mt-1">
              In escrow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Platform Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(overview?.platformFees || 0)}</div>
            <p className="text-xs text-gray-600 mt-1">
              8% commission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Information */}
      {overview?.nextPayoutDate && (
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Your next payout of <strong>{formatPrice(overview.availableBalance)}</strong> is scheduled for{' '}
            <strong>{formatDate(overview.nextPayoutDate, 'date-only')}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings Trend</CardTitle>
            <CardDescription>Monthly earnings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyEarnings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                <Tooltip formatter={(value: number) => formatPrice(value)} />
                <Line 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>Earnings by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={servicePerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="earnings"
                >
                  {servicePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatPrice(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Transactions and Payouts */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-700">Date</th>
                      <th className="text-left p-4 font-medium text-gray-700">Customer</th>
                      <th className="text-left p-4 font-medium text-gray-700">Service</th>
                      <th className="text-left p-4 font-medium text-gray-700">Amount</th>
                      <th className="text-left p-4 font-medium text-gray-700">Fee</th>
                      <th className="text-left p-4 font-medium text-gray-700">Net</th>
                      <th className="text-left p-4 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No transactions found for the selected period
                        </td>
                      </tr>
                    ) : (
                      transactions
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 text-sm">
                            {formatDate(transaction.date, 'short')}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {transaction.customerName}
                          </td>
                          <td className="p-4 text-sm">
                            {transaction.serviceName}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {formatPrice(transaction.amount)}
                          </td>
                          <td className="p-4 text-sm text-red-600">
                            -{formatPrice(transaction.platformFee)}
                          </td>
                          <td className="p-4 text-sm font-medium text-green-600">
                            {formatPrice(transaction.netAmount)}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(transaction.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, transactions.length)} of{' '}
                  {transactions.length} transactions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your recent payouts to your bank account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payouts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No payouts yet</p>
                    <p className="text-sm mt-1">Your first payout will appear here</p>
                  </div>
                ) : (
                  payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          payout.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {payout.status === 'paid' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{formatPrice(payout.amount)}</p>
                          <p className="text-sm text-gray-600">
                            {payout.transactionCount} transactions • Bank ****{payout.bankAccount}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatDate(payout.arrivalDate, 'date-only')}
                        </p>
                        {getStatusBadge(payout.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payout Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Payout Settings</CardTitle>
              <CardDescription>Manage your payout schedule and bank account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payout Schedule</p>
                  <p className="text-sm text-gray-600">Daily automatic payouts</p>
                </div>
                <Button variant="outline" size="sm">Change</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bank Account</p>
                  <p className="text-sm text-gray-600">****1234 - TD Canada Trust</p>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}