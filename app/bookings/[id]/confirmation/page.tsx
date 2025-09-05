'use client';

import { generateClient } from 'aws-amplify/api';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User,
  CreditCard,
  Download,
  Share2,
  MessageSquare,
  AlertCircle,
  Loader2,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { Schema } from '@/amplify/data/resource';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/utils/format';


const client = generateClient<Schema>();

interface BookingDetails {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  providerAddress?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  paymentStatus: string;
  amountCents: number;
  platformFeeCents?: number;
  paymentIntentId?: string;
  notes?: string;
  createdAt: string;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch booking details
        const bookingResponse = await client.models.Booking.get({ id: bookingId });
        
        if (!bookingResponse.data) {
          throw new Error('Booking not found');
        }

        const bookingData = bookingResponse.data;
        
        // Fetch related service details
        const serviceResponse = await client.models.Service.get({ id: bookingData.serviceId });
        
        // Fetch provider profile
        const providerResponse = await client.models.ProviderProfile.list({
          filter: { owner: { eq: bookingData.providerId } }
        });
        
        const providerProfile = providerResponse.data?.[0];
        
        // Fetch customer details
        const customerResponse = await client.models.User.get({ id: bookingData.customerId || '' });

        // Combine all data
        const completeBooking: BookingDetails = {
          id: bookingData.id,
          serviceId: bookingData.serviceId,
          serviceName: serviceResponse.data?.title || 'Service',
          serviceDescription: serviceResponse.data?.description,
          providerId: bookingData.providerId,
          providerName: providerProfile?.businessName || 'Provider',
          providerEmail: bookingData.providerEmail,
          providerPhone: providerProfile?.phoneNumber,
          providerAddress: providerProfile ? 
            `${providerProfile.address}, ${providerProfile.city}, ${providerProfile.province}` : 
            undefined,
          customerId: bookingData.customerId,
          customerName: customerResponse.data?.name || 'Customer',
          customerEmail: bookingData.customerEmail,
          startDateTime: bookingData.startDateTime,
          endDateTime: bookingData.endDateTime,
          status: bookingData.status,
          paymentStatus: bookingData.paymentStatus,
          amountCents: bookingData.amountCents,
          platformFeeCents: bookingData.platformFeeCents,
          paymentIntentId: bookingData.paymentIntentId,
          notes: bookingData.notes,
          createdAt: bookingData.createdAt,
        };

        setBooking(completeBooking);
      } catch (err) {
        console.error('Failed to fetch booking details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking details');
      } finally {
        setIsLoading(false);
      }
    };

    if (bookingId) {
      void fetchBookingDetails();
    }
  }, [bookingId]);

  const handleAddToCalendar = async () => {
    if (!booking) return;
    
    setIsAddingToCalendar(true);
    
    // Create calendar event data
    const startDate = new Date(booking.startDateTime);
    const endDate = new Date(booking.endDateTime);
    
    const eventDetails = {
      text: `${booking.serviceName} with ${booking.providerName}`,
      dates: `${format(startDate, "yyyyMMdd'T'HHmmss")}/${format(endDate, "yyyyMMdd'T'HHmmss")}`,
      details: `Booking confirmed for ${booking.serviceName}.\n\nProvider: ${booking.providerName}\nContact: ${booking.providerEmail}${booking.providerPhone ? `\nPhone: ${booking.providerPhone}` : ''}\n\nBooking ID: ${booking.id}`,
      location: booking.providerAddress || 'To be confirmed',
    };
    
    // Generate Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.text)}&dates=${eventDetails.dates}&details=${encodeURIComponent(eventDetails.details)}&location=${encodeURIComponent(eventDetails.location)}`;
    
    window.open(googleCalendarUrl, '_blank');
    setIsAddingToCalendar(false);
  };

  const handleShare = async () => {
    if (!booking) return;
    
    const shareData = {
      title: 'Booking Confirmation',
      text: `My booking for ${booking.serviceName} with ${booking.providerName} is confirmed for ${format(new Date(booking.startDateTime), 'PPP')}`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  const handleContactProvider = () => {
    if (booking?.providerEmail) {
      window.location.href = `mailto:${booking.providerEmail}?subject=Regarding Booking ${booking.id}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Booking</h2>
              <p className="text-gray-600 mb-4">{error || 'Booking not found'}</p>
              <Button onClick={() => router.push('/bookings')} variant="outline">
                View All Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(booking.startDateTime);
  const endDate = new Date(booking.endDateTime);
  const netAmount = booking.amountCents - (booking.platformFeeCents || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">
            Your booking has been successfully confirmed and payment has been processed.
          </p>
        </div>

        {/* Main Booking Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{booking.serviceName}</CardTitle>
                <CardDescription className="mt-2">
                  Booking ID: {booking.id}
                </CardDescription>
              </div>
              <Badge variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                {booking.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Description */}
            {booking.serviceDescription && (
              <>
                <div>
                  <p className="text-gray-600">{booking.serviceDescription}</p>
                </div>
                <Separator />
              </>
            )}

            {/* Date and Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-gray-600">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-gray-600">
                    {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Provider Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Provider Details
              </h3>
              <div className="space-y-2 pl-6">
                <p className="font-medium">{booking.providerName}</p>
                {booking.providerEmail && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {booking.providerEmail}
                  </div>
                )}
                {booking.providerPhone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {booking.providerPhone}
                  </div>
                )}
                {booking.providerAddress && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {booking.providerAddress}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Payment Summary
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Amount</span>
                  <span className="font-medium">{formatPrice(netAmount)}</span>
                </div>
                {booking.platformFeeCents && booking.platformFeeCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">{formatPrice(booking.platformFeeCents)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Paid</span>
                  <span>{formatPrice(booking.amountCents)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                Payment Status: {booking.paymentStatus === 'ESCROW_HELD' ? 'Secured in Escrow' : booking.paymentStatus}
              </div>
            </div>

            {/* Special Notes */}
            {booking.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-gray-600 bg-yellow-50 p-3 rounded-lg">
                    {booking.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Button 
            onClick={handleAddToCalendar}
            variant="outline"
            className="w-full"
            disabled={isAddingToCalendar}
          >
            {isAddingToCalendar ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Add to Calendar
          </Button>
          
          <Button 
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button 
            onClick={handleContactProvider}
            variant="outline"
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Provider
          </Button>
          
          <Button 
            onClick={() => window.print()}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        </div>

        {/* Important Information */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important Information:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• A confirmation email has been sent to {booking.customerEmail}</li>
              <li>• You can cancel or reschedule up to 24 hours before your appointment</li>
              <li>• Your payment is held securely and will be released to the provider after service completion</li>
              <li>• Please arrive on time for your scheduled appointment</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Navigation Footer */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button 
            variant="outline"
            onClick={() => router.push('/bookings')}
          >
            View All Bookings
          </Button>
          <Button 
            onClick={() => router.push('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}