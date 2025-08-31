'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { refactoredApi } from '@/lib/api/refactored';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  Star,
  MapPin,
  DollarSign,
  MessageCircle,
  User,
  ArrowLeft,
  MoreVertical,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getStatusColor, getStatusText } from '@/lib/types';

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const user = await getCurrentUser();
      const email = user.signInDetails?.loginId;
      
      if (email) {
        const data = await refactoredApi.booking.listByCustomer(email);
        
        // Add mock data if no bookings exist
        const mockBookings: Booking[] = data?.length > 0 ? data : [
          {
            id: '1',
            serviceId: 'service-1',
            serviceTitle: 'House Cleaning Service',
            providerId: 'provider-1',
            providerName: 'Sarah Johnson',
            providerEmail: 'sarah@cleanpro.com',
            customerId: 'customer-1',
            customerName: 'Customer',
            customerEmail: email,
            customerPhone: '(555) 123-4567',
            scheduledDate: '2024-09-05',
            scheduledTime: '10:00 AM',
            duration: 120,
            status: 'CONFIRMED',
            totalAmount: 120,
            platformFee: 9.6,
            providerEarnings: 110.4,
            notes: 'Please use eco-friendly products. House has a dog.',
            location: '123 Main St, Austin, TX',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            serviceId: 'service-2',
            serviceTitle: 'Personal Training Session',
            providerId: 'provider-2',
            providerName: 'Mike Chen',
            providerEmail: 'mike@fitpro.com',
            customerId: 'customer-1',
            customerName: 'Customer',
            customerEmail: email,
            scheduledDate: '2024-09-03',
            scheduledTime: '6:00 PM',
            duration: 60,
            status: 'PENDING',
            totalAmount: 85,
            platformFee: 6.8,
            providerEarnings: 78.2,
            notes: 'First session - focus on assessment',
            location: 'FitPro Gym, 456 Fitness Ave',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '3',
            serviceId: 'service-3',
            serviceTitle: 'Photography Session',
            providerId: 'provider-3',
            providerName: 'Lisa Wang',
            providerEmail: 'lisa@photos.com',
            customerId: 'customer-1',
            customerName: 'Customer',
            customerEmail: email,
            scheduledDate: '2024-08-28',
            scheduledTime: '2:00 PM',
            duration: 90,
            status: 'COMPLETED',
            totalAmount: 200,
            platformFee: 16,
            providerEarnings: 184,
            notes: 'Family portrait session',
            location: 'Central Park, Austin',
            reviewed: true,
            completedAt: '2024-08-28T17:30:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
        ];
        
        setBookings(mockBookings);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await refactoredApi.booking.updateStatus(bookingId, 'CANCELLED');
      await loadBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') {
      return ['PENDING', 'CONFIRMED'].includes(booking.status) &&
        new Date(booking.scheduledDate) >= new Date();
    }
    if (activeTab === 'past') {
      return booking.status === 'COMPLETED' ||
        (new Date(booking.scheduledDate) < new Date() && booking.status !== 'CANCELLED');
    }
    if (activeTab === 'cancelled') {
      return booking.status === 'CANCELLED';
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setSelectedBooking(booking)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {booking.serviceTitle || 'Service Booking'}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center">
              <User className="h-4 w-4 mr-1" />
              {booking.providerName || booking.providerEmail}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            <span className="flex items-center gap-1">
              {getStatusIcon(booking.status)}
              {getStatusText(booking.status)}
            </span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Date and Time */}
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="font-medium">{formatDate(booking.scheduledDate)}</span>
            <Clock className="h-4 w-4 ml-4 mr-2" />
            <span>{booking.scheduledTime}</span>
            {booking.duration && (
              <span className="text-gray-500 ml-1">({booking.duration}min)</span>
            )}
          </div>

          {/* Location */}
          {booking.location && (
            <div className="flex items-start text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{booking.location}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="font-semibold text-gray-900">${booking.totalAmount}</span>
            {booking.platformFee && (
              <span className="text-gray-500 ml-1">(incl. ${booking.platformFee.toFixed(2)} fee)</span>
            )}
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {booking.status === 'CONFIRMED' && (
              <>
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelBooking(booking.id);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel
                </Button>
              </>
            )}
            
            {booking.status === 'PENDING' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelBooking(booking.id);
                }}
                className="text-red-600 hover:text-red-700"
              >
                Cancel Request
              </Button>
            )}

            {booking.status === 'COMPLETED' && !booking.reviewed && (
              <Link href={`/services/${booking.serviceId}/review?booking=${booking.id}`}>
                <Button size="sm" className="flex-1">
                  <Star className="h-4 w-4 mr-1" />
                  Leave Review
                </Button>
              </Link>
            )}

            {booking.status === 'COMPLETED' && (
              <Link href={`/services/${booking.serviceId}`}>
                <Button size="sm" variant="outline">
                  Book Again
                </Button>
              </Link>
            )}

            <Button size="sm" variant="outline">
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/customer/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">
            Manage your service appointments and bookings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{bookings.length}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status)).length}
                </div>
                <div className="text-sm text-gray-500">Upcoming</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'COMPLETED').length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${bookings
                    .filter(b => b.status === 'COMPLETED')
                    .reduce((sum, b) => sum + b.totalAmount, 0)
                    .toFixed(0)}
                </div>
                <div className="text-sm text-gray-500">Total Spent</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={activeTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">
              All ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status)).length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({bookings.filter(b => b.status === 'COMPLETED').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({bookings.filter(b => b.status === 'CANCELLED').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'upcoming' 
                ? "No upcoming bookings"
                : activeTab === 'past'
                ? "No past bookings"
                : activeTab === 'cancelled'
                ? "No cancelled bookings"
                : "No bookings found"}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'all' || activeTab === 'upcoming'
                ? "Ready to book your first service? Browse our amazing providers!"
                : "Your booking history will appear here."}
            </p>
            {(activeTab === 'all' || activeTab === 'upcoming') && (
              <Link href="/services">
                <Button>Browse Services</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={loadBookings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedBooking.serviceTitle || 'Service Booking'}</CardTitle>
                  <CardDescription>Booking #{selectedBooking.id}</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Provider</h4>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{selectedBooking.providerName || selectedBooking.providerEmail}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{selectedBooking.providerEmail}</span>
                </div>
                {selectedBooking.customerPhone && (
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedBooking.customerPhone}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getStatusColor(selectedBooking.status)}>
                      {getStatusText(selectedBooking.status)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span>{formatDate(selectedBooking.scheduledDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span>{selectedBooking.scheduledTime}</span>
                  </div>
                  {selectedBooking.duration && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span>{selectedBooking.duration} minutes</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-semibold">${selectedBooking.totalAmount}</span>
                  </div>
                  {selectedBooking.platformFee && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Platform Fee:</span>
                      <span className="text-gray-500">${selectedBooking.platformFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedBooking.location && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{selectedBooking.location}</span>
                  </div>
                </div>
              )}

              {selectedBooking.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-2">
                {selectedBooking.status === 'CONFIRMED' && (
                  <>
                    <Button className="w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Provider
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={() => {
                        setSelectedBooking(null);
                        handleCancelBooking(selectedBooking.id);
                      }}
                    >
                      Cancel Booking
                    </Button>
                  </>
                )}
                
                {selectedBooking.status === 'COMPLETED' && !selectedBooking.reviewed && (
                  <Link href={`/services/${selectedBooking.serviceId}/review?booking=${selectedBooking.id}`}>
                    <Button className="w-full">
                      <Star className="h-4 w-4 mr-2" />
                      Leave Review
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}