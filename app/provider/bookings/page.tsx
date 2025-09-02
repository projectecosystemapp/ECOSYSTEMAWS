'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { bookingApi, serviceApi, messageApi, generateConversationId } from '@/lib/api';
import { 
  Booking, 
  Service,
  BookingStatus,
  getStatusColor, 
  getStatusText,
  formatTimeSlot,
  calculatePriceBreakdown 
} from '@/lib/types';


interface BookingWithService extends Booking {
  service?: Service;
}

export default function ProviderBookingsPage() {
  const router = useRouter();
  const { user } = useAuthenticator((context) => [context.user]);
  
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const providerEmail = user.signInDetails?.loginId || user.username || '';
        const bookingsWithServices = await bookingApi.getProviderBookingsWithServices(providerEmail);
        
        // Sort by scheduled date and time
        bookingsWithServices.sort((a: any, b: any) => {
          const dateA = new Date(a.startDateTime || `${a.scheduledDate}T${a.scheduledTime}`);
          const dateB = new Date(b.startDateTime || `${b.scheduledDate}T${b.scheduledTime}`);
          return dateA.getTime() - dateB.getTime();
        });
        
        setBookings(bookingsWithServices as any);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const actionText = newStatus === 'CONFIRMED' ? 'confirm' : 
                      newStatus === 'COMPLETED' ? 'mark as complete' : 
                      newStatus === 'CANCELLED' ? 'cancel' : 'update';
    
    if (!confirm(`Are you sure you want to ${actionText} this booking?`)) return;
    try {
      setActionLoading(bookingId);
      await bookingApi.updateStatus(bookingId, newStatus);
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      );
      
      // Mock notification
      console.log(`📋 Booking ${getStatusText(newStatus)}`, { 
        bookingId, 
        newStatus,
        customer: bookings.find(b => b.id === bookingId)?.customerEmail 
      });
      
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Failed to update booking status. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessageCustomer = (booking: BookingWithService) => {
    if (!user) return;
    
    const providerEmail = user.signInDetails?.loginId || '';
    const conversationId = generateConversationId(providerEmail, booking.customerEmail);
    router.push(`/messages/${conversationId}`);
  };

  const filteredBookings = filter === 'ALL' 
    ? bookings 
    : bookings.filter(booking => booking.status === filter);

  const getTotalEarnings = () => {
    return bookings
      .filter(booking => booking.status === 'COMPLETED')
      .reduce((total, booking) => {
        const breakdown = calculatePriceBreakdown(booking.totalAmount);
        return total + breakdown.providerAmount;
      }, 0);
  };

  const getUpcomingBookings = () => {
    const today = new Date();
    return bookings.filter(booking => {
      const bookingDate = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
      return bookingDate >= today && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
    }).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
            <p className="mt-2 text-gray-600">Manage your service bookings and customer appointments</p>
          </div>
          <Link
            href="/provider/dashboard"
            className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            Provider Dashboard
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{getUpcomingBookings()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${getTotalEarnings().toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === status
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status === 'ALL' ? 'All Bookings' : getStatusText(status)}
                  {status !== 'ALL' && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                      {bookings.filter(b => b.status === status).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'ALL' ? 'No bookings yet' : `No ${getStatusText(filter as BookingStatus).toLowerCase()} bookings`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'ALL' 
                ? "You haven't received any bookings yet." 
                : `You don't have any ${getStatusText(filter as BookingStatus).toLowerCase()} bookings.`
              }
            </p>
            <Link
              href="/provider/services"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Your Services
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const priceBreakdown = calculatePriceBreakdown(booking.totalAmount);
              const bookingDate = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
              const isUpcoming = bookingDate >= new Date();
              
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                      {/* Booking Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.service?.title || 'Service Unavailable'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Customer: {booking.customerEmail}
                            </p>
                            {!isUpcoming && booking.status !== 'CANCELLED' && (
                              <span className="inline-block mt-1 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                Past Appointment
                              </span>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Date & Time</p>
                            <p className="text-sm text-gray-900">
                              {bookingDate.toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatTimeSlot(booking.scheduledTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Duration</p>
                            <p className="text-sm text-gray-900">
                              {booking.service?.duration || 60} minutes
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Your Earnings</p>
                            <p className="text-sm font-semibold text-green-600">
                              ${priceBreakdown.providerAmount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              (${priceBreakdown.totalAmount.toFixed(2)} total)
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Booked</p>
                            <p className="text-sm text-gray-900">
                              {booking.createdAt 
                                ? new Date(booking.createdAt).toLocaleDateString()
                                : 'Recently'
                              }
                            </p>
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Customer Notes</p>
                            <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                              {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col lg:items-end space-y-2">
                        {/* Message Customer Button */}
                        <Button
                          onClick={() => handleMessageCustomer(booking)}
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message Customer
                        </Button>
                        
                        {booking.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateBookingStatus(booking.id, 'CONFIRMED')}
                              disabled={actionLoading === booking.id}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {actionLoading === booking.id ? 'Confirming...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => handleUpdateBookingStatus(booking.id, 'CANCELLED')}
                              disabled={actionLoading === booking.id}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {actionLoading === booking.id ? 'Cancelling...' : 'Decline'}
                            </button>
                          </div>
                        )}
                        
                        {booking.status === 'CONFIRMED' && isUpcoming && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateBookingStatus(booking.id, 'COMPLETED')}
                              disabled={actionLoading === booking.id}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {actionLoading === booking.id ? 'Completing...' : 'Mark Complete'}
                            </button>
                            <button
                              onClick={() => handleUpdateBookingStatus(booking.id, 'CANCELLED')}
                              disabled={actionLoading === booking.id}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {actionLoading === booking.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </div>
                        )}

                        {booking.status === 'CONFIRMED' && !isUpcoming && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'COMPLETED')}
                            disabled={actionLoading === booking.id}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === booking.id ? 'Completing...' : 'Mark Complete'}
                          </button>
                        )}

                        {booking.service && (
                          <Link
                            href={`/provider/services/${booking.serviceId}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit Service →
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Booking Timeline */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            booking.status === 'PENDING' ? 'bg-yellow-400' :
                            booking.status === 'CONFIRMED' ? 'bg-blue-400' :
                            booking.status === 'COMPLETED' ? 'bg-green-400' :
                            'bg-red-400'
                          }`}></div>
                          <span className="text-gray-600">
                            Current Status: <span className="font-medium">{getStatusText(booking.status)}</span>
                          </span>
                        </div>
                        
                        {booking.status === 'COMPLETED' && (
                          <div className="flex items-center text-green-600">
                            <span className="mr-1">✅</span>
                            Service completed - Earnings: ${priceBreakdown.providerAmount.toFixed(2)}
                          </div>
                        )}
                        
                        {booking.status === 'CANCELLED' && (
                          <div className="flex items-center text-red-600">
                            <span className="mr-1">🚫</span>
                            Booking cancelled
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-600 text-2xl mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Bookings</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}