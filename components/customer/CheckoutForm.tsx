'use client';

import {
  useStripe,
  useElements,
  CardElement,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { generateClient } from 'aws-amplify/api';
import { Loader2, CreditCard, Lock, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Schema } from '@/amplify/data/resource';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatPrice } from '@/utils/format';



const client = generateClient<Schema>();

// Initialize Stripe with publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
  amountCents: number;
  bookingId: string;
  providerId: string;
  customerId: string;
  customerEmail: string;
  serviceName: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

function CheckoutFormContent({
  amountCents,
  bookingId,
  providerId,
  customerId,
  customerEmail,
  serviceName,
  onPaymentSuccess,
  onError
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Card element options for styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        lineHeight: '24px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  };

  // Create PaymentIntent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const response = await fetch('/api/stripe/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'CREATE_PAYMENT_INTENT',
            providerId,
            amountCents,
            bookingId,
            customerEmail,
            metadata: {
              bookingId,
              customerId,
              serviceName,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No client secret received from server');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    };

    createPaymentIntent();
  }, [amountCents, bookingId, providerId, customerId, customerEmail, serviceName, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please refresh and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card input not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the card payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: customerEmail,
            },
          },
        }
      );

      if (stripeError) {
        // Handle Stripe-specific errors with user-friendly messages
        let errorMessage = stripeError.message || 'Payment failed';
        
        switch (stripeError.type) {
          case 'card_error':
            // Card was declined or has insufficient funds
            errorMessage = stripeError.message || 'Your card was declined. Please try another card.';
            break;
          case 'validation_error':
            errorMessage = 'Please check your card details and try again.';
            break;
          case 'payment_intent_authentication_failure':
            errorMessage = 'Authentication failed. Please try again.';
            break;
          default:
            errorMessage = `Payment failed: ${stripeError.message}`;
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update booking status to CONFIRMED
        try {
          await client.models.Booking.update({
            id: bookingId,
            status: 'CONFIRMED',
            paymentStatus: 'ESCROW_HELD',
            paymentIntentId: nullableToString(paymentIntent.id),
          });

          // Call success callback with payment intent ID
          onPaymentSuccess(paymentIntent.id);
        } catch (updateError) {
          console.error('Failed to update booking status:', updateError);
          // Still call success since payment went through
          onPaymentSuccess(paymentIntent.id);
        }
      } else {
        setError('Payment was not completed successfully. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Initializing secure payment...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Secure Payment
        </CardTitle>
        <CardDescription>
          Enter your card details to complete the booking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Display */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Amount</span>
              <span className="text-2xl font-bold">{formatPrice(amountCents)}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              For: {serviceName}
            </div>
          </div>

          {/* Card Input */}
          <div className="space-y-2">
            <label htmlFor="card-element" className="text-sm font-medium">
              Card Information
            </label>
            <div className="border rounded-md p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <CardElement
                id="card-element"
                options={cardElementOptions}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center text-xs text-gray-500">
            <Lock className="h-3 w-3 mr-1" />
            <span>Payments secured by Stripe</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>Pay {formatPrice(amountCents)}</>
            )}
          </Button>

          {/* Additional Information */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Your payment will be held securely until the service is completed.</p>
            <p>You can cancel up to 24 hours before your appointment for a full refund.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Main component wrapped with Stripe Elements provider
export function CheckoutForm(props: CheckoutFormProps) {
  const elementsOptions: StripeElementsOptions = {
    mode: 'payment',
    amount: nullableToString(props.amountCents),
    currency: 'cad',
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutFormContent {...props} />
    </Elements>
  );
}