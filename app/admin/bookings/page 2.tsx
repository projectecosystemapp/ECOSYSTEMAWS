'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { bookingApi } from '@/lib/api/refactored';
// Note: adminApi not yet implemented
import { getStatusColor, getStatusText } from '@/lib/types';

interface BookingWithDetails {
  id: string;
  serviceId: string;
  customerEmail: string;
  providerEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  createdAt?: string;
  service?: any;
  customer?: any;
  provider?: any;
  platformCommission: number;
  providerAmount: number;
}

export default function BookingOversight() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        // adminApi not yet implemented - using empty array
        const bookingsData: any[] = [];
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await bookingApi.updateStatus(bookingId, newStatus);
      
      // Refresh bookings list
      const bookingsData = await adminApi.getAllBookingsWithDetails();
      setBookings(bookingsData);
      
      // Update selected booking if it's the one being changed
      if (selectedBooking?.id === bookingId) {
        const updatedBooking = bookingsData.find((b: any) => b.id === bookingId);
        setSelectedBooking(updatedBooking || null);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const filteredBookings = bookings.filter(booking => 
    filterStatus === 'all' || booking.status === filterStatus
  );

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return dateTime.toLocaleString();
    } catch {
      return `${date} ${time}`;
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Booking ID',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm">{value.slice(0, 8)}...</span>
      )
    },
    {
      key: 'service',
      label: 'Service',
      sortable: false,
      render: (value: any, row: BookingWithDetails) => (
        <div>
          <div className="font-medium text-gray-900">
            {value?.title || 'Unknown Service'}
          </div>
          <div className="text-sm text-gray-500">
            ${row.totalAmount.toFixed(2)}
          </div>
        </div>
      )
    },
    {
      key: 'customerEmail',
      label: 'Customer',
      sortable: true,
      render: (value: string, row: BookingWithDetails) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.customer?.firstName && row.customer?.lastName 
              ? `${row.customer.firstName} ${row.customer.lastName}`
              : 'Unknown Customer'
            }
          </div>
          <div className="text-sm text-gray-500">{value}</div>
        </div>
      )
    },
    {
      key: 'providerEmail',
      label: 'Provider',
      sortable: true,
      render: (value: string, row: BookingWithDetails) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.provider?.firstName && row.provider?.lastName 
              ? `${row.provider.firstName} ${row.provider.lastName}`
              : 'Unknown Provider'
            }
          </div>
          <div className="text-sm text-gray-500">{value}</div>
        </div>
      )
    },
    {
      key: 'scheduledDate',
      label: 'Scheduled',
      sortable: true,
      render: (value: string, row: BookingWithDetails) => (
        <div className="text-sm">
          {formatDateTime(value, row.scheduledTime)}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className={getStatusColor(value as any)}>
          {getStatusText(value as any)}
        </Badge>
      )
    },
    {
      key: 'platformCommission',
      label: 'Commission',
      sortable: true,
      render: (value: number) => (
        <div className="text-sm">
          <div className="font-medium text-green-600">${value.toFixed(2)}</div>
          <div className="text-xs text-gray-500">8%</div>
        </div>
      )
    }
  ];

  const bookingActions = (booking: BookingWithDetails) => (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedBooking(booking);
        }}
      >
        Details
      </Button>
      {booking.status === 'PENDING' && (
        <select
          className="text-xs border border-gray-300 rounded px-2 py-1 ml-2"
          value={booking.status}
          onChange={(e) => {
            e.stopPropagation();
            handleStatusChange(booking.id, e.target.value);
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirm</option>
          <option value="CANCELLED">Cancel</option>
        </select>
      )}
    </>
  );

  return (
    <AdminLayout title="Booking Oversight">
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : getStatusText(status as any)}
              <span className="ml-1 text-xs">
                ({status === 'all' 
                  ? bookings.length 
                  : bookings.filter(b => b.status === status).length
                })
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking List */}
        <div className="lg:col-span-2">
          <DataTable
            title="All Bookings"
            columns={columns}
            data={filteredBookings}
            searchKey="customerEmail"
            actions={bookingActions}
            loading={loading}
            emptyMessage="No bookings found"
          />
        </div>

        {/* Booking Details Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBooking ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {selectedBooking.service?.title || 'Unknown Service'}
                    </h4>
                    <Badge 
                      variant="outline"
                      className={getStatusColor(selectedBooking.status)}
                    >
                      {getStatusText(selectedBooking.status)}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Booking ID:</span>
                    <p className="text-sm text-gray-600 font-mono">
                      {selectedBooking.id}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Scheduled:</span>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(selectedBooking.scheduledDate, selectedBooking.scheduledTime)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm font-medium">Customer:</span>
                      <p className="text-sm text-gray-600">
                        {selectedBooking.customer?.firstName && selectedBooking.customer?.lastName 
                          ? `${selectedBooking.customer.firstName} ${selectedBooking.customer.lastName}`
                          : 'Unknown Customer'
                        }
                      </p>
                      <p className="text-xs text-gray-500">{selectedBooking.customerEmail}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">Provider:</span>
                      <p className="text-sm text-gray-600">
                        {selectedBooking.provider?.firstName && selectedBooking.provider?.lastName 
                          ? `${selectedBooking.provider.firstName} ${selectedBooking.provider.lastName}`
                          : 'Unknown Provider'
                        }
                      </p>
                      <p className="text-xs text-gray-500">{selectedBooking.providerEmail}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm font-medium">Total Amount</span>
                      <p className="text-lg font-semibold">${selectedBooking.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Commission</span>
                      <p className="text-lg font-semibold text-green-600">
                        ${selectedBooking.platformCommission.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {selectedBooking.notes && (
                    <div className="pt-4 border-t">
                      <span className="text-sm font-medium">Notes:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedBooking.notes}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <span className="text-sm font-medium">Created:</span>
                    <p className="text-sm text-gray-600">
                      {selectedBooking.createdAt 
                        ? new Date(selectedBooking.createdAt).toLocaleString()
                        : 'Unknown'
                      }
                    </p>
                  </div>

                  {selectedBooking.status === 'PENDING' && (
                    <div className="pt-4 space-y-2">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange(selectedBooking.id, 'CONFIRMED')}
                      >
                        Confirm Booking
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange(selectedBooking.id, 'CANCELLED')}
                      >
                        Cancel Booking
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a booking to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}