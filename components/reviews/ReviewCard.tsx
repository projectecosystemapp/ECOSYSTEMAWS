'use client';

import { User, Calendar, MessageSquare, Reply } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import StarRating from './StarRating';

interface Review {
  id: string;
  serviceId: string;
  bookingId: string;
  customerEmail: string;
  providerEmail: string;
  rating: number;
  comment?: string;
  providerResponse?: string;
  createdAt?: string;
}

interface ReviewCardProps {
  review: Review;
  isProvider?: boolean;
  onProviderResponse?: (reviewId: string, response: string) => void;
}

export default function ReviewCard({
  review,
  isProvider = false,
  onProviderResponse
}: ReviewCardProps) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitResponse = async () => {
    if (!responseText.trim() || !onProviderResponse) return;

    setIsSubmitting(true);
    try {
      await onProviderResponse(review.id, responseText.trim());
      setResponseText('');
      setShowResponseForm(false);
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCustomerInitials = (email: string) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-6">
        {/* Review Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getCustomerInitials(review.customerEmail)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} readonly size="sm" />
                {review.createdAt && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(review.createdAt)}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {review.customerEmail.split('@')[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Review Comment */}
        {review.comment && (
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">{review.comment}</p>
          </div>
        )}

        {/* Provider Response */}
        {review.providerResponse && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Reply className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-600">
                Response from Provider
              </span>
            </div>
            <p className="text-gray-700 text-sm">{review.providerResponse}</p>
          </div>
        )}

        {/* Provider Response Form */}
        {isProvider && !review.providerResponse && (
          <div className="mt-4">
            {!showResponseForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResponseForm(true)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Respond to Review
              </Button>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response to this review..."
                  maxLength={300}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {responseText.length}/300 characters
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponseText('');
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitResponse}
                      disabled={!responseText.trim() || isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Response'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}