'use client';

import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { serviceApi } from '@/lib/api';
import { logger } from '@/lib/logger';

interface ServiceWithStats {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  providerName: string;
  providerEmail: string;
  duration: number;
  active: boolean;
  bookingsCount: number;
  reviewsCount: number;
  averageRating: number;
  totalRevenue: number;
  pendingBookings: number;
  completedBookings: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function ServiceModeration(): JSX.Element {
  const [services, setServices] = useState<ServiceWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceWithStats | null>(null);
  const [editingService, setEditingService] = useState<ServiceWithStats | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    price: 0,
    category: '',
    duration: 0,
    active: true
  });

  useEffect(() => {
    const fetchServices = async (): Promise<void> => {
      try {
        setLoading(true);
        // adminApi not yet implemented - using empty array for now
        // const servicesData = await adminApi.getServicesWithStats();
        const servicesData: ServiceWithStats[] = [];
        setServices(servicesData);
      } catch (error) {
        logger.error('Error fetching services', error as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchServices();
  }, []);

  const handleToggleActive = async (serviceId: string, currentActive: boolean): Promise<void> => {
    try {
      await serviceApi.update({ id: serviceId, active: !currentActive });
      
      // Refresh services list
      // adminApi not yet implemented - would refresh here
      // const servicesData = await adminApi.getServicesWithStats();
      // setServices(servicesData as any);
    } catch (error) {
      logger.error('Error toggling service status', error as Error);
    }
  };

  const handleEditService = (service: ServiceWithStats): void => {
    setEditingService(service);
    setEditForm({
      title: service.title,
      description: service.description,
      price: service.price,
      category: service.category,
      duration: service.duration,
      active: service.active
    });
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingService) return;

    try {
      await serviceApi.update({
        id: editingService.id,
        ...editForm
      });

      // Refresh services list
      // adminApi not yet implemented - would refresh here
      // const servicesData = await adminApi.getServicesWithStats();
      // setServices(servicesData as any);
      
      setEditingService(null);
      setSelectedService(null);
    } catch (error) {
      logger.error('Error updating service', error as Error);
    }
  };

  const handleDeleteService = async (serviceId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      await serviceApi.delete(serviceId);
      
      // Refresh services list
      // adminApi not yet implemented - would refresh here
      // const servicesData = await adminApi.getServicesWithStats();
      // setServices(servicesData as any);
      
      if (selectedService?.id === serviceId) {
        setSelectedService(null);
      }
    } catch (error) {
      logger.error('Error deleting service', error as Error);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Service',
      sortable: true,
      render: (value: string, row: ServiceWithStats) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.category}</div>
        </div>
      )
    },
    {
      key: 'providerName',
      label: 'Provider',
      sortable: true,
      render: (value: string, row: ServiceWithStats) => (
        <div>
          <div className="font-medium text-gray-900">{value || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{row.providerEmail}</div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value: number) => `$${value.toFixed(2)}`
    },
    {
      key: 'averageRating',
      label: 'Rating',
      sortable: true,
      render: (value: number, row: ServiceWithStats) => (
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
      key: 'bookingsCount',
      label: 'Bookings',
      sortable: true,
      render: (value: number, row: ServiceWithStats) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">
            {row.completedBookings} completed
          </div>
        </div>
      )
    },
    {
      key: 'active',
      label: 'Status',
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

  const serviceActions = (service: ServiceWithStats): JSX.Element => (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedService(service);
        }}
      >
        Details
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleEditService(service);
        }}
        className="ml-1"
      >
        Edit
      </Button>
      <Button
        variant={service.active ? "destructive" : "default"}
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          void handleToggleActive(service.id, service.active);
        }}
        className="ml-1"
      >
        {service.active ? 'Deactivate' : 'Activate'}
      </Button>
    </>
  );

  return (
    <AdminLayout title="Service Moderation">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service List */}
        <div className="lg:col-span-2">
          <DataTable
            title="All Services"
            columns={columns}
            data={services}
            searchKey="title"
            actions={serviceActions}
            loading={loading}
            emptyMessage="No services found"
          />
        </div>

        {/* Service Details/Edit Sidebar */}
        <div>
          {editingService ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={editForm.duration}
                      onChange={(e) => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editForm.active}
                    onChange={(e) => setEditForm(prev => ({ ...prev, active: e.target.checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleSaveEdit} size="sm">
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingService(null)} 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedService ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        {selectedService.title}
                      </h4>
                      <Badge 
                        variant="outline"
                        className={selectedService.active ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
                      >
                        {selectedService.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Description:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedService.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Price</span>
                        <p className="text-lg font-semibold">${selectedService.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Duration</span>
                        <p className="text-lg font-semibold">{selectedService.duration} min</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="text-sm font-medium">Bookings</span>
                        <p className="text-lg font-semibold">{selectedService.bookingsCount}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Revenue</span>
                        <p className="text-lg font-semibold text-green-600">
                          ${selectedService.totalRevenue.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Rating</span>
                        <p className="text-lg font-semibold">
                          {selectedService.averageRating > 0 ? selectedService.averageRating.toFixed(1) : 'No rating'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Reviews</span>
                        <p className="text-lg font-semibold">{selectedService.reviewsCount}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <span className="text-sm font-medium">Provider:</span>
                      <p className="text-sm text-gray-600">
                        {selectedService.providerName || 'Unknown'} ({selectedService.providerEmail})
                      </p>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditService(selectedService)}
                      >
                        Edit Service
                      </Button>
                      <Button
                        variant={selectedService.active ? "destructive" : "default"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleToggleActive(selectedService.id, selectedService.active)}
                      >
                        {selectedService.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteService(selectedService.id)}
                      >
                        Delete Service
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Select a service to view details
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}