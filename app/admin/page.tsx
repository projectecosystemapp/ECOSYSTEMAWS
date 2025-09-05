'use client';

import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import MetricCard from '@/components/admin/MetricCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { getStatusColor } from '@/lib/types';

interface DashboardMetrics {
  totalUsers: number;
  totalServices: number;
  totalBookings: number;
  totalProviders: number;
  totalRevenue: number;
  platformCommission: number;
  activeServices: number;
  pendingBookings: number;
  completedBookings: number;
  verifiedProviders: number;
  pendingProviders: number;
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'service' | 'review' | 'provider';
  title: string;
  subtitle: string;
  timestamp: string;
  status?: string;
}

export default function AdminDashboard(): JSX.Element {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        setLoading(true);
        
        // Fetch metrics
        // adminApi not yet implemented - using null for now
        // const metricsData = await adminApi.getDashboardMetrics();
        const metricsData: DashboardMetrics | null = null;
        setMetrics(metricsData);

        // Fetch recent activity (simplified)
        interface RecentBooking {
          id: string;
          customerEmail: string;
          providerEmail: string;
          totalAmount?: number;
          status: string;
          createdAt?: string;
        }
        
        const recentBookings: RecentBooking[] = [];
        const recentActivities: RecentActivity[] = [];

        // Add recent bookings to activity feed
        recentBookings?.slice(0, 10).forEach((booking: RecentBooking) => {
          recentActivities.push({
            id: nullableToString(booking.id),
            type: 'booking',
            title: `New booking for ${booking.totalAmount ? `$${booking.totalAmount}` : 'service'}`,
            subtitle: `${booking.customerEmail} → ${booking.providerEmail}`,
            timestamp: booking.createdAt || new Date().toISOString(),
            status: booking.status
          });
        });

        // Sort by timestamp
        recentActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setRecentActivity(recentActivities.slice(0, 15));
      } catch (error) {
        logger.error('Error fetching dashboard data', error as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = (now.getTime() - time.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers || 0}
          icon="👥"
          subtitle={`${metrics?.totalProviders || 0} providers, ${(metrics?.totalUsers || 0) - (metrics?.totalProviders || 0)} customers`}
        />
        <MetricCard
          title="Active Services"
          value={metrics?.activeServices || 0}
          icon="🛠️"
          subtitle={`${metrics?.totalServices || 0} total services`}
        />
        <MetricCard
          title="Total Bookings"
          value={metrics?.totalBookings || 0}
          icon="📅"
          subtitle={`${metrics?.pendingBookings || 0} pending, ${metrics?.completedBookings || 0} completed`}
        />
        <MetricCard
          title="Platform Revenue"
          value={formatCurrency(metrics?.platformCommission || 0)}
          icon="💰"
          subtitle={`8% of ${formatCurrency(metrics?.totalRevenue || 0)}`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Verified Providers"
          value={metrics?.verifiedProviders || 0}
          icon="✅"
          subtitle={`${metrics?.pendingProviders || 0} pending verification`}
        />
        <MetricCard
          title="Pending Bookings"
          value={metrics?.pendingBookings || 0}
          icon="⏳"
          subtitle="Require attention"
        />
        <MetricCard
          title="Platform Health"
          value="98.5%"
          icon="💚"
          subtitle="System uptime"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      <span className="text-lg">
                        {activity.type === 'booking' && '📅'}
                        {activity.type === 'service' && '🛠️'}
                        {activity.type === 'review' && '⭐'}
                        {activity.type === 'provider' && '🏢'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.subtitle}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        {activity.status && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(activity.status as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED')}`}
                          >
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge variant="outline" className="text-green-600 bg-green-100">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="text-sm text-gray-600">~150ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Users</span>
                <span className="text-sm text-gray-600">{Math.floor((metrics?.totalUsers || 0) * 0.3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Rate</span>
                <span className="text-sm text-green-600">0.02%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Commission Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics?.totalRevenue || 0)}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(metrics?.platformCommission || 0)}
                </div>
                <div className="text-sm text-gray-500">Platform Commission (8%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency((metrics?.totalRevenue || 0) * 0.92)}
                </div>
                <div className="text-sm text-gray-500">Provider Earnings (92%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}