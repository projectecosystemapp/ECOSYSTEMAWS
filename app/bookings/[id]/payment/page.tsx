'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';


// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BookingDetails {
  id: string;
  serviceTitle: string;
  providerName: string;
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: number;
  providerId: string;
  providerStripeAccountId: string;
}

function PaymentForm({ booking }: { booking: BookingDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const router = useRouter();
  const { user } = useAuthenticator();

  useEffect(() => {
    // Create payment intent when component mounts
    createPaymentIntent();
  }, [booking]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/stripe/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'CREATE_PAYMENT_INTENT',
          amount: booking.totalAmount,
          bookingId: booking.id,
          customerId: user?.userId,
          providerId: booking.providerId,
          providerStripeAccountId: booking.providerStripeAccountId,
          serviceTitle: booking.serviceTitle,
        }),
      });

      const data = await response.json();
      if (response.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error(data.error || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: user?.signInDetails?.loginId,
          },
        },
      });

      if (error) {
        setError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        setSucceeded(true);
        // Redirect to success page after a delay
        setTimeout(() => {
          router.push(`/bookings/${booking.id}?payment=success`);
        }, 2000);
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground">
          Your booking has been confirmed. Redirecting you now...
        </p>
      </div>
    );
  }

  const platformFee = Math.round(booking.totalAmount * 0.08);
  const providerAmount = booking.totalAmount - platformFee;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Payment Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Service Fee</span>
            <span>${booking.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform Fee (8%)</span>
            <span>${platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Provider Receives</span>
            <span>${providerAmount.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${booking.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Payment Information
        </h3>
        
        <div className="border rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center text-sm text-muted-foreground mb-4">
        <Lock className="h-4 w-4 mr-1" />
        <span>Secured by Stripe • Your payment information is encrypted and secure</span>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || processing || !clientSecret}
      >
        {processing ? 'Processing...' : `Pay $${booking.totalAmount.toFixed(2)}`}
      </Button>
    </form>
  );
}

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch booking details
    void fetchBookingDetails();
  }, [params.id]);

  const fetchBookingDetails = async () => {
    try {
      // In a real app, this would fetch from your API
      // For now, using mock data
      const mockBooking: BookingDetails = {
        id: params.id as string,
        serviceTitle: 'Professional House Cleaning',
        providerName: 'Sarah Johnson',
        scheduledDate: '2025-01-15',
        scheduledTime: '10:00 AM',
        totalAmount: 150,
        providerId: 'provider-123',
        providerStripeAccountId: 'acct_stripe_123',
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
                  <span>${booking.totalAmount.toFixed(2)}</span>
                </div>
              </div>
              
              <Badge className="w-full justify-center">
                Money-Back Guarantee
              </Badge>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <PaymentForm booking={booking} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}