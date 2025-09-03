'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ServiceForm from '@/components/provider/ServiceForm';
import { serviceApi } from '@/lib/api';
import { ServiceFormData } from '@/lib/types';

export default function NewService() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (formData: ServiceFormData) => {
    try {
      setIsSubmitting(true);
      setError('');

      // Get current user
      const user = await getCurrentUser();
      const email = user.signInDetails?.loginId;
      
      if (!email) {
        throw new Error('User not authenticated');
      }

      // Get user profile for provider name
      // For now, we'll use the email as provider name until we have profile data
      const providerName = email.split('@')[0]; // Simple fallback

      // Create service data with location
      const serviceData = {
        ...formData,
        providerEmail: email,
        providerName: providerName,
        // Ensure location fields are included
        serviceAddress: nullableToString(formData.serviceAddress),
        serviceCity: nullableToString(formData.serviceCity),
        serviceState: nullableToString(formData.serviceState),
        serviceZipCode: nullableToString(formData.serviceZipCode),
        serviceRadius: nullableToString(formData.serviceRadius),
        locationType: nullableToString(formData.locationType),
      };

      await serviceApi.create(serviceData);
      
      // Redirect to services list
      router.push('/provider/services');
    } catch (err) {
      console.error('Error creating service:', err);
      setError(err instanceof Error ? err.message : 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/provider/services');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Service</h1>
          <p className="text-gray-600">Add a new service to your offerings</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Service Form */}
        <ServiceForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitText="Create Service"
        />
    </div>
  );
}