'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CreditCard, Lock, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { generateClient } from 'aws-amplify/api';

import { Schema } from '@/amplify/data/resource';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { awsPaymentClient, formatAmount, validateCardNumber, getCardBrand, validateExpirationDate, validateCVC } from '@/lib/aws-payment-client';

const client = generateClient<Schema>();

// Validation schema for payment form
const paymentSchema = z.object({
  cardNumber: z.string()
    .min(13, 'Card number must be at least 13 digits')
    .max(19, 'Card number must be at most 19 digits')
    .refine(validateCardNumber, 'Please enter a valid card number'),
  expiryMonth: z.string()
    .min(1, 'Month is required')
    .refine((val) => {
      const month = parseInt(val, 10);
      return month >= 1 && month <= 12;
    }, 'Invalid expiration month'),
  expiryYear: z.string()
    .min(4, 'Year is required')
    .refine((val) => {
      const year = parseInt(val, 10);
      return year >= new Date().getFullYear();
    }, 'Invalid expiration year'),
  cvc: z.string()
    .min(3, 'Security code must be at least 3 digits')
    .max(4, 'Security code must be at most 4 digits'),
  cardholderName: z.string()
    .min(2, 'Cardholder name is required'),
  billingEmail: z.string()
    .email('Please enter a valid email address'),
  billingAddress: z.object({
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postalCode: z.string().min(5, 'Postal code is required'),
    country: z.string().min(2, 'Country is required').default('US'),
  }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface AWSPaymentFormProps {
  amountCents: number;
  bookingId: string;
  providerId: string;
  customerId: string;
  customerEmail: string;
  serviceName: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

export function AWSPaymentForm({
  amountCents,
  bookingId,
  providerId,
  customerId,
  customerEmail,
  serviceName,
  onPaymentSuccess,
  onError,
}: AWSPaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [cardBrand, setCardBrand] = useState<string>('unknown');
  const [fraudScore, setFraudScore] = useState<any>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      billingEmail: customerEmail,
      billingAddress: {
        country: 'US',
      },
    },
  });

  const { watch, setValue } = form;
  const watchedCardNumber = watch('cardNumber');
  const watchedExpiryMonth = watch('expiryMonth');
  const watchedExpiryYear = watch('expiryYear');
  const watchedCVC = watch('cvc');

  // Calculate fees
  const feeCalculation = awsPaymentClient.calculateFees(amountCents);

  // Initialize payment intent
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const intent = await awsPaymentClient.createPaymentIntent({
          amount: amountCents,
          currency: 'USD',
          customerId,
          providerId,
          bookingId,
          metadata: {
            serviceName,
            customerEmail,
          },
        });

        setPaymentIntent(intent);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    };

    initializePayment();
  }, [amountCents, bookingId, providerId, customerId, customerEmail, serviceName, onError]);

  // Update card brand when card number changes
  useEffect(() => {
    if (watchedCardNumber) {
      const brand = getCardBrand(watchedCardNumber.replace(/\D/g, ''));
      setCardBrand(brand);
    }
  }, [watchedCardNumber]);

  // Format card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
    setValue('cardNumber', formattedValue);
  };

  // Format expiry input
  const handleExpiryChange = (field: 'expiryMonth' | 'expiryYear', value: string) => {
    setValue(field, value);
    
    // Validate expiry date in real-time
    if (watchedExpiryMonth && watchedExpiryYear) {
      const month = parseInt(watchedExpiryMonth, 10);
      const year = parseInt(watchedExpiryYear, 10);
      if (!validateExpirationDate(month, year)) {
        form.setError('expiryMonth', { message: 'Card has expired' });
      }
    }
  };

  // Validate CVC in real-time
  useEffect(() => {
    if (watchedCVC && cardBrand !== 'unknown') {
      if (!validateCVC(watchedCVC, cardBrand)) {
        const expectedLength = cardBrand === 'amex' ? 4 : 3;
        form.setError('cvc', { 
          message: `Security code must be ${expectedLength} digits for ${cardBrand.toUpperCase()}` 
        });
      }
    }
  }, [watchedCVC, cardBrand, form]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!paymentIntent) {
      setError('Payment not initialized. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Tokenize the card
      const tokenResult = await awsPaymentClient.tokenizeCard({
        number: data.cardNumber.replace(/\D/g, ''),
        expMonth: parseInt(data.expiryMonth, 10),
        expYear: parseInt(data.expiryYear, 10),
        cvc: data.cvc,
        billingDetails: {
          name: data.cardholderName,
          email: data.billingEmail,
          address: data.billingAddress,
        },
      });

      // Step 2: Assess fraud risk
      const fraudAssessment = await awsPaymentClient.assessFraudRisk({
        customerId,
        amount: amountCents,
        paymentMethodToken: tokenResult.token,
        metadata: {
          serviceName,
          bookingId,
          providerId,
        },
      });

      setFraudScore(fraudAssessment);

      // Step 3: Process payment if fraud risk is acceptable
      if (fraudAssessment.recommendation === 'decline') {
        setError('Payment declined for security reasons. Please try a different payment method.');
        return;
      }

      if (fraudAssessment.recommendation === 'review') {
        setError('Payment requires manual review. You will receive confirmation within 24 hours.');
        return;
      }

      const paymentResult = await awsPaymentClient.processPayment({
        paymentIntentId: paymentIntent.id,
        paymentMethodToken: tokenResult.token,
        customerId,
        amount: amountCents,
        metadata: {
          serviceName,
          bookingId,
          providerId,
          cardLast4: tokenResult.last4,
          cardBrand: tokenResult.brand,
        },
      });

      if (paymentResult.success && paymentResult.paymentIntentId) {
        // Step 4: Create escrow hold
        await awsPaymentClient.createEscrowHold({
          paymentIntentId: paymentResult.paymentIntentId,
          amount: feeCalculation.providerAmountCents,
          currency: 'USD',
          providerId,
          bookingId,
          holdDays: 7, // Default 7-day hold
          metadata: {
            serviceName,
            platformFeeCents: feeCalculation.platformFeeCents.toString(),
          },
        });

        // Step 5: Update booking status
        await client.models.Booking.update({
          id: bookingId,
          status: 'CONFIRMED',
          paymentStatus: 'ESCROW_HELD',
          paymentIntentId: paymentResult.paymentIntentId,
        });

        onPaymentSuccess(paymentResult.paymentIntentId);
      } else {
        setError(paymentResult.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
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
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          AWS Secure Payment
        </CardTitle>
        <CardDescription>
          Your payment is secured by AWS Payment Cryptography with advanced fraud protection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount Display */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Service Amount</span>
              <span className="text-xl font-bold">{formatAmount(amountCents)}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Platform fee ({awsPaymentClient.getPlatformFee().percentage}%)</span>
                <span>-{formatAmount(feeCalculation.platformFeeCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing fee</span>
                <span>-{formatAmount(feeCalculation.processingFeeCents)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Provider receives</span>
                <span>{formatAmount(feeCalculation.providerAmountCents)}</span>
              </div>
            </div>
          </div>

          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  maxLength={23} // 16 digits + 3 spaces
                  {...form.register('cardNumber')}
                  onChange={handleCardNumberChange}
                  className={cardBrand !== 'unknown' ? 'pr-12' : ''}
                />
                {cardBrand !== 'unknown' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {cardBrand}
                    </span>
                  </div>
                )}
              </div>
              {form.formState.errors.cardNumber && (
                <p className="text-sm text-red-600">{form.formState.errors.cardNumber.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Month</Label>
                <Select onValueChange={(value) => handleExpiryChange('expiryMonth', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiryYear">Year</Label>
                <Select onValueChange={(value) => handleExpiryChange('expiryYear', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder={cardBrand === 'amex' ? '1234' : '123'}
                  maxLength={4}
                  {...form.register('cvc')}
                />
                {form.formState.errors.cvc && (
                  <p className="text-xs text-red-600">{form.formState.errors.cvc.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                {...form.register('cardholderName')}
              />
              {form.formState.errors.cardholderName && (
                <p className="text-sm text-red-600">{form.formState.errors.cardholderName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingEmail">Billing Email</Label>
              <Input
                id="billingEmail"
                type="email"
                placeholder="john@example.com"
                {...form.register('billingEmail')}
              />
              {form.formState.errors.billingEmail && (
                <p className="text-sm text-red-600">{form.formState.errors.billingEmail.message}</p>
              )}
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Billing Address</h3>
            
            <div className="space-y-2">
              <Label htmlFor="billingAddress.line1">Street Address</Label>
              <Input
                id="billingAddress.line1"
                placeholder="123 Main Street"
                {...form.register('billingAddress.line1')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingAddress.line2">Apartment, suite, etc. (optional)</Label>
              <Input
                id="billingAddress.line2"
                placeholder="Apt 4B"
                {...form.register('billingAddress.line2')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingAddress.city">City</Label>
                <Input
                  id="billingAddress.city"
                  placeholder="New York"
                  {...form.register('billingAddress.city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingAddress.state">State</Label>
                <Input
                  id="billingAddress.state"
                  placeholder="NY"
                  {...form.register('billingAddress.state')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingAddress.postalCode">Postal Code</Label>
                <Input
                  id="billingAddress.postalCode"
                  placeholder="12345"
                  {...form.register('billingAddress.postalCode')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingAddress.country">Country</Label>
                <Select defaultValue="US" onValueChange={(value) => setValue('billingAddress.country', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Fraud Score Display */}
          {fraudScore && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Security Check: {fraudScore.riskLevel} risk
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Advanced fraud protection by AWS Fraud Detector
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <Lock className="h-3 w-3 mr-1" />
            <span>Secured by AWS Payment Cryptography • PCI DSS Level 1 Compliant</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>Pay {formatAmount(amountCents)}</>
            )}
          </Button>

          {/* Additional Information */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Your payment will be held securely in escrow until the service is completed.</p>
            <p>You can cancel up to 24 hours before your appointment for a full refund.</p>
            <p className="font-medium">98% lower processing fees than traditional payment processors</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}