'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { serviceApi, reviewApi, messageApi, generateConversationId } from '@/lib/api';
import { Service, calculatePriceBreakdown, Review } from '@/lib/types';
import { useAuthenticator } from '@aws-amplify/ui-react';
import ReviewList from '@/components/reviews/ReviewList';
import StarRating from '@/components/reviews/StarRating';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthenticator((context) => [context.user]);
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [serviceRating, setServiceRating] = useState({ averageRating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState(false);
  const [checkingMessaging, setCheckingMessaging] = useState(false);

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

  useEffect(() => {
    const fetchReviews = async () => {
      if (!params.id) return;
      
      try {
        setReviewsLoading(true);
        const [reviewsData, ratingData] = await Promise.all([
          reviewApi.listByService(params.id as string),
          reviewApi.getServiceRating(params.id as string)
        ]);
        
        setReviews((reviewsData || []) as any);
        setServiceRating(ratingData);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        // Don't set error for reviews, just continue with empty reviews
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [params.id]);

  // Check if user can message the provider
  useEffect(() => {
    const checkMessagingPermission = async () => {
      if (!user || !service) return;
      
      try {
        setCheckingMessaging(true);
        const userEmail = user.signInDetails?.loginId || '';
        const canMsg = await messageApi.canMessage(userEmail, service.providerEmail);
        setCanMessage(canMsg);
      } catch (error) {
        console.error('Error checking messaging permission:', error);
      } finally {
        setCheckingMessaging(false);
      }
    };

    checkMessagingPermission();
  }, [user, service]);

  const handleBookNow = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    router.push(`/services/${params.id}/book`);
  };

  const handleMessageProvider = () => {
    if (!user || !service) {
      router.push('/auth/login');
      return;
    }
    
    const userEmail = user.signInDetails?.loginId || '';
    const conversationId = generateConversationId(userEmail, service.providerEmail);
    router.push(`/messages/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested service could not be found.'}</p>
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
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Services
          </Link>
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {service.title}
                </h1>
                <div className="flex items-center text-gray-600 mb-4 flex-wrap gap-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {service.category}
                  </span>
                  <span className="text-sm">
                    Duration: {service.duration} minutes
                  </span>
                  {serviceRating.reviewCount > 0 && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={serviceRating.averageRating} readonly size="sm" />
                      <span className="text-sm">
                        {serviceRating.averageRating.toFixed(1)} ({serviceRating.reviewCount} review{serviceRating.reviewCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          </div>

          {/* Provider Info */}
          <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Provider</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg mr-4">
                {service.providerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{service.providerName}</p>
                <p className="text-gray-600">{service.providerEmail}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Service Price:</span>
                <span className="font-semibold">${priceBreakdown.servicePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                <span>Platform Commission (8%):</span>
                <span>${priceBreakdown.platformCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                <span>Provider Receives (92%):</span>
                <span>${priceBreakdown.providerAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${priceBreakdown.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Section */}
          <div className="px-6 py-8">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to book this service?
                </h3>
                <p className="text-gray-600">
                  Choose your preferred date and time to get started.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBookNow}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                >
                  Book Now
                </button>
                
                {/* Message Provider Button */}
                {canMessage && (
                  <Button
                    onClick={handleMessageProvider}
                    variant="outline"
                    className="px-8 py-3 border-blue-600 text-blue-600 hover:bg-blue-50"
                    disabled={checkingMessaging}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Provider
                  </Button>
                )}
                
                <Link
                  href="/dashboard"
                  className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-center"
                >
                  Browse More
                </Link>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Booking Information</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Bookings are available Monday through Friday</li>
                <li>• Time slots are available from 9:00 AM to 6:00 PM</li>
                <li>• You will receive a confirmation email once your booking is confirmed</li>
                <li>• Cancellations can be made through your booking dashboard</li>
              </ul>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-8">
            {reviewsLoading ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading reviews...</p>
              </div>
            ) : (
              <ReviewList
                reviews={reviews}
                showHeader={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}