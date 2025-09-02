'use client';

import { useState } from 'react';
import { Search, DollarSign, Calendar, MapPin, Loader2 } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const client = generateClient<Schema>();

const categories = [
  'Home Services', 'Professional Services', 'Health & Wellness',
  'Education & Training', 'Technology', 'Creative Services',
  'Transportation', 'Events & Entertainment', 'Other'
];

interface ServiceRequestFormProps {
  onRequestCreated?: (requestId: string) => void;
}

export function ServiceRequestForm({ onRequestCreated }: ServiceRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    desiredDate: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, errors } = await client.mutations.createServiceRequest({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        desiredDate: formData.desiredDate || undefined,
        location: formData.location || undefined,
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const result = data as any;
      setSuccess('Service request posted! Providers will be notified of matches.');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        budget: '',
        desiredDate: '',
        location: '',
      });

      if (onRequestCreated && result.requestId) {
        onRequestCreated(result.requestId);
      }
    } catch (err) {
      console.error('Error creating service request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-500" />
          Post a Service Request
        </CardTitle>
        <CardDescription>
          Tell us what you need and let providers come to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">What do you need? *</Label>
            <Input
              id="title"
              placeholder="e.g., Need a plumber to fix kitchen sink"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide more details about what you need..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Budget (optional)
              </Label>
              <Input
                id="budget"
                type="number"
                placeholder="0.00"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desiredDate" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Desired Date (optional)
              </Label>
              <Input
                id="desiredDate"
                type="date"
                value={formData.desiredDate}
                onChange={(e) => setFormData(prev => ({ ...prev, desiredDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Location (optional)
            </Label>
            <Input
              id="location"
              placeholder="City, State or Address"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting Request...
              </>
            ) : (
              'Post Service Request'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}