import { describe, it, expect } from 'vitest';

import {
  mapApiServiceToService,
  mapApiBookingToBooking,
  mapApiReviewToReview,
  mapApiUserProfileToUserProfile,
  mapApiMessageToMessage,
  mapApiServiceList,
  mapApiBookingList,
  mapApiReviewList,
} from './mappers';

describe('Mapper Functions', () => {
  describe('mapApiServiceToService', () => {
    it('should handle null values by converting to undefined', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: 'SERVICE' as const,
        subcategory: null,
        price: 100,
        minimumBookingTime: null,
        tags: null,
        images: null,
        address: null,
        city: null,
        state: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        priceType: null,
        video: null,
        serviceRadius: null,
        availability: null,
        instantBooking: null,
        cancellationPolicy: null,
        requirements: null,
        included: null,
        excluded: null,
        faqs: null,
        minimumNotice: null,
        maximumBookingAdvance: null,
        totalBookings: null,
        completedBookings: null,
        averageRating: null,
        totalReviews: null,
        featured: null,
        active: null,
        locationType: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      // Check that properties that should be undefined are undefined
      expect(result.serviceAddress).toBeUndefined();
      expect(result.serviceCity).toBeUndefined();
      expect(result.serviceState).toBeUndefined();
      expect(result.serviceZipCode).toBeUndefined();
      expect(result.latitude).toBeUndefined();
      expect(result.longitude).toBeUndefined();
      expect(result.serviceRadius).toBeUndefined();
      expect(result.locationType).toBeUndefined();
    });

    it('should provide default values for numeric and boolean fields', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: null,
        price: 0,  // price is required, cannot be null
        minimumBookingTime: null,
        priceType: null,
        totalBookings: null,
        completedBookings: null,
        averageRating: null,
        totalReviews: null,
        featured: null,
        active: null,
        instantBooking: null,
        address: null,
        city: null,
        state: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        serviceRadius: null,
        locationType: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.category).toBe('SERVICE');
      expect(result.price).toBe(0);
      expect(result.duration).toBe(60); // Default duration from minimumBookingTime
      expect(result.active).toBe(true);
    });

    it('should extract provider name from email', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'john.doe@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: 'SERVICE' as const,
        price: 100,
        minimumBookingTime: 90,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.providerName).toBe('john.doe');
      expect(result.providerEmail).toBe('john.doe@example.com');
    });

    it('should handle location fields correctly', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: 'SERVICE' as const,
        price: 100,
        minimumBookingTime: 60,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        latitude: 40.7128,
        longitude: -74.0060,
        serviceRadius: 10,
        locationType: 'PROVIDER_LOCATION' as const,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.serviceAddress).toBe('123 Main St');
      expect(result.serviceCity).toBe('New York');
      expect(result.serviceState).toBe('NY');
      expect(result.serviceZipCode).toBe('10001');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.serviceRadius).toBe(10);
      expect(result.locationType).toBe('PROVIDER_LOCATION');
    });

    it('should handle array fields correctly', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: 'SERVICE' as const,
        price: 100,
        minimumBookingTime: 60,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.id).toBe('service-1');
      expect(result.title).toBe('Test Service');
      expect(result.description).toBe('Test Description');
      expect(result.price).toBe(100);
      expect(result.category).toBe('SERVICE');
      expect(result.duration).toBe(60);
      expect(result.active).toBe(true);
    });
  });

  describe('mapApiBookingToBooking', () => {
    it('should extract date and time from datetime strings', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        startDateTime: '2024-01-15T10:00:00Z',
        endDateTime: '2024-01-15T11:00:00Z',
        status: 'PENDING' as const,
        amount: 100,
        duration: 60,
        customerNotes: 'Test notes',
        paymentStatus: 'PENDING' as const,
        paymentIntentId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.scheduledDate).toBe('2024-01-15');
      expect(result.scheduledTime).toBe('10:00');
      // startDateTime and endDateTime are transformed to scheduledDate and scheduledTime
      expect(result.duration).toBe(60); // 1 hour in minutes
    });

    it('should handle invalid dates gracefully', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        startDateTime: 'invalid-date',
        endDateTime: '2024-01-15T11:00:00Z',
        status: 'PENDING' as const,
        amount: 100,
        duration: null,
        customerNotes: null,
        paymentStatus: 'PENDING' as const,
        paymentIntentId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.scheduledDate).toBe('TBD');
      expect(result.scheduledTime).toBe('TBD');
      expect(result.duration).toBe(60); // Default duration
    });

    it('should calculate duration correctly', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        startDateTime: '2024-01-15T09:00:00Z',
        endDateTime: '2024-01-15T11:30:00Z',
        status: 'CONFIRMED' as const,
        amount: 150,
        duration: 150,
        customerNotes: 'Extended session',
        paymentStatus: 'RELEASED' as const,
        paymentIntentId: 'pi_123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.duration).toBe(150); // 2.5 hours in minutes
      expect(result.status).toBe('CONFIRMED');
      expect(result.paymentStatus).toBe('RELEASED');
    });

    it('should handle missing payment data', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        startDateTime: '2024-01-15T10:00:00Z',
        endDateTime: '2024-01-15T11:00:00Z',
        status: 'PENDING' as const,
        amount: 100,
        duration: 60,
        customerNotes: null,
        paymentStatus: null,
        paymentIntentId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.paymentStatus).toBe('PENDING');
      expect(result.paymentIntentId).toBeUndefined();
    });
  });

  describe('mapApiReviewToReview', () => {
    it('should map review correctly', () => {
      const apiReview = {
        id: 'review-1',
        bookingId: 'booking-1',
        serviceId: 'service-1',
        reviewerType: 'CUSTOMER' as const,
        reviewerId: 'customer-1',
        reviewerEmail: 'customer@example.com',
        revieweeId: 'provider-1',
        revieweeEmail: 'provider@example.com',
        rating: 5,
        comment: 'Excellent service!',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        owner: null,
      };

      const result = mapApiReviewToReview(apiReview);

      expect(result.id).toBe('review-1');
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Excellent service!');
      expect(result.customerEmail).toBe('customer@example.com');
      expect(result.providerEmail).toBe('provider@example.com');
    });

    it('should handle provider reviews', () => {
      const apiReview = {
        id: 'review-2',
        bookingId: 'booking-1',
        serviceId: 'service-1',
        reviewerType: 'PROVIDER' as const,
        reviewerId: 'provider-1',
        reviewerEmail: 'provider@example.com',
        revieweeId: 'customer-1',
        revieweeEmail: 'customer@example.com',
        rating: 4,
        comment: 'Good customer',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        owner: null,
      };

      const result = mapApiReviewToReview(apiReview);

      // When provider reviews customer, emails are swapped
      expect(result.customerEmail).toBe('customer@example.com');
      expect(result.providerEmail).toBe('provider@example.com');
    });
  });

  describe('mapApiUserProfileToUserProfile', () => {
    it('should map user profile with all fields', () => {
      const apiProfile = {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'PROVIDER' as const,
        businessName: 'John\'s Services',
        businessDescription: 'Professional services',
        phone: '+1234567890',
        profileImage: 'https://example.com/profile.jpg',
        coverImage: 'https://example.com/cover.jpg',
        location: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
        serviceRadius: 20,
        bio: 'Experienced professional',
        specializations: ['plumbing', 'electrical'],
        certifications: ['licensed', 'certified'],
        insurance: true,
        backgroundCheck: true,
        identityVerified: true,
        averageRating: 4.5,
        totalReviews: 10,
        completedBookings: 25,
        stripeAccountId: 'acct_123',
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
        stripeAccountStatus: 'ACTIVE' as const,
        stripeOnboardingComplete: true,
        active: true,
        premium: false,
        language: 'en',
        timezone: 'America/New_York',
        notificationSettings: { email: true, sms: false },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiUserProfileToUserProfile(apiProfile);

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('user@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.role).toBe('PROVIDER');
      expect(result.businessName).toBe('John\'s Services');
      expect(result.averageRating).toBe(4.5);
      expect(result.stripeAccountId).toBe('acct_123');
      expect(result.stripeOnboardingComplete).toBe(true);
      expect(result.active).toBe(true);
    });

    it('should handle missing optional fields', () => {
      const apiProfile = {
        id: 'user-2',
        email: 'customer@example.com',
        firstName: null,
        lastName: null,
        role: null,
        businessName: null,
        businessDescription: null,
        phone: null,
        profileImage: null,
        coverImage: null,
        location: null,
        city: null,
        state: null,
        postalCode: null,
        country: null,
        latitude: null,
        longitude: null,
        serviceRadius: null,
        bio: null,
        specializations: null,
        certifications: null,
        insurance: null,
        backgroundCheck: null,
        identityVerified: null,
        averageRating: null,
        totalReviews: null,
        completedBookings: null,
        stripeAccountId: null,
        stripeChargesEnabled: null,
        stripePayoutsEnabled: null,
        stripeDetailsSubmitted: null,
        stripeAccountStatus: null,
        stripeOnboardingComplete: null,
        active: null,
        premium: null,
        language: null,
        timezone: null,
        notificationSettings: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiUserProfileToUserProfile(apiProfile);

      expect(result.role).toBe('CUSTOMER'); // Default role
      expect(result.averageRating).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.active).toBe(true);
      expect(result.language).toBe('en');
    });
  });

  describe('mapApiMessageToMessage', () => {
    it('should map message correctly', () => {
      const apiMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        content: 'Hello',
        isRead: false,
        attachments: ['file1.pdf'],
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z',
        owner: null,
      };

      const result = mapApiMessageToMessage(apiMessage);

      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('Hello');
      expect(result.read).toBe(false);
      expect(result.attachments).toEqual(['file1.pdf']);
    });

    it('should handle null attachments', () => {
      const apiMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        content: 'Test message',
        isRead: true,
        attachments: null,
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z',
        owner: null,
      };

      const result = mapApiMessageToMessage(apiMessage);

      expect(result.attachments).toBeUndefined();
      expect(result.read).toBe(true);
    });
  });

  describe('List mappers', () => {
    it('should map service list correctly', () => {
      const apiServices = [
        {
          id: 'service-1',
          providerId: 'provider-1',
          providerEmail: 'provider@example.com',
          title: 'Service 1',
          description: 'Description 1',
          category: 'SERVICE' as const,
          price: 100,
          minimumBookingTime: 60,
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          owner: null,
        },
        null, // Should filter out null items
      ];

      const result = mapApiServiceList(apiServices);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Service 1');
    });

    it('should map booking list correctly', () => {
      const apiBookings = [
        {
          id: 'booking-1',
          serviceId: 'service-1',
          customerId: 'customer-1',
          customerEmail: 'customer@example.com',
          providerId: 'provider-1',
          providerEmail: 'provider@example.com',
          startDateTime: '2024-01-15T10:00:00Z',
          endDateTime: '2024-01-15T11:00:00Z',
          status: 'PENDING' as const,
          amount: 100,
          duration: 60,
          customerNotes: null,
          paymentStatus: 'PENDING' as const,
          paymentIntentId: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          owner: null,
        },
      ];

      const result = mapApiBookingList(apiBookings);

      expect(result).toHaveLength(1);
      expect(result[0].scheduledDate).toBe('2024-01-15');
    });

    it('should map review list correctly', () => {
      const apiReviews = [
        {
          id: 'review-1',
          bookingId: 'booking-1',
          serviceId: 'service-1',
          reviewerType: 'CUSTOMER' as const,
          reviewerId: 'customer-1',
          reviewerEmail: 'customer@example.com',
          revieweeId: 'provider-1',
          revieweeEmail: 'provider@example.com',
          rating: 5,
          comment: 'Great service!',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
          owner: null,
        },
      ];

      const result = mapApiReviewList(apiReviews);

      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(5);
      expect(result[0].comment).toBe('Great service!');
    });
  });
});