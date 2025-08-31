'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { refactoredApi } from '@/lib/api/refactored';
import { 
  Service, 
  BookingFormData, 
  TIME_SLOTS, 
  calculatePriceBreakdown, 
  isDateAvailable, 
  formatDateForAPI,
  formatTimeSlot 
} from '@/lib/types';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Clock,
  User,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Info
} from 'lucide-react';

// Stripe Elements for payment processing (we'll simulate this for now)
const StripePaymentForm = ({ 
  amount, 
  onPaymentSuccess, 
  loading 
}: { 
  amount: number; 
  onPaymentSuccess: (paymentIntentId: string) => void; 
  loading: boolean;
}) => {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      // Simulate Stripe payment processing
      // In real implementation, this would integrate with Stripe Elements
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful payment intent
      const mockPaymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      onPaymentSuccess(mockPaymentIntentId);
      
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mock Credit Card Form */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Payment Information</span>
        </div>
        
        {/* Mock form fields */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="MM/YY"
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled
            />
            <input
              type="text"
              placeholder="CVC"
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled
            />
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <Shield className="w-4 h-4 inline mr-1" />
            Demo mode: This is a simulated payment form. In production, real Stripe Elements would be integrated here.
          </p>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={processing || loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
        size="lg"
      >
        {processing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing Payment...
          </div>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </Button>
    </div>
  );
};

export default function BookServicePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthenticator((context) => [context.user]);
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [step, setStep] = useState<'date' | 'time' | 'payment' | 'confirm'>('date');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  useEffect(() => {
    const fetchService = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        const serviceData = await refactoredApi.service.get(params.id as string);
        if (serviceData) {
          setService(serviceData);
        } else {
          setError('Service not found');
        }
      } catch (err) {
        console.error('Error fetching service:', err);
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [params.id]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date && isDateAvailable(date)) {
      setSelectedDate(date);
      setStep('time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('payment');
  };

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    setStep('confirm');
  };

  const handleBookingSubmit = async () => {
    if (!service || !selectedDate || !selectedTime || !user || !paymentIntentId) return;
    
    try {
      setSubmitting(true);
      setError(null);

      const priceBreakdown = calculatePriceBreakdown(service.price);
      const customerEmail = user.signInDetails?.loginId || user.username || '';

      const bookingData = {
        serviceId: service.id,
        providerId: service.providerEmail, // Using email as ID for now
        providerEmail: service.providerEmail,
        customerId: customerEmail, // Using email as ID for now
        customerEmail: customerEmail,
        scheduledDate: formatDateForAPI(selectedDate),
        scheduledTime: selectedTime,
        duration: service.duration || 60,
        status: 'CONFIRMED' as const, // Since payment is processed
        totalAmount: priceBreakdown.totalAmount,
        platformFee: priceBreakdown.platformCommission,
        providerEarnings: priceBreakdown.providerAmount,
        notes: notes || undefined,
        paymentIntentId: paymentIntentId,
      };

      const booking = await refactoredApi.booking.create(bookingData);
      
      if (booking) {
        // Success notification
        console.log('🎉 Booking Created Successfully!', {
          bookingId: booking.id,
          service: service.title,
          date: selectedDate.toLocaleDateString(),
          time: formatTimeSlot(selectedTime),
          customer: customerEmail,
          provider: service.providerEmail,
          amount: priceBreakdown.totalAmount,
          paymentIntentId: paymentIntentId
        });

        // Redirect to success page
        router.push(`/bookings/${booking.id}?success=true`);
      } else {
        throw new Error('Failed to create booking');
      }
      
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 'time') {
      setStep('date');
      setSelectedTime('');
    } else if (step === 'payment') {
      setStep('time');
    } else if (step === 'confirm') {
      setStep('payment');
      setPaymentIntentId('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking form...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Unable to load booking form.'}</p>
          <Link href="/services">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Browse Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const priceBreakdown = calculatePriceBreakdown(service.price);

  const steps = [
    { key: 'date', label: 'Select Date', icon: Calendar },
    { key: 'time', label: 'Select Time', icon: Clock },
    { key: 'payment', label: 'Payment', icon: CreditCard },
    { key: 'confirm', label: 'Confirm', icon: CheckCircle }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/services/${params.id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Service
              </Button>
            </div>
            <div className="text-right">
              <h1 className="font-semibold text-gray-900">Book Service</h1>
              <p className="text-sm text-gray-600">{service.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((stepItem, index) => (
              <div key={stepItem.key} className="flex items-center">
                <div className={`flex items-center ${
                  index <= currentStepIndex ? 'text-purple-600' : 'text-gray-400'
                }`}>
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold
                    ${index < currentStepIndex 
                      ? 'border-green-600 bg-green-600 text-white' 
                      : index === currentStepIndex
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-300 bg-white'
                    }`}>
                    {index < currentStepIndex ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <stepItem.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="ml-2 font-medium hidden sm:block">{stepItem.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-1 mx-4 ${
                    index < currentStepIndex ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {/* Date Selection */}
                {step === 'date' && (
                  <div>
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        Select a Date
                      </CardTitle>
                      <p className="text-gray-600">Choose your preferred date for the service.</p>
                    </CardHeader>
                    
                    <div className="flex justify-center">
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => !isDateAvailable(date)}
                        modifiersClassNames={{
                          selected: 'bg-purple-600 text-white',
                          disabled: 'text-gray-400 cursor-not-allowed',
                        }}
                        className="border rounded-lg p-4"
                      />
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex gap-2">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-blue-800 text-sm">
                          <p className="font-medium mb-1">Availability Information</p>
                          <p>• Available days: Monday through Friday</p>
                          <p>• Weekends and past dates are not available</p>
                          <p>• Book up to 30 days in advance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time Selection */}
                {step === 'time' && (
                  <div>
                    <CardHeader className="px-0 pt-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-purple-600" />
                          Select a Time
                        </CardTitle>
                        <Button
                          variant="ghost"
                          onClick={goBack}
                          className="flex items-center gap-1 text-purple-600"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Change Date
                        </Button>
                      </div>
                      <p className="text-gray-600">
                        Available time slots for <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                      </p>
                    </CardHeader>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TIME_SLOTS.map((slot) => (
                        <Button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          variant={slot.available ? "outline" : "secondary"}
                          className={`p-4 h-auto ${
                            slot.available 
                              ? 'hover:bg-purple-50 hover:border-purple-300' 
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          disabled={!slot.available}
                        >
                          <div className="text-center">
                            <div className="font-medium">{formatTimeSlot(slot.time)}</div>
                            <div className="text-xs text-gray-500">
                              {slot.available ? 'Available' : 'Unavailable'}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment */}
                {step === 'payment' && (
                  <div>
                    <CardHeader className="px-0 pt-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          Payment Information
                        </CardTitle>
                        <Button
                          variant="ghost"
                          onClick={goBack}
                          className="flex items-center gap-1 text-purple-600"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Change Time
                        </Button>
                      </div>
                      <p className="text-gray-600">
                        Secure payment processing powered by Stripe
                      </p>
                    </CardHeader>

                    <StripePaymentForm
                      amount={priceBreakdown.totalAmount}
                      onPaymentSuccess={handlePaymentSuccess}
                      loading={submitting}
                    />
                  </div>
                )}

                {/* Confirmation */}
                {step === 'confirm' && (
                  <div>
                    <CardHeader className="px-0 pt-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Confirm Your Booking
                        </CardTitle>
                        <Button
                          variant="ghost"
                          onClick={goBack}
                          className="flex items-center gap-1 text-purple-600"
                          disabled={submitting}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Payment
                        </Button>
                      </div>
                      <p className="text-gray-600">
                        Please review your booking details and confirm
                      </p>
                    </CardHeader>
                    
                    <div className="space-y-6">
                      {/* Booking Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-medium">{selectedDate?.toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Time</p>
                            <p className="font-medium">{formatTimeSlot(selectedTime)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-medium">{service.duration} minutes</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Provider</p>
                            <p className="font-medium">{service.providerName}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Confirmation */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">Payment Processed</span>
                        </div>
                        <p className="text-sm text-green-800">
                          Payment of ${priceBreakdown.totalAmount.toFixed(2)} has been successfully processed.
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Payment ID: {paymentIntentId}
                        </p>
                      </div>

                      {/* Notes */}
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Any special requirements or notes for the service provider..."
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleBookingSubmit}
                          disabled={submitting}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                          size="lg"
                        >
                          {submitting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Creating Booking...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Confirm Booking
                            </div>
                          )}
                        </Button>
                      </div>

                      {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-600">{error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Service Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Service Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{service.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{service.category}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Price:</span>
                    <span className="font-medium">${priceBreakdown.servicePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Platform Fee (8%):</span>
                    <span>${priceBreakdown.platformCommission.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-purple-600">${priceBreakdown.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {selectedDate && selectedTime && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Selected Slot:</p>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm text-purple-900 font-medium">
                          📅 {selectedDate.toLocaleDateString()}
                        </p>
                        <p className="text-sm text-purple-900 font-medium">
                          🕒 {formatTimeSlot(selectedTime)}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {paymentIntentId && (
                  <>
                    <Separator />
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Payment Confirmed</span>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div>
                  <p className="text-xs text-gray-500">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Secure booking powered by Stripe. Your payment information is encrypted and protected.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}