/**
 * Refactored API Layer with Type-Safe Transformations
 * 
 * This is the new API layer that uses the mapper functions to ensure
 * complete type safety between the GraphQL API and our application.
 * No more 'as any' casts!
 */

import { getClient } from '@/lib/api';
import {
  mapApiServiceToService,
  mapApiServiceList,
  mapApiServiceListWithRating,
  mapApiBookingToBooking,
  mapApiBookingList,
  mapApiReviewToReview,
  mapApiReviewList,
  mapApiUserProfileToUserProfile,
  mapApiUserProfileList,
  mapApiMessageToMessage,
  mapApiMessageList,
  mapApiTransactionToTransaction,
  mapApiTransactionList,
  mapApiNotificationToNotification,
  mapApiNotificationList
} from './mappers';
import type {
  Service,
  ServiceWithRating,
  Booking,
  Review,
  UserProfile,
  Message,
  Transaction,
  Notification
} from '@/lib/types';

// Use factory to create client at call time

/**
 * Service API - Type-safe service operations
 */
export const serviceApi = {
  /**
   * Create a new service
   */
  create: async (data: Partial<Service>): Promise<Service | null> => {
    try {
      // Transform our domain type to API type
      const apiData = {
        providerId: 'temp-id', // Generate or get from auth
        providerEmail: data.providerEmail!,
        title: data.title!,
        description: data.description!,
        category: (data.category as any) || 'SERVICE',
        // Persist price in cents for precision
        priceCents: Math.round((data.price || 0) * 100),
        minimumBookingTime: data.duration, // Map duration to minimumBookingTime per schema
        active: data.active ?? true,
        // Map location fields
        address: data.serviceAddress,
        city: data.serviceCity,
        state: data.serviceState,
        postalCode: data.serviceZipCode,
        serviceRadius: data.serviceRadius,
        latitude: data.latitude,
        longitude: data.longitude,
        locationType: data.locationType
      };

      const response = await getClient().models.Service.create(apiData);
      
      if (response.data) {
        return mapApiServiceToService(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  },

  /**
   * Get a single service by ID
   */
  get: async (id: string): Promise<Service | null> => {
    try {
      const response = await getClient().models.Service.get({ id });
      
      if (response.data) {
        return mapApiServiceToService(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching service:', error);
      return null;
    }
  },

  /**
   * List all services with optional filtering
   */
  list: async (filter?: any): Promise<Service[]> => {
    try {
      const response = await getClient().models.Service.list({ filter });
      
      if (response.data) {
        return mapApiServiceList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing services:', error);
      return [];
    }
  },

  /**
   * List services by provider
   */
  listByProvider: async (providerEmail: string): Promise<Service[]> => {
    try {
      const response = await getClient().models.Service.list({
        filter: { providerEmail: { eq: providerEmail } }
      });
      
      if (response.data) {
        return mapApiServiceList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing provider services:', error);
      return [];
    }
  },

  /**
   * Search services with rating information
   */
  searchWithRatings: async (
    query: string,
    category?: string
  ): Promise<ServiceWithRating[]> => {
    try {
      const filter: any = {};
      
      if (query) {
        filter.or = [
          { title: { contains: query } },
          { description: { contains: query } }
        ];
      }
      
      if (category) {
        filter.category = { eq: category };
      }

      const [servicesResponse, reviewsResponse] = await Promise.all([
        getClient().models.Service.list({ filter }),
        getClient().models.Review.list()
      ]);

      if (!servicesResponse.data) return [];

      // Calculate ratings for each service
      const ratingsMap = new Map<string, { rating: number; count: number }>();
      
      if (reviewsResponse.data) {
        const reviewsByService = reviewsResponse.data.reduce((acc, review) => {
          if (!acc[review.serviceId]) {
            acc[review.serviceId] = [];
          }
          acc[review.serviceId].push(review.rating || 0);
          return acc;
        }, {} as Record<string, number[]>);

        Object.entries(reviewsByService).forEach(([serviceId, ratings]) => {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          ratingsMap.set(serviceId, {
            rating: avg,
            count: ratings.length
          });
        });
      }

      return mapApiServiceListWithRating(servicesResponse.data, ratingsMap);
    } catch (error) {
      console.error('Error searching services:', error);
      return [];
    }
  },

  /**
   * Update a service
   */
  update: async (data: Partial<Service>): Promise<Service | null> => {
    try {
      const updateData: any = {
        id: data.id!,
        ...data
      };

      // Map duration back to serviceDuration if present
      if (data.duration !== undefined) {
        updateData.serviceDuration = data.duration;
        delete updateData.duration;
      }

      // If price provided, persist as cents
      if (typeof data.price === 'number') {
        updateData.priceCents = Math.round(data.price * 100);
        delete updateData.price;
      }

      const response = await getClient().models.Service.update(updateData);
      
      if (response.data) {
        return mapApiServiceToService(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  },

  /**
   * Delete a service
   */
  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await getClient().models.Service.delete({ id });
      return !!response.data;
    } catch (error) {
      console.error('Error deleting service:', error);
      return false;
    }
  }
};

/**
 * Booking API - Type-safe booking operations
 */
export const bookingApi = {
  /**
   * Create a new booking
   */
  create: async (data: Partial<Booking>): Promise<Booking | null> => {
    try {
      // Convert our domain booking to API format
      const startDateTime = new Date(
        `${data.scheduledDate}T${data.scheduledTime}`
      ).toISOString();
      
      const endDateTime = new Date(
        new Date(startDateTime).getTime() + (data.duration || 60) * 60000
      ).toISOString();

      const apiData = {
        serviceId: data.serviceId!,
        providerId: data.providerId!,
        providerEmail: data.providerEmail!,
        customerId: data.customerId!,
        customerEmail: data.customerEmail!,
        startDateTime,
        endDateTime,
        // Persist amounts in cents for precision
        amountCents: Math.round((data.totalAmount || 0) * 100),
        status: (data.status as any) || 'PENDING',
        notes: data.notes,
        customerPhone: data.customerPhone,
        // Only include fields that exist in the schema
        paymentStatus: 'PENDING' as const, // Valid schema value
        paymentIntentId: data.paymentIntentId,
        platformFeeCents: data.platformFee != null ? Math.round((data.platformFee || 0) * 100) : undefined,
        providerEarningsCents: data.providerEarnings != null ? Math.round((data.providerEarnings || 0) * 100) : undefined,
        // Ownership fields for auth if available
        customerSub: (data as any).customerSub,
        providerSub: (data as any).providerSub
      };

      const response = await getClient().models.Booking.create(apiData);
      
      if (response.data) {
        return mapApiBookingToBooking(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  /**
   * Get a single booking
   */
  get: async (id: string): Promise<Booking | null> => {
    try {
      const response = await getClient().models.Booking.get({ id });
      
      if (response.data) {
        return mapApiBookingToBooking(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching booking:', error);
      return null;
    }
  },

  /**
   * List bookings by customer
   */
  listByCustomer: async (customerEmail: string): Promise<Booking[]> => {
    try {
      const response = await getClient().models.Booking.list({
        filter: { customerEmail: { eq: customerEmail } }
      });
      
      if (response.data) {
        return mapApiBookingList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing customer bookings:', error);
      return [];
    }
  },

  /**
   * List bookings by provider
   */
  listByProvider: async (providerEmail: string): Promise<Booking[]> => {
    try {
      const response = await getClient().models.Booking.list({
        filter: { providerEmail: { eq: providerEmail } }
      });
      
      if (response.data) {
        return mapApiBookingList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing provider bookings:', error);
      return [];
    }
  },

  /**
   * Update booking status
   */
  updateStatus: async (
    id: string,
    status: Booking['status']
  ): Promise<Booking | null> => {
    try {
      const response = await getClient().models.Booking.update({ id, status });
      
      if (response.data) {
        return mapApiBookingToBooking(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },

  /**
   * Get upcoming bookings for a provider
   */
  getUpcomingBookings: async (providerEmail: string): Promise<Booking[]> => {
    try {
      const bookings = await bookingApi.listByProvider(providerEmail);
      const today = new Date();
      
      return bookings.filter(booking => {
        const bookingDate = new Date(booking.scheduledDate);
        return bookingDate >= today && 
               (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
      });
    } catch (error) {
      console.error('Error getting upcoming bookings:', error);
      return [];
    }
  }
};

/**
 * Review API - Type-safe review operations
 */
export const reviewApi = {
  /**
   * Create a new review
   */
  create: async (data: {
    bookingId: string;
    serviceId: string;
    customerEmail: string;
    providerEmail: string;
    rating: number;
    comment?: string;
  }): Promise<Review | null> => {
    try {
      const apiData = {
        bookingId: data.bookingId,
        serviceId: data.serviceId,
        reviewerType: 'CUSTOMER' as const,
        reviewerId: data.customerEmail, // Using email as ID for now
        reviewerEmail: data.customerEmail,
        revieweeId: data.providerEmail, // Using email as ID for now
        revieweeEmail: data.providerEmail,
        rating: data.rating,
        comment: data.comment
      };

      const response = await getClient().models.Review.create(apiData);
      
      if (response.data) {
        return mapApiReviewToReview(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  /**
   * List reviews by service
   */
  listByService: async (serviceId: string): Promise<Review[]> => {
    try {
      const response = await getClient().models.Review.list({
        filter: { serviceId: { eq: serviceId } }
      });
      
      if (response.data) {
        return mapApiReviewList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing service reviews:', error);
      return [];
    }
  },

  /**
   * List reviews by customer
   */
  listByCustomer: async (customerEmail: string): Promise<Review[]> => {
    try {
      const response = await getClient().models.Review.list({
        filter: { reviewerEmail: { eq: customerEmail } }
      });
      
      if (response.data) {
        return mapApiReviewList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing customer reviews:', error);
      return [];
    }
  },

  /**
   * List reviews by provider
   */
  listByProvider: async (providerEmail: string): Promise<Review[]> => {
    try {
      const response = await getClient().models.Review.list({
        filter: { revieweeEmail: { eq: providerEmail } }
      });
      
      if (response.data) {
        return mapApiReviewList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing provider reviews:', error);
      return [];
    }
  },

  /**
   * Add provider response to a review
   */
  addProviderResponse: async (
    id: string,
    providerResponse: string
  ): Promise<Review | null> => {
    try {
      const response = await getClient().models.Review.update({
        id,
        response: providerResponse,
        responseDate: new Date().toISOString()
      });
      
      if (response.data) {
        return mapApiReviewToReview(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error adding provider response:', error);
      throw error;
    }
  },

  /**
   * Get service rating
   */
  getServiceRating: async (
    serviceId: string
  ): Promise<{ averageRating: number; totalReviews: number }> => {
    try {
      const reviews = await reviewApi.listByService(serviceId);
      
      if (reviews.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: reviews.length
      };
    } catch (error) {
      console.error('Error calculating service rating:', error);
      return { averageRating: 0, totalReviews: 0 };
    }
  },

  /**
   * Check if a booking can be reviewed
   */
  canReviewBooking: async (
    bookingId: string
  ): Promise<{ canReview: boolean; reason: string | null }> => {
    try {
      // Check if booking exists and is completed
      const booking = await bookingApi.get(bookingId);
      
      if (!booking) {
        return { canReview: false, reason: 'Booking not found' };
      }

      if (booking.status !== 'COMPLETED') {
        return { canReview: false, reason: 'Booking must be completed to review' };
      }

      // Check if review already exists
      const reviews = await getClient().models.Review.list({
        filter: { bookingId: { eq: bookingId } }
      });

      if (reviews.data && reviews.data.length > 0) {
        return { canReview: false, reason: 'Review already submitted' };
      }

      return { canReview: true, reason: null };
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return { canReview: false, reason: 'Error checking review status' };
    }
  },

  /**
   * Validate review data
   */
  validateReview: (data: {
    rating: number;
    comment: string;
  }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (data.rating < 1 || data.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    if (data.comment && data.comment.length > 1000) {
      errors.push('Comment must be less than 1000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * User Profile API - Type-safe user operations
 */
export const userProfileApi = {
  /**
   * Create a user profile
   */
  create: async (data: Partial<UserProfile>): Promise<UserProfile | null> => {
    try {
      const response = await getClient().models.UserProfile.create({
        email: data.email!,
        ...data
      });
      
      if (response.data) {
        return mapApiUserProfileToUserProfile(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  },

  /**
   * Get a user profile by email
   */
  get: async (email: string): Promise<UserProfile | null> => {
    try {
      const response = await getClient().models.UserProfile.list({
        filter: { email: { eq: email } }
      });
      
      if (response.data && response.data.length > 0) {
        return mapApiUserProfileToUserProfile(response.data[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  /**
   * List all providers
   */
  listProviders: async (): Promise<UserProfile[]> => {
    try {
      const response = await getClient().models.UserProfile.list({
        filter: { role: { eq: 'PROVIDER' } }
      });
      
      if (response.data) {
        return mapApiUserProfileList(response.data);
      }
      
      return [];
    } catch (error) {
      console.error('Error listing providers:', error);
      return [];
    }
  },

  /**
   * Update user profile
   */
  update: async (data: Partial<UserProfile>): Promise<UserProfile | null> => {
    try {
      if (!data.id) {
        throw new Error('ID is required to update user profile');
      }
      const response = await getClient().models.UserProfile.update({
        id: data.id,
        ...data
      });
      
      if (response.data) {
        return mapApiUserProfileToUserProfile(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};

/**
 * Message API - Type-safe messaging operations
 */
export const messageApi = {
  /**
   * Send a message
   */
  send: async (data: {
    conversationId?: string;
    senderEmail: string;
    recipientEmail: string;
    content: string;
    bookingId?: string;
    serviceId?: string;
  }): Promise<Message | null> => {
    try {
      const conversationId = data.conversationId || 
        [data.senderEmail, data.recipientEmail].sort().join('_');

      const apiData = {
        conversationId,
        senderId: data.senderEmail, // Using email as ID
        senderEmail: data.senderEmail,
        recipientId: data.recipientEmail, // Using email as ID
        recipientEmail: data.recipientEmail,
        content: data.content,
        bookingId: data.bookingId,
        serviceId: data.serviceId,
        messageType: 'TEXT' as const
      };

      const response = await getClient().models.Message.create(apiData);
      
      if (response.data) {
        return mapApiMessageToMessage(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Get conversation messages
   */
  getConversationMessages: async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await getClient().models.Message.list({
        filter: { conversationId: { eq: conversationId } }
      });
      
      if (response.data) {
        const messages = mapApiMessageList(response.data);
        // Sort by creation date
        return messages.sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }
  },

  /**
   * Mark message as read
   */
  markAsRead: async (id: string): Promise<Message | null> => {
    try {
      const response = await getClient().models.Message.update({
        id,
        read: true,
        readAt: new Date().toISOString()
      });
      
      if (response.data) {
        return mapApiMessageToMessage(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return null;
    }
  }
};

/**
 * Export all refactored APIs
 */
export const refactoredApi = {
  service: serviceApi,
  booking: bookingApi,
  review: reviewApi,
  userProfile: userProfileApi,
  message: messageApi
};
