'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { serviceApi, bookingApi } from '@/lib/api';
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
  const [step, setStep] = useState<'date' | 'time' | 'confirm'>('date');

  useEffect(() => {
    const fetchService = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        const serviceData = await serviceApi.get(params.id as string);
        setService(serviceData as any);
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
    setStep('confirm');
  };

  const handleBookingSubmit = async () => {
    if (!service || !selectedDate || !selectedTime || !user) return;
    
    try {
      setSubmitting(true);
      setError(null);

      const bookingData = {
        serviceId: service.id,
        customerEmail: user.signInDetails?.loginId || user.username || '',
        providerEmail: service.providerEmail,
        scheduledDate: formatDateForAPI(selectedDate),
        scheduledTime: selectedTime,
        status: 'PENDING' as const,
        totalAmount: service.price,
        notes: notes || undefined,
      };

      await bookingApi.create(bookingData);
      
      // Mock notification (console log as requested)
      console.log('🎉 Booking Created Successfully!', {
        service: service.title,
        date: selectedDate.toLocaleDateString(),
        time: formatTimeSlot(selectedTime),
        customer: bookingData.customerEmail,
        provider: bookingData.providerEmail,
      });

      // Redirect to bookings page
      router.push('/bookings?success=true');
      
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
    } else if (step === 'confirm') {
      setStep('time');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          <Link 
            href="/dashboard" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const priceBreakdown = calculatePriceBreakdown(service.price);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            href={`/services/${params.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Service Details
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step === 'date' ? 'text-blue-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold
                  ${step === 'date' ? 'border-blue-600 bg-blue-600 text-white' : 'border-green-600 bg-green-600 text-white'}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Select Date</span>
              </div>
              <div className={`w-8 h-1 ${step !== 'date' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step === 'time' ? 'text-blue-600' : step === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold
                  ${step === 'time' ? 'border-blue-600 bg-blue-600 text-white' : 
                    step === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Select Time</span>
              </div>
              <div className={`w-8 h-1 ${step === 'confirm' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step === 'confirm' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold
                  ${step === 'confirm' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                  3
                </div>
                <span className="ml-2 font-medium">Confirm</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Date Selection */}
              {step === 'date' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Select a Date</h2>
                  <p className="text-gray-600 mb-6">Choose your preferred date for the service.</p>
                  
                  <div className="flex justify-center">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => !isDateAvailable(date)}
                      modifiersClassNames={{
                        selected: 'bg-blue-600 text-white',
                        disabled: 'text-gray-400 cursor-not-allowed',
                      }}
                      className="border rounded-lg p-4"
                    />
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Available days:</strong> Monday through Friday<br />
                      <strong>Note:</strong> Weekends and past dates are not available for booking.
                    </p>
                  </div>
                </div>
              )}

              {/* Time Selection */}
              {step === 'time' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Select a Time</h2>
                    <button
                      onClick={goBack}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Change Date
                    </button>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Available time slots for {selectedDate?.toLocaleDateString()}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        className={`p-3 rounded-lg border-2 text-center transition-colors font-medium
                          ${slot.available 
                            ? 'border-gray-200 hover:border-blue-600 hover:bg-blue-50' 
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        disabled={!slot.available}
                      >
                        {formatTimeSlot(slot.time)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation */}
              {step === 'confirm' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Confirm Your Booking</h2>
                    <button
                      onClick={goBack}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Change Time
                    </button>
                  </div>
                  
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Any special requirements or notes for the service provider..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleBookingSubmit}
                        disabled={submitting}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Creating Booking...' : 'Confirm Booking'}
                      </button>
                      <button
                        onClick={goBack}
                        disabled={submitting}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                      >
                        Back
                      </button>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Service Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{service.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Price:</span>
                      <span className="font-medium">${priceBreakdown.servicePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Platform Fee (8%):</span>
                      <span>${priceBreakdown.platformCommission.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total:</span>
                        <span className="font-bold text-blue-600">${priceBreakdown.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedDate && selectedTime && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Selected Slot:</p>
                    <p className="text-sm text-gray-600">
                      {selectedDate.toLocaleDateString()} at {formatTimeSlot(selectedTime)}
                    </p>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500">
                    By booking, you agree to our terms of service. You will receive a confirmation email once the provider accepts your booking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}