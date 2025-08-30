'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERVICE_CATEGORIES, ServiceFormData, FormErrors, Service } from '@/lib/types';

interface ServiceFormProps {
  service?: Service | null;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitText?: string;
}

export default function ServiceForm({ 
  service, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  submitText = 'Save Service'
}: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    title: '',
    description: '',
    price: 0,
    category: 'Home Services',
    duration: 60,
    active: true,
    serviceAddress: '',
    serviceCity: '',
    serviceState: '',
    serviceZipCode: '',
    serviceRadius: 10,
    locationType: 'PROVIDER_LOCATION'
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Initialize form with service data if editing
  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title || '',
        description: service.description || '',
        price: service.price || 0,
        category: (service.category as any) || 'Home Services',
        duration: service.duration || 60,
        active: service.active ?? true,
        serviceAddress: service.serviceAddress || '',
        serviceCity: service.serviceCity || '',
        serviceState: service.serviceState || '',
        serviceZipCode: service.serviceZipCode || '',
        serviceRadius: service.serviceRadius || 10,
        locationType: service.locationType || 'PROVIDER_LOCATION'
      });
    }
  }, [service]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    } else if (formData.price > 10000) {
      newErrors.price = 'Price cannot exceed $10,000';
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0 minutes';
    } else if (formData.duration > 1440) {
      newErrors.duration = 'Duration cannot exceed 24 hours (1440 minutes)';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ general: 'Failed to save service. Please try again.' });
    }
  };

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {service ? 'Edit Service' : 'Create New Service'}
        </CardTitle>
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-700">
            <span className="font-medium">Low 8% Commission:</span> Keep more of your earnings with our industry-leading low commission rate.
          </p>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Service Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Professional House Cleaning"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Service Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your service in detail..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* Price and Duration Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                placeholder="60"
                className={errors.duration ? 'border-red-500' : ''}
              />
              {errors.duration && <p className="text-sm text-red-600">{errors.duration}</p>}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Location Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Service Location</h3>
            
            {/* Location Type */}
            <div className="space-y-2">
              <Label>Where is this service provided?</Label>
              <Select 
                value={formData.locationType || 'PROVIDER_LOCATION'} 
                onValueChange={(value: any) => handleInputChange('locationType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROVIDER_LOCATION">At my location</SelectItem>
                  <SelectItem value="CUSTOMER_LOCATION">At customer's location</SelectItem>
                  <SelectItem value="BOTH">Both (flexible)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="serviceAddress">Service Address</Label>
              <Input
                id="serviceAddress"
                value={formData.serviceAddress || ''}
                onChange={(e) => handleInputChange('serviceAddress', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>

            {/* City, State, Zip Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceCity">City</Label>
                <Input
                  id="serviceCity"
                  value={formData.serviceCity || ''}
                  onChange={(e) => handleInputChange('serviceCity', e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serviceState">State</Label>
                <Input
                  id="serviceState"
                  value={formData.serviceState || ''}
                  onChange={(e) => handleInputChange('serviceState', e.target.value)}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serviceZipCode">ZIP Code</Label>
                <Input
                  id="serviceZipCode"
                  value={formData.serviceZipCode || ''}
                  onChange={(e) => handleInputChange('serviceZipCode', e.target.value)}
                  placeholder="94105"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Service Radius */}
            {(formData.locationType === 'CUSTOMER_LOCATION' || formData.locationType === 'BOTH') && (
              <div className="space-y-2">
                <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="serviceRadius"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.serviceRadius || 10}
                    onChange={(e) => handleInputChange('serviceRadius', parseInt(e.target.value) || 10)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">
                    How far you're willing to travel to provide this service
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active Status */}
          <div className="space-y-2">
            <Label>Service Status</Label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="active"
                  checked={formData.active === true}
                  onChange={() => handleInputChange('active', true)}
                  className="text-blue-600"
                />
                <span className="text-sm">Active (visible to customers)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="active"
                  checked={formData.active === false}
                  onChange={() => handleInputChange('active', false)}
                  className="text-blue-600"
                />
                <span className="text-sm">Inactive (hidden from customers)</span>
              </label>
            </div>
          </div>

          {/* Image Upload Placeholder */}
          <div className="space-y-2">
            <Label>Service Images</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <p className="text-gray-500">Image upload coming soon</p>
              <p className="text-sm text-gray-400">Add photos to showcase your service</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitText}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}