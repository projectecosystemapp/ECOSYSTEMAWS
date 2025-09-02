'use client';

import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import MetricCard from '@/components/admin/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface AnalyticsData {
  revenue: {
    total: number;
    commission: number;
    providerEarnings: number;
  };
  categories: Record<string, {
    servicesCount: number;
    bookingsCount: number;
    revenue: number;
  }>;
  conversion: {
    rate: number;
    totalViews: number;
    totalBookings: number;
  };
  topProviders: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    totalRevenue: number;
    bookingsCount: number;
    averageRating: number;
    platformCommission: number;
  }>;
  userGrowth: {
    total: number;
    customers: number;
    providers: number;
    admins: number;
  };
}

export default function AnalyticsDashboard(): JSX.Element {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async (): Promise<void> => {
      try {
        setLoading(true);
        // adminApi not yet implemented - using mock data for now
        // const analyticsData = await adminApi.getAnalyticsData();
        const analyticsData: AnalyticsData | null = null;
        setAnalytics(analyticsData);
      } catch (error) {
        logger.error('Error fetching analytics', error as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProviderDisplayName = (provider: AnalyticsData['topProviders'][0]): string => {
    if (provider.businessName && provider.businessName.trim()) return provider.businessName;
    if (provider.firstName && provider.firstName.trim() && provider.lastName && provider.lastName.trim()) {
      return `${provider.firstName} ${provider.lastName}`;
    }
    return provider.email;
  };

  // Prepare category data for table
  const categoryData = analytics !== null ? Object.entries(analytics.categories).map(([name, stats]) => ({
    id: name,
    name,
    ...stats
  })) : [];

  const categoryColumns = [
    {
      key: 'name',
      label: 'Category',
      sortable: true
    },
    {
      key: 'servicesCount',
      label: 'Services',
      sortable: true
    },
    {
      key: 'bookingsCount',
      label: 'Bookings',
      sortable: true
    },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    }
  ];

  const providerColumns = [
    {
      key: 'email',
      label: 'Provider',
      sortable: true,
      render: (value: string, row: AnalyticsData['topProviders'][0]) => (
        <div>
          <div className="font-medium text-gray-900">
            {getProviderDisplayName(row)}
          </div>
          <div className="text-sm text-gray-500">{value}</div>
        </div>
      )
    },
    {
      key: 'totalRevenue',
      label: 'Revenue',
      sortable: true,
      render: (value: number) => (
        <div className="font-medium text-green-600">
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'bookingsCount',
      label: 'Bookings',
      sortable: true
    },
    {
      key: 'averageRating',
      label: 'Rating',
      sortable: true,
      render: (value: number) => (
        <div className="font-medium">
          {value > 0 ? value.toFixed(1) : 'No rating'}
        </div>
      )
    },
    {
      key: 'platformCommission',
      label: 'Commission',
      sortable: true,
      render: (value: number) => (
        <div className="font-medium text-blue-600">
          {formatCurrency(value)}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <AdminLayout title="Platform Analytics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Platform Analytics">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(analytics?.revenue.total || 0)}
          icon="💰"
          subtitle="All-time platform revenue"
        />
        <MetricCard
          title="Platform Commission"
          value={formatCurrency(analytics?.revenue.commission || 0)}
          icon="📊"
          subtitle="8% commission earned"
        />
        <MetricCard
          title="Provider Earnings"
          value={formatCurrency(analytics?.revenue.providerEarnings || 0)}
          icon="💸"
          subtitle="92% paid to providers"
        />
      </div>

      {/* User Growth & Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={analytics?.userGrowth.total || 0}
          icon="👥"
          subtitle="Platform users"
        />
        <MetricCard
          title="Customers"
          value={analytics?.userGrowth.customers || 0}
          icon="🛒"
          subtitle="Service buyers"
        />
        <MetricCard
          title="Providers"
          value={analytics?.userGrowth.providers || 0}
          icon="🏢"
          subtitle="Service sellers"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${analytics?.conversion.rate || 0}%`}
          icon="📈"
          subtitle={`${analytics?.conversion.totalBookings || 0} of ${analytics?.conversion.totalViews || 0} views`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div>
          <DataTable
            title="Category Performance"
            columns={categoryColumns}
            data={categoryData}
            loading={false}
            emptyMessage="No category data available"
          />
        </div>

        {/* Top Providers */}
        <div>
          <DataTable
            title="Top Providers by Revenue"
            columns={providerColumns}
            data={analytics?.topProviders || []}
            loading={false}
            emptyMessage="No provider data available"
          />
        </div>
      </div>

      {/* Revenue Breakdown Chart Placeholder */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Commission Split */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Commission Split</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                      <span className="text-sm">Platform (8%)</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(analytics?.revenue.commission || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                      <span className="text-sm">Providers (92%)</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(analytics?.revenue.providerEarnings || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Revenue */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Top Categories by Revenue</h4>
                <div className="space-y-3">
                  {Object.entries(analytics?.categories || {})
                    .sort(([,a], [,b]) => {
                      return b.revenue - a.revenue;
                    })
                    .slice(0, 5)
                    .map(([category, stats]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm">{category}</span>
                        <span className="font-medium">
                          {formatCurrency(stats.revenue)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 text-center">
                📈 Advanced charts and visualizations coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}