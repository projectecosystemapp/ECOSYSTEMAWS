'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, providerApi } from '@/lib/api';

interface ProviderWithStats {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  active: boolean;
  servicesCount: number;
  bookingsCount: number;
  reviewsCount: number;
  averageRating: number;
  totalRevenue: number;
  platformCommission: number;
  providerEarnings: number;
  completedBookings: number;
  activeServices: number;
  createdAt?: string;
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState<ProviderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const providersData = await adminApi.getProvidersWithStats();
        setProviders(providersData);
      } catch (error) {
        console.error('Error fetching providers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const handleVerificationStatusChange = async (
    providerId: string, 
    newStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  ) => {
    try {
      await providerApi.updateVerificationStatus(providerId, newStatus);
      
      // Refresh providers list
      const providersData = await adminApi.getProvidersWithStats();
      setProviders(providersData);
      
      // Update selected provider if it's the one being changed
      if (selectedProvider?.id === providerId) {
        const updatedProvider = providersData.find((p: any) => p.id === providerId);
        setSelectedProvider(updatedProvider || null);
      }
    } catch (error) {
      console.error('Error updating provider verification status:', error);
    }
  };

  const handleToggleActive = async (providerId: string, currentActive: boolean) => {
    try {
      await providerApi.update({ id: providerId, active: !currentActive });
      
      // Refresh providers list
      const providersData = await adminApi.getProvidersWithStats();
      setProviders(providersData);
      
      // Update selected provider if it's the one being changed
      if (selectedProvider?.id === providerId) {
        const updatedProvider = providersData.find((p: any) => p.id === providerId);
        setSelectedProvider(updatedProvider || null);
      }
    } catch (error) {
      console.error('Error toggling provider status:', error);
    }
  };

  const filteredProviders = providers.filter(provider => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'verified') return provider.verificationStatus === 'APPROVED';
    if (filterStatus === 'pending') return provider.verificationStatus === 'PENDING';
    if (filterStatus === 'rejected') return provider.verificationStatus === 'REJECTED';
    if (filterStatus === 'stripe') return provider.stripeOnboardingComplete;
    return true;
  });

  const getProviderDisplayName = (provider: ProviderWithStats) => {
    if (provider.businessName) return provider.businessName;
    if (provider.firstName && provider.lastName) {
      return `${provider.firstName} ${provider.lastName}`;
    }
    return provider.email;
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const columns = [
    {
      key: 'email',
      label: 'Provider',
      sortable: true,
      render: (value: string, row: ProviderWithStats) => (
        <div>
          <div className="font-medium text-gray-900">
            {getProviderDisplayName(row)}
          </div>
          <div className="text-sm text-gray-500">{value}</div>
        </div>
      )
    },
    {
      key: 'verificationStatus',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className={getVerificationStatusColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'stripeOnboardingComplete',
      label: 'Stripe',
      sortable: true,
      render: (value: boolean) => (
        <Badge 
          variant="outline"
          className={value ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}
        >
          {value ? 'Connected' : 'Pending'}
        </Badge>
      )
    },
    {
      key: 'activeServices',
      label: 'Services',
      sortable: true,
      render: (value: number, row: ProviderWithStats) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">
            {row.servicesCount} total
          </div>
        </div>
      )
    },
    {
      key: 'averageRating',
      label: 'Rating',
      sortable: true,
      render: (value: number, row: ProviderWithStats) => (
        <div>
          <div className="font-medium">
            {value > 0 ? value.toFixed(1) : 'No rating'}
          </div>
          <div className="text-sm text-gray-500">
            {row.reviewsCount} reviews
          </div>
        </div>
      )
    },
    {
      key: 'providerEarnings',
      label: 'Earnings',
      sortable: true,
      render: (value: number, row: ProviderWithStats) => (
        <div>
          <div className="font-medium text-green-600">${value.toFixed(2)}</div>
          <div className="text-sm text-gray-500">
            ${row.platformCommission.toFixed(2)} commission
          </div>
        </div>
      )
    },
    {
      key: 'active',
      label: 'Active',
      sortable: true,
      render: (value: boolean) => (
        <Badge 
          variant="outline"
          className={value ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
        >
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  const providerActions = (provider: ProviderWithStats) => (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedProvider(provider);
        }}
      >
        Details
      </Button>
      {provider.verificationStatus === 'PENDING' && (
        <>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleVerificationStatusChange(provider.id, 'APPROVED');
            }}
            className="ml-1"
          >
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleVerificationStatusChange(provider.id, 'REJECTED');
            }}
            className="ml-1"
          >
            Reject
          </Button>
        </>
      )}
    </>
  );

  return (
    <AdminLayout title="Provider Management">
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'verified', label: 'Verified' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'stripe', label: 'Stripe Connected' }
          ].map((filter) => (
            <button
              key={filter.key}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === filter.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setFilterStatus(filter.key)}
            >
              {filter.label}
              <span className="ml-1 text-xs">
                ({filter.key === 'all' 
                  ? providers.length 
                  : filter.key === 'verified'
                  ? providers.filter(p => p.verificationStatus === 'APPROVED').length
                  : filter.key === 'pending'
                  ? providers.filter(p => p.verificationStatus === 'PENDING').length
                  : filter.key === 'rejected'
                  ? providers.filter(p => p.verificationStatus === 'REJECTED').length
                  : filter.key === 'stripe'
                  ? providers.filter(p => p.stripeOnboardingComplete).length
                  : 0
                })
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider List */}
        <div className="lg:col-span-2">
          <DataTable
            title="All Providers"
            columns={columns}
            data={filteredProviders}
            searchKey="email"
            actions={providerActions}
            loading={loading}
            emptyMessage="No providers found"
          />
        </div>

        {/* Provider Details Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Provider Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProvider ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {getProviderDisplayName(selectedProvider)}
                    </h4>
                    <div className="flex space-x-2 mb-2">
                      <Badge 
                        variant="outline"
                        className={getVerificationStatusColor(selectedProvider.verificationStatus)}
                      >
                        {selectedProvider.verificationStatus}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={selectedProvider.active ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
                      >
                        {selectedProvider.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{selectedProvider.email}</p>
                  </div>

                  {selectedProvider.phone && (
                    <div>
                      <span className="text-sm font-medium">Phone:</span>
                      <p className="text-sm text-gray-600">{selectedProvider.phone}</p>
                    </div>
                  )}

                  {(selectedProvider.address || selectedProvider.city) && (
                    <div>
                      <span className="text-sm font-medium">Address:</span>
                      <p className="text-sm text-gray-600">
                        {selectedProvider.address && (
                          <>
                            {selectedProvider.address}<br />
                          </>
                        )}
                        {selectedProvider.city && selectedProvider.state && (
                          <>
                            {selectedProvider.city}, {selectedProvider.state}
                            {selectedProvider.zipCode && ` ${selectedProvider.zipCode}`}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm font-medium">Services</span>
                      <p className="text-lg font-semibold">{selectedProvider.activeServices}</p>
                      <p className="text-xs text-gray-500">{selectedProvider.servicesCount} total</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Bookings</span>
                      <p className="text-lg font-semibold">{selectedProvider.completedBookings}</p>
                      <p className="text-xs text-gray-500">{selectedProvider.bookingsCount} total</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Rating</span>
                      <p className="text-lg font-semibold">
                        {selectedProvider.averageRating > 0 ? selectedProvider.averageRating.toFixed(1) : 'No rating'}
                      </p>
                      <p className="text-xs text-gray-500">{selectedProvider.reviewsCount} reviews</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Revenue</span>
                      <p className="text-lg font-semibold text-green-600">
                        ${selectedProvider.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${selectedProvider.platformCommission.toFixed(2)} commission
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <span className="text-sm font-medium">Stripe Status:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline"
                        className={selectedProvider.stripeOnboardingComplete 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-yellow-600 bg-yellow-100'
                        }
                      >
                        {selectedProvider.stripeOnboardingComplete ? 'Connected' : 'Pending'}
                      </Badge>
                      {selectedProvider.stripeAccountId && (
                        <span className="text-xs text-gray-500 font-mono">
                          {selectedProvider.stripeAccountId.slice(0, 12)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <span className="text-sm font-medium">Joined:</span>
                    <p className="text-sm text-gray-600">
                      {selectedProvider.createdAt 
                        ? new Date(selectedProvider.createdAt).toLocaleDateString() 
                        : 'Unknown'
                      }
                    </p>
                  </div>

                  <div className="pt-4 space-y-2">
                    {selectedProvider.verificationStatus === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleVerificationStatusChange(selectedProvider.id, 'APPROVED')}
                        >
                          Approve Provider
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleVerificationStatusChange(selectedProvider.id, 'REJECTED')}
                        >
                          Reject Provider
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleToggleActive(selectedProvider.id, selectedProvider.active)}
                    >
                      {selectedProvider.active ? 'Deactivate' : 'Activate'} Provider
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // TODO: Implement payout history
                        alert('Payout history coming soon');
                      }}
                    >
                      View Payout History
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a provider to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}