'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from 'aws-amplify/auth';
import { refactoredApi } from '@/lib/api/refactored';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import MessageProviderButton from '@/components/messaging/MessageProviderButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  MessageCircle,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';


export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const user = await getCurrentUser();
      const email = user.signInDetails?.loginId;
      
      if (email) {
        setCurrentUserEmail(email);
        const data = await refactoredApi.booking.listByCustomer(email);
        
        // Add mock data if no bookings exist
        const mockBookings: Booking[] = data?.length > 0 ? data : [
          {
            id: '1',
            serviceId: 'service-1',
            providerId: 'provider-1',
            customerId: 'customer-1',
            customerEmail: email,
            providerEmail: 'provider@example.com',
            scheduledDate: '2024-09-05',
            scheduledTime: '10:00 AM',
            status: 'CONFIRMED',
            totalAmount: 80,
            notes: 'Please use eco-friendly products',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            serviceId: 'service-2',
            providerId: 'provider-2',
            customerId: 'customer-1',
            customerEmail: email,
            providerEmail: 'trainer@example.com',
            scheduledDate: '2024-09-03',
            scheduledTime: '6:00 PM',
            status: 'PENDING',
            totalAmount: 65,
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
    try {
      await refactoredApi.booking.updateStatus(bookingId, 'CANCELLED');
      loadBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };


  const handleReschedule = (bookingId: string) => {
    window.location.href = `/bookings/${bookingId}/reschedule`;
  };

  const handleLeaveReview = (bookingId: string, serviceId: string) => {
    window.location.href = `/services/${serviceId}/review?booking=${bookingId}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'COMPLETED':
        return <Star className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your service bookings and appointments</p>
        </div>

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

        {filteredBookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'upcoming' 
                ? "You don't have any upcoming bookings."
                : activeTab === 'past'
                ? "You don't have any past bookings."
                : activeTab === 'cancelled'
                ? "You don't have any cancelled bookings."
                : "You haven't made any bookings yet."}
            </p>
            <Link href="/services">
              <Button>Browse Services</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        Service Booking
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Provider: {booking.providerEmail}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(booking.status)}
                        {booking.status}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {booking.scheduledTime}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        ${booking.totalAmount}
                      </div>
                    </div>
                    {booking.notes && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                        <p className="text-sm text-gray-600">{booking.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {booking.status === 'PENDING' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReschedule(booking.id)}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          Cancel Booking
                        </Button>
                      </>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <>
                        <MessageProviderButton
                          providerEmail={booking.providerEmail}
                          providerName="Provider"
                          currentUserEmail={currentUserEmail}
                          bookingId={booking.id}
                          serviceId={booking.serviceId}
                          size="sm"
                          variant="outline"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReschedule(booking.id)}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {booking.status === 'COMPLETED' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLeaveReview(booking.id, booking.serviceId)}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Leave Review
                        </Button>
                        <Link href={`/services/${booking.serviceId}`}>
                          <Button variant="outline" size="sm">
                            Book Again
                          </Button>
                        </Link>
                      </>
                    )}
                    <Link href={`/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}