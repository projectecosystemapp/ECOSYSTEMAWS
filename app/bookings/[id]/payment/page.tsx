'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { Shield, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { AWSPaymentForm } from '@/components/payment/AWSPaymentForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatAmount } from '@/lib/aws-payment-client';


interface BookingDetails {
  id: string;
  serviceTitle: string;
  providerName: string;
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: number;
  providerId: string;
  customerId: string;
  customerEmail: string;
}

function PaymentWrapper({ booking }: { booking: BookingDetails }) {
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentSucceeded(true);
    console.log('Payment succeeded with ID:', paymentIntentId);
    
    // Redirect to success page after a delay
    setTimeout(() => {
      router.push(`/bookings/${booking.id}?payment=success`);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    console.error('Payment error:', error);
  };

  if (paymentSucceeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-4">
          Your booking has been confirmed and payment is secured in escrow.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <Shield className="h-4 w-4" />
            <span>Secured by AWS Payment Cryptography</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <AWSPaymentForm
        amountCents={booking.totalAmount * 100} // Convert to cents
        bookingId={booking.id}
        providerId={booking.providerId}
        customerId={booking.customerId}
        customerEmail={booking.customerEmail}
        serviceName={booking.serviceTitle}
        onPaymentSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthenticator();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch booking details
    void fetchBookingDetails();
  }, [params.id, user]);

  const fetchBookingDetails = async () => {
    try {
      // In a real app, this would fetch from your API
      // For now, using mock data with AWS native payment structure
      const mockBooking: BookingDetails = {
        id: params.id as string,
        serviceTitle: 'Professional House Cleaning',
        providerName: 'Sarah Johnson',
        scheduledDate: '2025-01-15',
        scheduledTime: '10:00 AM',
        totalAmount: 150,
        providerId: 'provider-123',
        customerId: user?.userId || 'customer-123',
        customerEmail: user?.signInDetails?.loginId || 'customer@example.com',
      };
      
      setBooking(mockBooking);
    } catch (error) {
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Booking not found'}</p>
            <Button onClick={() => router.push('/bookings')}>
              Back to Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold">Complete Your Payment</h1>
          <p className="text-muted-foreground">
            Secure payment for your booking with {booking.providerName}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{booking.serviceTitle}</h3>
                <p className="text-muted-foreground">with {booking.providerName}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time</span>
                  <span>{booking.scheduledTime}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatAmount(booking.totalAmount * 100)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Badge className="w-full justify-center">
                  Money-Back Guarantee
                </Badge>
                <Badge className="w-full justify-center bg-green-100 text-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Secured by AWS Payment Cryptography
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                AWS Native Payment
              </CardTitle>
              <p className="text-sm text-gray-600">
                98% lower processing fees • Advanced fraud protection • PCI DSS Level 1 compliant
              </p>
            </CardHeader>
            <CardContent>
              <PaymentWrapper booking={booking} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}