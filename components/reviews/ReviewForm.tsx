'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import StarRating from './StarRating';

interface ReviewFormProps {
  serviceTitle: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ReviewForm({
  serviceTitle,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Please provide a comment with at least 10 characters');
      return;
    }

    if (comment.length > 500) {
      setError('Comment must be 500 characters or less');
      return;
    }

    try {
      await onSubmit(rating, comment.trim());
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Write a Review</CardTitle>
        <p className="text-gray-600">Share your experience with "{serviceTitle}"</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Overall Rating *</Label>
            <div className="flex items-center gap-3">
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size="lg"
              />
              {rating > 0 && (
                <span className="text-sm text-gray-600">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-base font-medium">
              Your Review *
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience with this service. What did you like? What could be improved?"
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Minimum 10 characters</span>
              <span>{comment.length}/500 characters</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || comment.trim().length < 10 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting Review...' : 'Submit Review'}
            </Button>
          </div>

          {/* Review Guidelines */}
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h4 className="font-medium text-blue-900 mb-2">Review Guidelines</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Be honest and constructive in your feedback</li>
              <li>• Focus on your personal experience with the service</li>
              <li>• Avoid personal attacks or inappropriate language</li>
              <li>• Reviews cannot be edited once submitted</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}