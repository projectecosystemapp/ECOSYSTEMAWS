/**
 * API wrapper for Amplify Gen 2 GraphQL operations
 * 
 * This file provides a clean API interface for all database operations
 * using the new Amplify Gen 2 backend with proper type safety.
 * 
 * @author Claude Code
 * @created 2025-01-02
 */

import { generateClient } from 'aws-amplify/data';

import type { Schema } from '@/amplify/data/resource';
import { nullableToString, nullableToNumber, nullableToOptionalNumber } from '@/lib/type-utils';

// Generate the GraphQL client
// Factory to create an Amplify Data client when needed.
// Ensures server-side usage happens inside runWithAmplifyServerContext.
export const getClient = () => generateClient<Schema>();

// Use Schema types directly
type Client = ReturnType<typeof getClient>;
type Models = Client['models'];

// Extract the actual model types from Schema
type UserProfileModel = Models['UserProfile'];
type ServiceModel = Models['Service'];
type BookingModel = Models['Booking'];
type MessageModel = Models['Message'];

type UserProfileType = Awaited<ReturnType<UserProfileModel['get']>>['data'];
type ServiceType = Awaited<ReturnType<ServiceModel['get']>>['data'];
type BookingType = Awaited<ReturnType<BookingModel['get']>>['data'];
type MessageType = Awaited<ReturnType<MessageModel['get']>>['data'];

// User Profile operations
export const userProfileApi = {
  create: async (data: Parameters<UserProfileModel['create']>[0]): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.create(data);
    return response.data;
  },
  
  get: async (id: string): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.get({ id });
    return response.data;
  },
  
  list: async (options?: Parameters<UserProfileModel['list']>[0]): Promise<NonNullable<Awaited<ReturnType<UserProfileModel['list']>>['data']>> => {
    const response = await getClient().models.UserProfile.list(options);
    return response.data || [];
  },
  
  update: async (data: Parameters<UserProfileModel['update']>[0]): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.update(data);
    return response.data;
  },
  
  delete: async (id: string): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.delete({ id });
    return response.data;
  },
};

// Service operations
export const serviceApi = {
  create: async (data: Parameters<ServiceModel['create']>[0]): Promise<ServiceType> => {
    const response = await getClient().models.Service.create(data);
    return response.data;
  },
  
  get: async (id: string): Promise<ServiceType> => {
    const response = await getClient().models.Service.get({ id });
    return response.data;
  },
  
  list: async (options?: Parameters<ServiceModel['list']>[0]): Promise<NonNullable<Awaited<ReturnType<ServiceModel['list']>>['data']>> => {
    const response = await getClient().models.Service.list(options);
    return response.data || [];
  },

  listWithRatings: async (options?: Parameters<ServiceModel['list']>[0]): Promise<Array<NonNullable<ServiceType> & { rating: number; reviewCount: number }>> => {
    const services = await serviceApi.list(options);
    
    // Fetch ratings for each service
    const servicesWithRatings = await Promise.all(
      services.map(async (service) => {
        if (!service) return null;
        try {
          const rating = await reviewApi.getServiceRating(service.id);
          return {
            ...service,
            rating: nullableToString(rating.averageRating),
            reviewCount: rating.reviewCount
          };
        } catch (err) {
          console.error('Error fetching rating for service:', service.id, err);
          return {
            ...service,
            rating: 0,
            reviewCount: 0
          };
        }
      })
    );
    
    return servicesWithRatings.filter((s): s is NonNullable<ServiceType> & { rating: number; reviewCount: number } => s !== null);
  },
  
  listByCategory: async (category: string): Promise<NonNullable<Awaited<ReturnType<ServiceModel['list']>>['data']>> => {
    const response = await getClient().models.Service.list({
      filter: { category: { eq: category } }
    });
    return response.data || [];
  },
  
  listByProvider: async (providerId: string): Promise<NonNullable<Awaited<ReturnType<ServiceModel['list']>>['data']>> => {
    const response = await getClient().models.Service.list({
      filter: { providerId: { eq: providerId } }
    });
    return response.data || [];
  },
  
  update: async (data: Parameters<ServiceModel['update']>[0]): Promise<ServiceType> => {
    const response = await getClient().models.Service.update(data);
    return response.data;
  },
  
  delete: async (id: string): Promise<ServiceType> => {
    const response = await getClient().models.Service.delete({ id });
    return response.data;
  },
};

// Booking operations
export const bookingApi = {
  create: async (data: Parameters<BookingModel['create']>[0]): Promise<BookingType> => {
    const response = await getClient().models.Booking.create(data);
    return response.data;
  },
  
  get: async (id: string): Promise<BookingType> => {
    const response = await getClient().models.Booking.get({ id });
    return response.data;
  },
  
  listByCustomer: async (customerEmail: string): Promise<NonNullable<Awaited<ReturnType<BookingModel['list']>>['data']>> => {
    const response = await getClient().models.Booking.list({
      filter: { customerEmail: { eq: customerEmail } }
    });
    return response.data || [];
  },
  
  listByProvider: async (providerEmail: string): Promise<NonNullable<Awaited<ReturnType<BookingModel['list']>>['data']>> => {
    const response = await getClient().models.Booking.list({
      filter: { providerEmail: { eq: providerEmail } }
    });
    return response.data || [];
  },
  
  listByStatus: async (status: string): Promise<NonNullable<Awaited<ReturnType<BookingModel['list']>>['data']>> => {
    const response = await getClient().models.Booking.list({
      filter: { status: { eq: status } }
    });
    return response.data || [];
  },
  
  update: async (data: Parameters<BookingModel['update']>[0]): Promise<BookingType> => {
    const response = await getClient().models.Booking.update(data);
    return response.data;
  },
  
  updateStatus: async (id: string, status: string): Promise<BookingType> => {
    const response = await getClient().models.Booking.update({ id, status });
    return response.data;
  },
  
  delete: async (id: string): Promise<BookingType> => {
    const response = await getClient().models.Booking.delete({ id });
    return response.data;
  },

  // Enhanced booking operations
  getBookingsWithServices: async (customerEmail: string): Promise<Array<any>> => {
    const bookings = await bookingApi.listByCustomer(customerEmail);
    const bookingsWithServices = await Promise.all(
      bookings.map(async (booking) => {
        if (!booking) return null;
        try {
          const service = await serviceApi.get(booking.serviceId);
          return { ...booking, service };
        } catch (err) {
          console.error('Error fetching service for booking:', booking.id, err);
          return { ...booking, service: null };
        }
      })
    );
    return bookingsWithServices.filter((b) => b !== null);
  },

  getProviderBookingsWithServices: async (providerEmail: string): Promise<Array<any>> => {
    const bookings = await bookingApi.listByProvider(providerEmail);
    const bookingsWithServices = await Promise.all(
      bookings.map(async (booking) => {
        if (!booking) return null;
        try {
          const service = await serviceApi.get(booking.serviceId);
          return { ...booking, service };
        } catch (err) {
          console.error('Error fetching service for booking:', booking.id, err);
          return { ...booking, service: null };
        }
      })
    );
    return bookingsWithServices.filter((b) => b !== null);
  },

  getUpcomingBookings: async (providerEmail: string): Promise<NonNullable<Awaited<ReturnType<BookingModel['list']>>['data']>> => {
    const bookings = await bookingApi.listByProvider(providerEmail);
    const today = new Date();
    return bookings.filter((booking) => {
      if (!booking) return false;
      const bookingDate = new Date(booking.startDateTime);
      return bookingDate >= today && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
    });
  },

  getPastBookings: async (customerEmail: string): Promise<NonNullable<Awaited<ReturnType<BookingModel['list']>>['data']>> => {
    const bookings = await bookingApi.listByCustomer(customerEmail);
    const today = new Date();
    return bookings.filter((booking) => {
      if (!booking) return false;
      const bookingDate = new Date(booking.startDateTime);
      return bookingDate < today;
    });
  },
};

// Mock review operations for compatibility (Reviews not in current schema)
export const reviewApi = {
  create: async (data: any): Promise<any> => {
    console.warn('Review model not implemented in current schema');
    return null;
  },

  get: async (id: string): Promise<any> => {
    console.warn('Review model not implemented in current schema');
    return null;
  },

  list: async (options?: any): Promise<any[]> => {
    console.warn('Review model not implemented in current schema');
    return [];
  },

  listByService: async (serviceId: string): Promise<any[]> => {
    console.warn('Review model not implemented in current schema');
    return [];
  },

  listByCustomer: async (customerEmail: string): Promise<any[]> => {
    console.warn('Review model not implemented in current schema');
    return [];
  },

  listByProvider: async (providerEmail: string): Promise<any[]> => {
    console.warn('Review model not implemented in current schema');
    return [];
  },

  getByBooking: async (bookingId: string): Promise<any> => {
    console.warn('Review model not implemented in current schema');
    return null;
  },

  update: async (data: any): Promise<any> => {
    console.warn('Review model not implemented in current schema');
    return null;
  },

  addProviderResponse: async (id: string, providerResponse: string): Promise<any> => {
    console.warn('Review model not implemented in current schema');
    return null;
  },

  delete: async (id: string): Promise<any> => {
    console.warn('Review model not implemented in current schema');
    return null;
  },

  // Calculate average rating for a service
  getServiceRating: async (serviceId: string): Promise<{ averageRating: number; reviewCount: number }> => {
    console.warn('Review model not implemented in current schema - returning default rating');
    return { averageRating: 0, reviewCount: 0 };
  },

  // Get provider rating summary
  getProviderRating: async (providerEmail: string): Promise<{ averageRating: number; reviewCount: number }> => {
    console.warn('Review model not implemented in current schema - returning default rating');
    return { averageRating: 0, reviewCount: 0 };
  },

  // Validate review data
  validateReview: (data: {
    rating: number;
    comment?: string | null;
    providerResponse?: string | null;
  }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Rating validation
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    // Comment validation
    if (data.comment) {
      if (data.comment.length < 10) {
        errors.push('Comment must be at least 10 characters long');
      }
      if (data.comment.length > 500) {
        errors.push('Comment must be 500 characters or less');
      }
    }

    // Provider response validation
    if (data.providerResponse) {
      if (data.providerResponse.length > 300) {
        errors.push('Provider response must be 300 characters or less');
      }
    }

    return { isValid: errors.length === 0, errors };
  },

  // Check if booking can be reviewed
  canReviewBooking: async (bookingId: string): Promise<{ canReview: boolean; reason: string | null }> => {
    console.warn('Review model not implemented in current schema - returning false');
    return { canReview: false, reason: 'Review model not implemented' };
  }
};

// Message operations
export const messageApi = {
  create: async (data: Parameters<MessageModel['create']>[0]): Promise<MessageType> => {
    const response = await getClient().models.Message.create(data);
    return response.data;
  },

  get: async (id: string): Promise<MessageType> => {
    const response = await getClient().models.Message.get({ id });
    return response.data;
  },

  list: async (options?: Parameters<MessageModel['list']>[0]): Promise<NonNullable<Awaited<ReturnType<MessageModel['list']>>['data']>> => {
    const response = await getClient().models.Message.list(options);
    return response.data || [];
  },

  update: async (data: Parameters<MessageModel['update']>[0]): Promise<MessageType> => {
    const response = await getClient().models.Message.update(data);
    return response.data;
  },

  delete: async (id: string): Promise<MessageType> => {
    const response = await getClient().models.Message.delete({ id });
    return response.data;
  },

  // Get messages for a specific conversation
  getConversationMessages: async (conversationId: string): Promise<NonNullable<Awaited<ReturnType<MessageModel['list']>>['data']>> => {
    const response = await getClient().models.Message.list({
      filter: { conversationId: { eq: conversationId } }
    });
    const messages = response.data?.filter((msg): msg is NonNullable<MessageType> => msg !== null) || [];
    return messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  // Get conversations for a user (distinct conversation IDs)
  getUserConversations: async (userEmail: string): Promise<NonNullable<Awaited<ReturnType<MessageModel['list']>>['data']>> => {
    const sentMessages = await getClient().models.Message.list({
      filter: { senderEmail: { eq: userEmail } }
    });
    const receivedMessages = await getClient().models.Message.list({
      filter: { recipientEmail: { eq: userEmail } }
    });

    const allMessages = [...(sentMessages.data || []), ...(receivedMessages.data || [])]
      .filter((msg): msg is NonNullable<MessageType> => msg !== null);
    
    // Get unique conversation IDs and their latest message
    const conversationMap = new Map<string, NonNullable<MessageType>>();
    
    allMessages.forEach(message => {
      const existing = conversationMap.get(message.conversationId);
      if (!existing || new Date(message.createdAt) > new Date(existing.createdAt)) {
        conversationMap.set(message.conversationId, message);
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Get unread message count for a user
  getUnreadCount: async (userEmail: string): Promise<number> => {
    const response = await getClient().models.Message.list({
      filter: { 
        recipientEmail: { eq: userEmail },
        read: { eq: false }
      }
    });
    return response.data?.filter(msg => msg !== null).length || 0;
  },

  // Mark messages as read
  markAsRead: async (conversationId: string, recipientEmail: string): Promise<void> => {
    const unreadMessages = await getClient().models.Message.list({
      filter: {
        conversationId: { eq: conversationId },
        recipientEmail: { eq: recipientEmail },
        read: { eq: false }
      }
    });

    const validMessages = unreadMessages.data?.filter((msg): msg is NonNullable<MessageType> => msg !== null) || [];
    const updatePromises = validMessages.map(message =>
      getClient().models.Message.update({ id: message.id, read: true })
    );

    await Promise.all(updatePromises);
  },

  // Send a new message
  sendMessage: async (data: {
    senderEmail: string;
    recipientEmail: string;
    content: string;
    bookingId?: string;
    serviceId?: string;
  }): Promise<MessageType> => {
    const conversationId = generateConversationId(data.senderEmail, data.recipientEmail);
    
    const messageData = {
      conversationId,
      senderId: data.senderEmail, // Using email as ID for simplicity
      senderEmail: nullableToString(data.senderEmail),
      recipientId: data.recipientEmail, // Using email as ID for simplicity
      recipientEmail: nullableToString(data.recipientEmail),
      content: nullableToString(data.content),
      read: false,
      ...(data.bookingId && { bookingId: data.bookingId }),
      ...(data.serviceId && { serviceId: data.serviceId }),
    };

    return await messageApi.create(messageData);
  },

  // Check if users can message each other (have booking history)
  canMessage: async (userEmail1: string, userEmail2: string): Promise<boolean> => {
    try {
      // Check if there's any booking between these users
      const bookings1 = await getClient().models.Booking.list({
        filter: {
          customerEmail: { eq: userEmail1 },
          providerEmail: { eq: userEmail2 }
        }
      });

      const bookings2 = await getClient().models.Booking.list({
        filter: {
          customerEmail: { eq: userEmail2 },
          providerEmail: { eq: userEmail1 }
        }
      });

      const hasBookings1 = bookings1.data?.filter(b => b !== null).length || 0;
      const hasBookings2 = bookings2.data?.filter(b => b !== null).length || 0;
      
      return hasBookings1 > 0 || hasBookings2 > 0;
    } catch (error) {
      console.error('Error checking messaging permissions:', error);
      return false;
    }
  },

  // Subscribe to new messages in a conversation
  subscribeToConversation: (conversationId: string, callback: (message: NonNullable<MessageType>) => void) => {
    return getClient().models.Message.observeQuery({
      filter: { conversationId: { eq: conversationId } }
    }).subscribe({
      next: ({ items }) => {
        // Get the most recent message and call callback
        const validMessages = items.filter((msg): msg is NonNullable<MessageType> => msg !== null);
        const sortedMessages = validMessages.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        if (sortedMessages.length > 0) {
          callback(sortedMessages[0]);
        }
      },
      error: (error) => console.error('Message subscription error:', error)
    });
  },

  // Subscribe to unread count changes
  subscribeToUnreadCount: (userEmail: string, callback: (count: number) => void) => {
    return getClient().models.Message.observeQuery({
      filter: { 
        recipientEmail: { eq: userEmail },
        read: { eq: false }
      }
    }).subscribe({
      next: ({ items }) => {
        const validMessages = items.filter(msg => msg !== null);
        callback(validMessages.length);
      },
      error: (error) => console.error('Unread count subscription error:', error)
    });
  }
};

// Helper function to generate consistent conversation IDs
// Helper function for formatting message timestamps
export const formatMessageTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const generateConversationId = (email1: string, email2: string): string => {
  const emails = [email1, email2].sort();
  return `${emails[0]}_${emails[1]}`;
};

// Helper function to get other participant's email from conversation ID
export const getOtherParticipant = (conversationId: string, currentUserEmail: string): string => {
  const [email1, email2] = conversationId.split('_');
  return email1 === currentUserEmail ? email2 : email1;
};

// Provider operations
export const providerApi = {
  create: async (data: Parameters<UserProfileModel['create']>[0]): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.create({
      ...data,
      userType: 'PROVIDER'
    });
    return response.data;
  },
  
  get: async (email: string): Promise<UserProfileType> => {
    // Get user by email - need to list and filter since get() expects ID
    const response = await getClient().models.UserProfile.list({ 
      filter: { email: { eq: email } }
    });
    return response.data?.[0] || null;
  },
  
  list: async (options?: Parameters<UserProfileModel['list']>[0]): Promise<NonNullable<Awaited<ReturnType<UserProfileModel['list']>>['data']>> => {
    const response = await getClient().models.UserProfile.list({ 
      ...options,
      filter: { ...options?.filter, userType: { eq: 'PROVIDER' } }
    });
    return response.data || [];
  },
  
  update: async (data: Parameters<UserProfileModel['update']>[0]): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.update(data);
    return response.data;
  },
  
  delete: async (email: string): Promise<UserProfileType> => {
    // First get the user by email to get the ID
    const userResponse = await getClient().models.UserProfile.list({ 
      filter: { email: { eq: email } }
    });
    const user = userResponse.data?.[0];
    if (!user) return null;
    
    // Now delete by ID
    const response = await getClient().models.UserProfile.delete({ id: user.id });
    return response.data;
  },

  // Get provider by email
  getByEmail: async (email: string): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.list({
      filter: { email: { eq: email } }
    });
    return response.data?.[0] || null;
  },

  // Update verification status  
  updateVerificationStatus: async (id: string, status: string): Promise<UserProfileType> => {
    const response = await getClient().models.UserProfile.update({ id, userType: status });
    return response.data;
  },

  // Get providers by verification status
  listByVerificationStatus: async (status: string): Promise<NonNullable<Awaited<ReturnType<UserProfileModel['list']>>['data']>> => {
    const response = await getClient().models.UserProfile.list({
      filter: { userType: { eq: status } }
    });
    return response.data || [];
  }
};

// Admin-specific operations
export const adminApi = {
  // Dashboard metrics
  getDashboardMetrics: async (): Promise<{
    totalUsers: number;
    totalServices: number;
    totalBookings: number;
    totalProviders: number;
    totalRevenue: number;
    platformCommission: number;
    activeServices: number;
    pendingBookings: number;
    completedBookings: number;
    verifiedProviders: number;
    pendingProviders: number;
  }> => {
    try {
      const [users, services, bookingsResponse, providers] = await Promise.all([
        userProfileApi.list(),
        serviceApi.list(),
        getClient().models.Booking.list(),
        providerApi.list()
      ]);

      const bookings = bookingsResponse?.data?.filter((b): b is NonNullable<BookingType> => b !== null) || [];
      const totalRevenue = bookings.reduce((sum, booking) => 
        sum + (booking.amount || 0), 0);
      const platformCommission = totalRevenue * 0.08;

      return {
        totalUsers: nullableToString(users.length),
        totalServices: nullableToString(services.length),
        totalBookings: nullableToString(bookings.length),
        totalProviders: nullableToString(providers.length),
        totalRevenue,
        platformCommission,
        activeServices: services.filter(s => s?.active === true).length,
        pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
        completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
        verifiedProviders: providers.filter(p => p?.userType === 'PROVIDER').length,
        pendingProviders: providers.filter(p => p?.userType === 'PROVIDER').length
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  // User management
  getUsersWithStats: async (): Promise<Array<NonNullable<UserProfileType> & {
    bookingsCount: number;
    servicesCount: number;
    reviewsCount: number;
    totalSpent: number;
    totalEarned: number;
    lastActivity: string;
  }>> => {
    try {
      const [users, bookingsResponse, services] = await Promise.all([
        userProfileApi.list(),
        getClient().models.Booking.list(),
        serviceApi.list()
      ]);

      const bookings = bookingsResponse?.data?.filter((b): b is NonNullable<BookingType> => b !== null) || [];

      return users.filter(user => user !== null).map(user => {
        const userBookings = bookings.filter(b => 
          b.customerEmail === user.email || b.providerEmail === user.email);
        const userServices = services.filter(s => s?.providerId === user.id);

        return {
          ...user,
          bookingsCount: nullableToString(userBookings.length),
          servicesCount: nullableToString(userServices.length),
          reviewsCount: 0, // Review system not implemented
          totalSpent: userBookings
            .filter(b => b.customerEmail === user.email)
            .reduce((sum, b) => sum + (b.amount || 0), 0),
          totalEarned: userBookings
            .filter(b => b.providerEmail === user.email)
            .reduce((sum, b) => sum + ((b.amount || 0) * 0.92), 0), // After commission
          lastActivity: user.updatedAt
        };
      });
    } catch (error) {
      console.error('Error fetching users with stats:', error);
      throw error;
    }
  },

  // Service management
  getServicesWithStats: async (): Promise<Array<NonNullable<ServiceType> & {
    bookingsCount: number;
    reviewsCount: number;
    averageRating: number;
    totalRevenue: number;
    pendingBookings: number;
    completedBookings: number;
  }>> => {
    try {
      const [services, bookingsResponse] = await Promise.all([
        serviceApi.list(),
        getClient().models.Booking.list()
      ]);

      const bookings = bookingsResponse?.data?.filter((b): b is NonNullable<BookingType> => b !== null) || [];

      return services.filter(service => service !== null).map(service => {
        const serviceBookings = bookings.filter(b => b.serviceId === service.id);

        return {
          ...service,
          bookingsCount: nullableToString(serviceBookings.length),
          reviewsCount: 0, // Review system not implemented
          averageRating: 0, // Review system not implemented
          totalRevenue: serviceBookings.reduce((sum, b) => sum + (b.amount || 0), 0),
          pendingBookings: serviceBookings.filter(b => b.status === 'PENDING').length,
          completedBookings: serviceBookings.filter(b => b.status === 'COMPLETED').length
        };
      });
    } catch (error) {
      console.error('Error fetching services with stats:', error);
      throw error;
    }
  },

  // Booking management
  getAllBookingsWithDetails: async (): Promise<Array<NonNullable<BookingType> & {
    service?: ServiceType;
    customer?: UserProfileType;
    provider?: UserProfileType;
    platformCommission: number;
    providerAmount: number;
  }>> => {
    try {
      const [bookingsResponse, services, users] = await Promise.all([
        getClient().models.Booking.list(),
        serviceApi.list(),
        userProfileApi.list()
      ]);

      const bookings = bookingsResponse?.data?.filter((b): b is NonNullable<BookingType> => b !== null) || [];

      return bookings.map(booking => {
        const service = services.find(s => s?.id === booking.serviceId) || null;
        const customer = users.find(u => u?.email === booking.customerEmail) || null;
        const provider = users.find(u => u?.email === booking.providerEmail) || null;

        return {
          ...booking,
          service,
          customer,
          provider,
          platformCommission: (booking.amount || 0) * 0.08,
          providerAmount: (booking.amount || 0) * 0.92
        };
      });
    } catch (error) {
      console.error('Error fetching bookings with details:', error);
      throw error;
    }
  },

  // Provider management
  getProvidersWithStats: async (): Promise<Array<NonNullable<UserProfileType> & {
    servicesCount: number;
    bookingsCount: number;
    reviewsCount: number;
    averageRating: number;
    totalRevenue: number;
    platformCommission: number;
    providerEarnings: number;
    completedBookings: number;
    activeServices: number;
  }>> => {
    try {
      const [providers, services, bookingsResponse] = await Promise.all([
        providerApi.list(),
        serviceApi.list(),
        getClient().models.Booking.list()
      ]);

      const bookings = bookingsResponse?.data?.filter((b): b is NonNullable<BookingType> => b !== null) || [];

      return providers.filter(provider => provider !== null).map(provider => {
        const providerServices = services.filter(s => s?.providerId === provider.id);
        const providerBookings = bookings.filter(b => b.providerEmail === provider.email);
        
        const totalRevenue = providerBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

        return {
          ...provider,
          servicesCount: nullableToString(providerServices.length),
          bookingsCount: nullableToString(providerBookings.length),
          reviewsCount: 0, // Review system not implemented
          averageRating: 0, // Review system not implemented
          totalRevenue,
          platformCommission: totalRevenue * 0.08,
          providerEarnings: totalRevenue * 0.92,
          completedBookings: providerBookings.filter(b => b.status === 'COMPLETED').length,
          activeServices: providerServices.filter(s => s?.active === true).length
        };
      });
    } catch (error) {
      console.error('Error fetching providers with stats:', error);
      throw error;
    }
  },

  // Analytics
  getAnalyticsData: async (): Promise<{
    revenue: {
      total: number;
      commission: number;
      providerEarnings: number;
    };
    categories: Record<string, {
      servicesCount: number;
      bookingsCount: number;
      revenue: number;
    }>;
    conversion: {
      rate: number;
      totalViews: number;
      totalBookings: number;
    };
    topProviders: Array<NonNullable<UserProfileType> & {
      servicesCount: number;
      bookingsCount: number;
      reviewsCount: number;
      averageRating: number;
      totalRevenue: number;
      platformCommission: number;
      providerEarnings: number;
      completedBookings: number;
      activeServices: number;
    }>;
    userGrowth: {
      total: number;
      customers: number;
      providers: number;
      admins: number;
    };
  }> => {
    try {
      const [bookingsResponse, services, users] = await Promise.all([
        getClient().models.Booking.list(),
        serviceApi.list(),
        userProfileApi.list()
      ]);

      const bookings = bookingsResponse?.data?.filter((b): b is NonNullable<BookingType> => b !== null) || [];

      // Revenue analytics
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const platformCommission = totalRevenue * 0.08;

      // Category performance
      const categoryStats = services.filter(s => s !== null).reduce((acc, service) => {
        const category = service.category || 'Other';
        if (!acc[category]) {
          acc[category] = { 
            servicesCount: 0, 
            bookingsCount: 0, 
            revenue: 0 
          };
        }
        acc[category].servicesCount++;
        
        const serviceBookings = bookings.filter(b => b.serviceId === service.id);
        acc[category].bookingsCount += serviceBookings.length;
        acc[category].revenue += serviceBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        
        return acc;
      }, {} as Record<string, { servicesCount: number; bookingsCount: number; revenue: number }>);

      // Conversion rates
      const totalServiceViews = services.length; // Mock data
      const totalBookings = bookings.length;
      const conversionRate = totalServiceViews > 0 ? (totalBookings / totalServiceViews) * 100 : 0;

      // Provider rankings
      const providerStats = await adminApi.getProvidersWithStats();
      const topProviders = providerStats
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      return {
        revenue: {
          total: totalRevenue,
          commission: platformCommission,
          providerEarnings: totalRevenue * 0.92
        },
        categories: categoryStats,
        conversion: {
          rate: Math.round(conversionRate * 100) / 100,
          totalViews: totalServiceViews,
          totalBookings
        },
        topProviders,
        userGrowth: {
          total: nullableToString(users.length),
          customers: users.filter(u => u?.userType === 'CUSTOMER').length,
          providers: users.filter(u => u?.userType === 'PROVIDER').length,
          admins: users.filter(u => u?.userType === 'ADMIN').length
        }
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }
};