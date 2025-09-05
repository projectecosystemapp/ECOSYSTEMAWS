'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { 
  MessageCircle, 
  Clock, 
  MapPin, 
  Star, 
  Shield,
  Zap,
  Calendar,
  ArrowLeft,
  CheckCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import MessageProviderButton from '@/components/messaging/MessageProviderButton';
import ReviewList from '@/components/reviews/ReviewList';
import StarRating from '@/components/reviews/StarRating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { refactoredApi } from '@/lib/api/refactored';
import { Service, calculatePriceBreakdown, Review } from '@/lib/types';


export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthenticator((context) => [context.user]);
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [serviceRating, setServiceRating] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchReviews = async () => {
      if (!params.id) return;
      
      try {
        setReviewsLoading(true);
        const [reviewsData, ratingData] = await Promise.all([
          refactoredApi.review.listByService(params.id as string),
          refactoredApi.review.getServiceRating(params.id as string)
        ]);
        
        setReviews(reviewsData || []);
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

  const handleBookNow = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    router.push(`/services/${params.id}/book`);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
          <Link href="/services">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Browse All Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const priceBreakdown = calculatePriceBreakdown(service.price);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/" className="hover:text-gray-700">Home</Link>
                <span>/</span>
                <Link href="/services" className="hover:text-gray-700">Services</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{service.title}</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Overview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        {service.category}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {service.title}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-600 mb-4">
                      {serviceRating.totalReviews > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i < Math.floor(serviceRating.averageRating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {serviceRating.averageRating.toFixed(1)} ({serviceRating.totalReviews} reviews)
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No reviews yet</span>
                      )}
                      {service.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{service.duration} minutes</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">Local service</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this service</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {service.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Provider Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">About the provider</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {service.providerName?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{service.providerName}</h4>
                      <Shield className="w-5 h-5 text-blue-500" />
                      <Badge variant="secondary" className="text-xs">Verified</Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{service.providerEmail}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Professional service provider</span>
                      <span>•</span>
                      <span>Quick response time</span>
                      <span>•</span>
                      <span>Quality guaranteed</span>
                    </div>
                  </div>
                  <MessageProviderButton
                    providerEmail={service.providerEmail}
                    providerName={service.title}
                    currentUserEmail={user?.signInDetails?.loginId}
                    serviceId={service.id}
                    variant="outline"
                    className="flex items-center gap-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            {reviewsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ReviewList
                reviews={reviews}
                showHeader={true}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ${service.price.toFixed(2)}
                  </div>
                  <div className="text-gray-600">starting price</div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Price breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service price:</span>
                      <span className="font-medium">${priceBreakdown.servicePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Platform fee (8%):</span>
                      <span>${priceBreakdown.platformCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Provider gets (92%):</span>
                      <span>${priceBreakdown.providerAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-purple-600">${priceBreakdown.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Button */}
                <Button
                  onClick={handleBookNow}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 mb-3"
                  size="lg"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/services')}
                  className="w-full"
                >
                  Browse More Services
                </Button>

                {/* Service Features */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">What's included</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Professional service delivery
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Quality guarantee
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Customer support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Secure payment processing
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Booking Information */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Booking information
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Available Monday through Friday</li>
                  <li>• Time slots: 9:00 AM to 6:00 PM</li>
                  <li>• Instant confirmation available</li>
                  <li>• Free cancellation up to 24h before</li>
                  <li>• Secure payment with Stripe</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}