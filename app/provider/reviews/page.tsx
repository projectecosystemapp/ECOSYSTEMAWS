'use client';

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ReviewList from '@/components/reviews/ReviewList';
import StarRating from '@/components/reviews/StarRating';
import { reviewApi } from '@/lib/api';
import { Review, ReviewStats, calculateReviewStats } from '@/lib/types';
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Clock,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

export default function ProviderReviewsPage() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.signInDetails?.loginId) return;

      try {
        setLoading(true);
        setError(null);

        const reviewsData = await reviewApi.listByProvider(user.signInDetails.loginId);
        setReviews((reviewsData || []) as any);
        
        const stats = calculateReviewStats((reviewsData || []) as any);
        setReviewStats(stats);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  const handleProviderResponse = async (reviewId: string, response: string) => {
    try {
      await reviewApi.addProviderResponse(reviewId, response);
      
      // Update the review in the local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, providerResponse: response }
          : review
      ));
    } catch (err) {
      console.error('Error submitting response:', err);
      throw new Error('Failed to submit response');
    }
  };

  // Filter reviews by status
  const pendingResponses = reviews.filter(review => !review.providerResponse);
  const respondedReviews = reviews.filter(review => review.providerResponse);
  const recentReviews = reviews
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Reviews</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reviews & Ratings
          </h1>
          <p className="text-gray-600">
            Manage customer reviews and track your service performance
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Overall Rating */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {reviewStats.averageRating.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <div className="mt-2">
                <StarRating rating={reviewStats.averageRating} readonly size="sm" />
              </div>
            </CardContent>
          </Card>

          {/* Total Reviews */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {reviewStats.totalReviews}
              </div>
              <p className="text-sm text-gray-600">Total Reviews</p>
            </CardContent>
          </Card>

          {/* Pending Responses */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {pendingResponses.length}
              </div>
              <p className="text-sm text-gray-600">Pending Responses</p>
              {pendingResponses.length > 0 && (
                <Badge variant="destructive" className="mt-2">
                  Action Needed
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Response Rate */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {reviewStats.totalReviews > 0 
                  ? Math.round((respondedReviews.length / reviewStats.totalReviews) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-gray-600">Response Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Breakdown */}
        {reviewStats.totalReviews > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Rating Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviewStats.ratingBreakdown[rating as keyof typeof reviewStats.ratingBreakdown];
                  const percentage = reviewStats.totalReviews > 0 
                    ? (count / reviewStats.totalReviews) * 100 
                    : 0;

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="w-8 text-right font-medium">{rating}</span>
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-gray-600">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All Reviews ({reviews.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending Response 
                  {pendingResponses.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingResponses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="responded">
                  Responded ({respondedReviews.length})
                </TabsTrigger>
                <TabsTrigger value="recent">
                  Recent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <ReviewList
                  reviews={reviews}
                  isProvider={true}
                  onProviderResponse={handleProviderResponse}
                  showHeader={false}
                  maxHeight="600px"
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                {pendingResponses.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      All Caught Up!
                    </h3>
                    <p className="text-gray-600">
                      You have responded to all customer reviews.
                    </p>
                  </div>
                ) : (
                  <ReviewList
                    reviews={pendingResponses}
                    isProvider={true}
                    onProviderResponse={handleProviderResponse}
                    showHeader={false}
                    maxHeight="600px"
                  />
                )}
              </TabsContent>

              <TabsContent value="responded" className="mt-6">
                <ReviewList
                  reviews={respondedReviews}
                  isProvider={true}
                  onProviderResponse={handleProviderResponse}
                  showHeader={false}
                  maxHeight="600px"
                />
              </TabsContent>

              <TabsContent value="recent" className="mt-6">
                <ReviewList
                  reviews={recentReviews}
                  isProvider={true}
                  onProviderResponse={handleProviderResponse}
                  showHeader={false}
                  maxHeight="600px"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}