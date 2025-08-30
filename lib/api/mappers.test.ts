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
        serviceDuration: null,
        tags: null,
        images: null,
        serviceLocation: null,
        serviceCity: null,
        serviceState: null,
        serviceZipCode: null,
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
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.subcategory).toBeUndefined();
      expect(result.serviceLocation).toBeUndefined();
      expect(result.serviceCity).toBeUndefined();
      expect(result.serviceState).toBeUndefined();
      expect(result.serviceZipCode).toBeUndefined();
      expect(result.latitude).toBeUndefined();
      expect(result.longitude).toBeUndefined();
      expect(result.video).toBeUndefined();
      expect(result.serviceRadius).toBeUndefined();
      expect(result.cancellationPolicy).toBeUndefined();
      expect(result.requirements).toBeUndefined();
      expect(result.minimumNotice).toBeUndefined();
      expect(result.maximumBookingAdvance).toBeUndefined();
    });

    it('should provide default values for numeric and boolean fields', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: null,
        price: null,
        serviceDuration: null,
        priceType: null,
        totalBookings: null,
        completedBookings: null,
        averageRating: null,
        totalReviews: null,
        featured: null,
        active: null,
        instantBooking: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.category).toBe('SERVICE');
      expect(result.price).toBe(0);
      expect(result.duration).toBe(60); // Default duration
      expect(result.priceType).toBe('FIXED');
      expect(result.totalBookings).toBe(0);
      expect(result.completedBookings).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.featured).toBe(false);
      expect(result.active).toBe(true);
      expect(result.instantBooking).toBe(false);
    });

    it('should map serviceDuration to duration field', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        serviceDuration: 90,
        price: 100,
        category: 'SERVICE' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.duration).toBe(90);
      expect((result as any).serviceDuration).toBeUndefined();
    });

    it('should generate providerName from providerEmail', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'john.doe@example.com',
        title: 'Test Service',
        description: 'Test Description',
        price: 100,
        category: 'SERVICE' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.providerName).toBe('john.doe');
      expect(result.providerEmail).toBe('john.doe@example.com');
    });

    it('should filter out null values from arrays', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        title: 'Test Service',
        description: 'Test Description',
        category: 'SERVICE' as const,
        price: 100,
        tags: ['tag1', null, 'tag2', null, 'tag3'],
        images: [null, 'image1.jpg', null, 'image2.jpg'],
        included: ['item1', null, 'item2'],
        excluded: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.images).toEqual(['image1.jpg', 'image2.jpg']);
      expect(result.included).toEqual(['item1', 'item2']);
      expect(result.excluded).toEqual([]);
    });
  });

  describe('mapApiBookingToBooking', () => {
    it('should transform startDateTime/endDateTime to scheduledDate/scheduledTime', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        startDateTime: '2024-08-30T14:00:00Z',
        endDateTime: '2024-08-30T15:30:00Z',
        amount: 100,
        status: 'CONFIRMED' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.scheduledDate).toBe('2024-08-30');
      expect(result.scheduledTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
      expect(result.duration).toBe(90); // 90 minutes between start and end
    });

    it('should handle optional fields with null values', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        startDateTime: '2024-08-30T14:00:00Z',
        endDateTime: '2024-08-30T15:00:00Z',
        amount: 100,
        status: null,
        customerPhone: null,
        customerNotes: null,
        providerNotes: null,
        cancellationReason: null,
        cancelledBy: null,
        cancelledAt: null,
        completedAt: null,
        paymentIntentId: null,
        paymentStatus: null,
        refundAmount: null,
        refundedAt: null,
        serviceLocation: null,
        reviewId: null,
        hasReview: null,
        reminderSent: null,
        platformFee: null,
        providerEarnings: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.status).toBe('PENDING');
      expect(result.customerPhone).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.providerNotes).toBeUndefined();
      expect(result.cancellationReason).toBeUndefined();
      expect(result.cancelledBy).toBeUndefined();
      expect(result.cancelledAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
      expect(result.paymentIntentId).toBeUndefined();
      expect(result.paymentStatus).toBeUndefined();
      expect(result.refundAmount).toBeUndefined();
      expect(result.refundedAt).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.reviewId).toBeUndefined();
      expect(result.reviewed).toBe(false);
      expect(result.reminderSent).toBe(false);
      expect(result.metadata).toEqual({});
    });

    it('should map customerNotes to notes field', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        startDateTime: '2024-08-30T14:00:00Z',
        endDateTime: '2024-08-30T15:00:00Z',
        amount: 100,
        status: 'CONFIRMED' as const,
        customerNotes: 'Please use the side entrance',
        providerNotes: 'Customer prefers eco-friendly products',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.notes).toBe('Please use the side entrance');
      expect(result.providerNotes).toBe('Customer prefers eco-friendly products');
    });
  });

  describe('mapApiReviewToReview', () => {
    it('should map reviewer/reviewee to customer/provider based on reviewerType', () => {
      const customerReview = {
        id: 'review-1',
        bookingId: 'booking-1',
        serviceId: 'service-1',
        reviewerType: 'CUSTOMER' as const,
        reviewerId: 'customer-1',
        reviewerEmail: 'customer@example.com',
        revieweeId: 'provider-1',
        revieweeEmail: 'provider@example.com',
        rating: 5,
        title: 'Great service',
        comment: 'Very professional',
        response: null,
        responseDate: null,
        images: null,
        verified: null,
        helpful: null,
        reported: null,
        hidden: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiReviewToReview(customerReview);

      expect(result.customerEmail).toBe('customer@example.com');
      expect(result.providerEmail).toBe('provider@example.com');
    });

    it('should handle provider reviews correctly', () => {
      const providerReview = {
        id: 'review-2',
        bookingId: 'booking-1',
        serviceId: 'service-1',
        reviewerType: 'PROVIDER' as const,
        reviewerId: 'provider-1',
        reviewerEmail: 'provider@example.com',
        revieweeId: 'customer-1',
        revieweeEmail: 'customer@example.com',
        rating: 4,
        title: null,
        comment: 'Pleasant customer',
        response: null,
        responseDate: null,
        images: null,
        verified: null,
        helpful: null,
        reported: null,
        hidden: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiReviewToReview(providerReview);

      expect(result.customerEmail).toBe('customer@example.com');
      expect(result.providerEmail).toBe('provider@example.com');
    });

    it('should map response to providerResponse', () => {
      const review = {
        id: 'review-1',
        bookingId: 'booking-1',
        serviceId: 'service-1',
        reviewerType: 'CUSTOMER' as const,
        reviewerId: 'customer-1',
        reviewerEmail: 'customer@example.com',
        revieweeId: 'provider-1',
        revieweeEmail: 'provider@example.com',
        rating: 5,
        comment: 'Great service',
        response: 'Thank you for your feedback!',
        responseDate: '2024-01-02T00:00:00Z',
        images: null,
        title: null,
        verified: null,
        helpful: null,
        reported: null,
        hidden: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiReviewToReview(review);

      expect(result.providerResponse).toBe('Thank you for your feedback!');
      expect(result.providerResponseDate).toBe('2024-01-02T00:00:00Z');
      expect((result as any).response).toBeUndefined();
    });

    it('should provide default values for boolean and numeric fields', () => {
      const review = {
        id: 'review-1',
        bookingId: 'booking-1',
        serviceId: 'service-1',
        reviewerType: 'CUSTOMER' as const,
        reviewerId: 'customer-1',
        reviewerEmail: 'customer@example.com',
        revieweeId: 'provider-1',
        revieweeEmail: 'provider@example.com',
        rating: null,
        comment: 'Great service',
        response: null,
        responseDate: null,
        images: null,
        title: null,
        verified: null,
        helpful: null,
        reported: null,
        hidden: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiReviewToReview(review);

      expect(result.rating).toBe(0);
      expect(result.verified).toBe(false);
      expect(result.helpful).toBe(0);
      expect(result.reported).toBe(false);
      expect(result.hidden).toBe(false);
    });
  });

  describe('mapApiUserProfileToUserProfile', () => {
    it('should handle all null optional fields', () => {
      const apiUser = {
        email: 'user@example.com',
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
        zipCode: null,
        latitude: null,
        longitude: null,
        servicesOffered: null,
        specializations: null,
        yearsOfExperience: null,
        certifications: null,
        insuranceVerified: null,
        backgroundCheckCompleted: null,
        identityVerified: null,
        averageRating: null,
        totalReviews: null,
        completedBookings: null,
        responseRate: null,
        responseTime: null,
        stripeAccountId: null,
        stripeAccountStatus: null,
        stripeOnboardingCompleted: null,
        notificationSettings: null,
        availability: null,
        socialLinks: null,
        languages: null,
        timezone: null,
        joinedAt: null,
        lastActive: null,
        isActive: null,
        isPremium: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiUserProfileToUserProfile(apiUser);

      expect(result.email).toBe('user@example.com');
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.role).toBe('CUSTOMER');
      expect(result.businessName).toBeUndefined();
      expect(result.insuranceVerified).toBe(false);
      expect(result.backgroundCheckCompleted).toBe(false);
      expect(result.identityVerified).toBe(false);
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.completedBookings).toBe(0);
      expect(result.stripeOnboardingCompleted).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.isPremium).toBe(false);
      expect(result.notificationSettings).toEqual({});
      expect(result.availability).toEqual({});
      expect(result.socialLinks).toEqual({});
      expect(result.languages).toEqual([]);
      expect(result.certifications).toEqual([]);
      expect(result.servicesOffered).toEqual([]);
      expect(result.specializations).toEqual([]);
    });

    it('should preserve non-null values', () => {
      const apiUser = {
        email: 'provider@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'PROVIDER' as const,
        businessName: 'John\'s Services',
        averageRating: 4.5,
        totalReviews: 25,
        completedBookings: 100,
        isActive: true,
        isPremium: true,
        languages: ['English', 'Spanish'],
        certifications: ['Certified Professional'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiUserProfileToUserProfile(apiUser);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.role).toBe('PROVIDER');
      expect(result.businessName).toBe('John\'s Services');
      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(25);
      expect(result.completedBookings).toBe(100);
      expect(result.isActive).toBe(true);
      expect(result.isPremium).toBe(true);
      expect(result.languages).toEqual(['English', 'Spanish']);
      expect(result.certifications).toEqual(['Certified Professional']);
    });
  });

  describe('Array mapping functions', () => {
    it('should filter out null/undefined items from service list', () => {
      const apiServices = [
        {
          id: 'service-1',
          providerId: 'provider-1',
          providerEmail: 'provider@example.com',
          title: 'Service 1',
          description: 'Description 1',
          price: 100,
          category: 'SERVICE' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          owner: null,
        },
        null,
        undefined,
        {
          id: 'service-2',
          providerId: 'provider-2',
          providerEmail: 'provider2@example.com',
          title: 'Service 2',
          description: 'Description 2',
          price: 200,
          category: 'EVENT' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          owner: null,
        },
      ] as any;

      const result = mapApiServiceList(apiServices);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('service-1');
      expect(result[1].id).toBe('service-2');
    });

    it('should map all items in booking list', () => {
      const apiBookings = [
        {
          id: 'booking-1',
          serviceId: 'service-1',
          providerId: 'provider-1',
          providerEmail: 'provider@example.com',
          customerId: 'customer-1',
          customerEmail: 'customer@example.com',
          startDateTime: '2024-08-30T14:00:00Z',
          endDateTime: '2024-08-30T15:00:00Z',
          amount: 100,
          status: 'CONFIRMED' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          owner: null,
        },
        {
          id: 'booking-2',
          serviceId: 'service-2',
          providerId: 'provider-2',
          providerEmail: 'provider2@example.com',
          customerId: 'customer-2',
          customerEmail: 'customer2@example.com',
          startDateTime: '2024-08-31T10:00:00Z',
          endDateTime: '2024-08-31T11:30:00Z',
          amount: 150,
          status: 'PENDING' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          owner: null,
        },
      ];

      const result = mapApiBookingList(apiBookings);

      expect(result).toHaveLength(2);
      expect(result[0].scheduledDate).toBe('2024-08-30');
      expect(result[0].duration).toBe(60);
      expect(result[1].scheduledDate).toBe('2024-08-31');
      expect(result[1].duration).toBe(90);
    });

    it('should handle empty arrays', () => {
      expect(mapApiServiceList([])).toEqual([]);
      expect(mapApiBookingList([])).toEqual([]);
      expect(mapApiReviewList([])).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed email for providerName extraction', () => {
      const apiService = {
        id: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'notanemail',
        title: 'Test Service',
        description: 'Test Description',
        price: 100,
        category: 'SERVICE' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiServiceToService(apiService);

      expect(result.providerName).toBe('notanemail');
    });

    it('should handle invalid date strings gracefully', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        startDateTime: 'invalid-date',
        endDateTime: 'also-invalid',
        amount: 100,
        status: 'CONFIRMED' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      // Should not throw, but produce some output
      expect(result.scheduledDate).toBeDefined();
      expect(result.scheduledTime).toBeDefined();
    });

    it('should handle deeply nested null values in metadata', () => {
      const apiBooking = {
        id: 'booking-1',
        serviceId: 'service-1',
        providerId: 'provider-1',
        providerEmail: 'provider@example.com',
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        startDateTime: '2024-08-30T14:00:00Z',
        endDateTime: '2024-08-30T15:00:00Z',
        amount: 100,
        status: 'CONFIRMED' as const,
        metadata: {
          key1: 'value1',
          key2: null,
          key3: {
            nested: null,
            deep: {
              value: null,
            },
          },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: null,
      };

      const result = mapApiBookingToBooking(apiBooking);

      expect(result.metadata).toEqual({
        key1: 'value1',
        key2: null,
        key3: {
          nested: null,
          deep: {
            value: null,
          },
        },
      });
    });
  });
});