'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import LoadingSpinner from '@/components/provider/LoadingSpinner';
import SearchBar from '@/components/search/SearchBar';
import { SortDropdownCompact } from '@/components/search/SortDropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serviceApi } from '@/lib/api';
import { Service } from '@/lib/types';

export default function ProviderServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'title'>('newest');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      const email = user.signInDetails?.loginId;

      if (!email) {
        setError('User not authenticated');
        return;
      }

      const data = await serviceApi.listByProvider(email);
      setServices((data || []) as any);
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const updatedService = await serviceApi.update({
        id: service.id,
        active: !service.active
      });

      if (updatedService) {
        setServices(prev => 
          prev.map(s => s.id === service.id ? updatedService as any : s)
        );
      }
    } catch (err) {
      console.error('Error updating service:', err);
      setError('Failed to update service status');
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await serviceApi.delete(service.id);
      setServices(prev => prev.filter(s => s.id !== service.id));
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getFilteredServices = () => {
    let filtered = services;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(service => 
        filter === 'active' ? service.active : !service.active
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.title?.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term) ||
        service.category?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.updatedAt || b.createdAt || '').getTime() - 
                 new Date(a.updatedAt || a.createdAt || '').getTime();
        case 'oldest':
          return new Date(a.createdAt || '').getTime() - 
                 new Date(b.createdAt || '').getTime();
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return sorted;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner message="Loading services..." className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
          <Button onClick={loadServices} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const filteredServices = getFilteredServices();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
            <p className="text-gray-600">Manage and organize your service offerings</p>
          </div>
          <Link href="/provider/services/new">
            <Button size="lg" className="mt-4 sm:mt-0">
              + Add New Service
            </Button>
          </Link>
        </div>

        {/* Commission Reminder */}
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-800">Low 8% Commission Rate</h3>
              <p className="text-sm text-green-700">
                Keep 92% of your earnings - one of the industry's lowest commission rates
              </p>
            </div>
            <div className="text-2xl font-bold text-green-600">8%</div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 w-full lg:max-w-md">
                <SearchBar
                  initialQuery={searchTerm}
                  onSearch={setSearchTerm}
                  placeholder="Search your services..."
                  showLocation={false}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                  <option value="price-asc">Price Low-High</option>
                  <option value="price-desc">Price High-Low</option>
                </select>
              </div>
            </div>
            
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
                className="flex items-center gap-2"
              >
                All Services
                <Badge variant="secondary" className="ml-1">
                  {services.length}
                </Badge>
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                onClick={() => setFilter('active')}
                size="sm"
                className="flex items-center gap-2"
              >
                Active
                <Badge variant="secondary" className="ml-1">
                  {services.filter(s => s.active).length}
                </Badge>
              </Button>
              <Button
                variant={filter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setFilter('inactive')}
                size="sm"
                className="flex items-center gap-2"
              >
                Inactive
                <Badge variant="secondary" className="ml-1">
                  {services.filter(s => !s.active).length}
                </Badge>
              </Button>
            </div>

            {/* Active Search/Filter Indicators */}
            {(searchTerm || filter !== 'all') && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {searchTerm}
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {filter}
                    <button
                      onClick={() => setFilter('all')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            {services.length === 0 ? (
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No services yet</h3>
                <p className="text-gray-600 mb-6">Create your first service to start earning</p>
                <Link href="/provider/services/new">
                  <Button size="lg">Create Your First Service</Button>
                </Link>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No services match your filters</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-2">
                      {service.title}
                    </CardTitle>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {service.description}
                  </p>
                  
                  {/* Service Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Price</span>
                      <span className="font-semibold text-lg text-green-600">
                        {formatCurrency(service.price || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Duration</span>
                      <span className="text-sm font-medium">
                        {formatDuration(service.duration || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Category</span>
                      <span className="text-sm font-medium">{service.category}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Link href={`/provider/services/${service.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        Edit
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(service)}
                      className="flex-1"
                    >
                      {service.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteService(service)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}