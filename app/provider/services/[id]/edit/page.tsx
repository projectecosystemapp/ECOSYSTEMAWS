'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import LoadingSpinner from '@/components/provider/LoadingSpinner';
import ServiceForm from '@/components/provider/ServiceForm';
import { serviceApi } from '@/lib/api';
import { ServiceFormData, Service } from '@/lib/types';

export default function EditService() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  const loadService = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user to verify ownership
      const user = await getCurrentUser();
      const userEmail = user.signInDetails?.loginId;
      
      if (!userEmail) {
        setError('User not authenticated');
        return;
      }

      // Load service
      const serviceData = await serviceApi.get(serviceId);
      
      if (!serviceData) {
        setError('Service not found');
        return;
      }

      // Verify ownership
      if (serviceData.providerEmail !== userEmail) {
        setError('You are not authorized to edit this service');
        return;
      }

      setService(serviceData as any);
    } catch (err) {
      console.error('Error loading service:', err);
      setError('Failed to load service');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: ServiceFormData) => {
    if (!service) return;

    try {
      setIsSubmitting(true);
      setError('');

      // Update service data
      const updateData = {
        id: nullableToString(service.id),
        ...formData,
        providerEmail: nullableToString(service.providerEmail),
        providerName: nullableToString(service.providerName),
      };

      await serviceApi.update(updateData);
      
      // Redirect to services list
      router.push('/provider/services');
    } catch (err) {
      console.error('Error updating service:', err);
      setError(err instanceof Error ? err.message : 'Failed to update service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/provider/services');
  };

  const handleDelete = async () => {
    if (!service) return;

    const confirmMessage = `Are you sure you want to delete "${service.title}"? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await serviceApi.delete(service.id);
      router.push('/provider/services');
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner message="Loading service..." className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
          <div className="mt-4 space-x-4">
            <button
              onClick={loadService}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/provider/services')}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Back to Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Service not found</h3>
          <p className="text-gray-600 mb-6">The service you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/provider/services')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Service</h1>
              <p className="text-gray-600">Update your service details</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="mt-4 sm:mt-0 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Service
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Service Form */}
        <ServiceForm
          service={service}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitText="Update Service"
        />
    </div>
  );
}