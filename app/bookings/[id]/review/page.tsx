'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import ReviewForm from '@/components/reviews/ReviewForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { bookingApi, reviewApi, serviceApi } from '@/lib/api';
import { Booking, Service } from '@/lib/types';


export default function ReviewBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthenticator((context) => [context.user]);
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [canReview, setCanReview] = useState<{ canReview: boolean; reason: string | null }>({
    canReview: false,
    reason: null
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id || !user) return;

      try {
        setLoading(true);
        setError(null);

        // Check if booking can be reviewed
        const reviewCheck = await reviewApi.canReviewBooking(params.id as string);
        setCanReview(reviewCheck);

        if (!reviewCheck.canReview) {
          setError(reviewCheck.reason || 'Cannot review this booking');
          return;
        }

        // Fetch booking details
        const bookingData = await bookingApi.get(params.id as string);
        if (!bookingData) {
          setError('Booking not found');
          return;
        }

        // Verify user is the customer
        if (bookingData.customerEmail !== user.signInDetails?.loginId) {
          setError('You can only review your own bookings');
          return;
        }

        setBooking(bookingData as any);

        // Fetch service details
        const serviceData = await serviceApi.get(bookingData.serviceId);
        if (serviceData) {
          setService(serviceData as any);
        }

      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [params.id, user]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!booking || !service || !user) return;

    setIsSubmitting(true);
    try {
      // Validate review data
      const validation = reviewApi.validateReview({ rating, comment });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create review
      await reviewApi.create({
        serviceId: booking.serviceId,
        bookingId: booking.id,
        customerEmail: booking.customerEmail,
        providerEmail: booking.providerEmail,
        rating,
        comment
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting review:', err);
      throw new Error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/bookings');
  };

  const handleBackToBookings = () => {
    router.push('/bookings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !canReview.canReview) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link 
              href="/bookings" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Bookings
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Cannot Review Booking
              </h1>
              <p className="text-gray-600 mb-6">
                {error || canReview.reason}
              </p>
              <Button onClick={handleBackToBookings}>
                Back to Bookings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Review Submitted Successfully!
              </h1>
              <p className="text-gray-600 mb-6">
                Thank you for sharing your experience. Your review helps other customers
                make informed decisions and helps providers improve their services.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleBackToBookings}>
                  Back to Bookings
                </Button>
                {service && (
                  <Button variant="outline" asChild>
                    <Link href={`/services/${service.id}`}>
                      View Service
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!booking || !service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking or Service Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load the booking or service details.
          </p>
          <Button onClick={handleBackToBookings}>
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            href="/bookings" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </Link>
        </div>

        {/* Booking Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">{service.title}</h3>
                <p className="text-gray-600 mb-2">{service.description}</p>
                <p className="text-sm text-gray-500">Provider: {service.providerName}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(booking.scheduledDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{booking.scheduledTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">${booking.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Completed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Form */}
        <ReviewForm
          serviceTitle={service.title}
          onSubmit={handleSubmitReview}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}