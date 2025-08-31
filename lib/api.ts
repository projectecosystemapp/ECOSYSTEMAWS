import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

// Generate the GraphQL client
export const client = generateClient<Schema>();

// Helper functions for common operations

// User Profile operations
export const userProfileApi = {
  create: async (data: any) => {
    const response = await client.models.UserProfile.create(data);
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await client.models.UserProfile.get({ id });
    return response.data;
  },
  
  list: async () => {
    const response = await client.models.UserProfile.list();
    return response.data;
  },
  
  update: async (data: any) => {
    const response = await client.models.UserProfile.update(data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await client.models.UserProfile.delete({ id });
    return response.data;
  },
};

// Service operations
export const serviceApi = {
  create: async (data: any) => {
    const response = await client.models.Service.create(data);
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await client.models.Service.get({ id });
    return response.data;
  },
  
  list: async (filter?: any) => {
    const response = await client.models.Service.list({ filter });
    return response.data;
  },

  listWithRatings: async (filter?: any) => {
    const services = await serviceApi.list(filter);
    
    // Fetch ratings for each service
    const servicesWithRatings = await Promise.all(
      (services || []).map(async (service) => {
        try {
          const rating = await reviewApi.getServiceRating(service.id);
          return {
            ...service,
            rating: rating.averageRating,
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
    
    return servicesWithRatings;
  },
  
  listByCategory: async (category: string) => {
    const response = await client.models.Service.list({
      filter: { category: { eq: category } }
    });
    return response.data;
  },
  
  listByProvider: async (providerEmail: string) => {
    const response = await client.models.Service.list({
      filter: { providerEmail: { eq: providerEmail } }
    });
    return response.data;
  },
  
  update: async (data: any) => {
    const response = await client.models.Service.update(data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await client.models.Service.delete({ id });
    return response.data;
  },
};

// Booking operations
export const bookingApi = {
  create: async (data: any) => {
    const response = await client.models.Booking.create(data);
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await client.models.Booking.get({ id });
    return response.data;
  },
  
  listByCustomer: async (customerEmail: string) => {
    const response = await client.models.Booking.list({
      filter: { customerEmail: { eq: customerEmail } }
    });
    return response.data;
  },
  
  listByProvider: async (providerEmail: string) => {
    const response = await client.models.Booking.list({
      filter: { providerEmail: { eq: providerEmail } }
    });
    return response.data;
  },
  
  listByStatus: async (status: string) => {
    const response = await client.models.Booking.list({
      filter: { status: { eq: status } }
    });
    return response.data;
  },
  
  update: async (data: any) => {
    const response = await client.models.Booking.update(data);
    return response.data;
  },
  
  updateStatus: async (id: string, status: string) => {
    const response = await client.models.Booking.update({ id, status: status as any });
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await client.models.Booking.delete({ id });
    return response.data;
  },

  // Enhanced booking operations
  getBookingsWithServices: async (customerEmail: string) => {
    const bookings = await bookingApi.listByCustomer(customerEmail);
    const bookingsWithServices = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const service = await serviceApi.get(booking.serviceId);
          return { ...booking, service };
        } catch (err) {
          console.error('Error fetching service for booking:', booking.id, err);
          return booking;
        }
      })
    );
    return bookingsWithServices;
  },

  getProviderBookingsWithServices: async (providerEmail: string) => {
    const bookings = await bookingApi.listByProvider(providerEmail);
    const bookingsWithServices = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const service = await serviceApi.get(booking.serviceId);
          return { ...booking, service };
        } catch (err) {
          console.error('Error fetching service for booking:', booking.id, err);
          return booking;
        }
      })
    );
    return bookingsWithServices;
  },

  getUpcomingBookings: async (providerEmail: string) => {
    const bookings = await bookingApi.listByProvider(providerEmail);
    const today = new Date();
    return bookings.filter((booking: any) => {
      const bookingDate = new Date(`${booking.scheduledDate || booking.startDateTime}T${booking.scheduledTime || '00:00'}`);
      return bookingDate >= today && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
    });
  },

  getPastBookings: async (customerEmail: string) => {
    const bookings = await bookingApi.listByCustomer(customerEmail);
    const today = new Date();
    return bookings.filter((booking: any) => {
      const bookingDate = new Date(`${booking.scheduledDate || booking.startDateTime}T${booking.scheduledTime || '00:00'}`);
      return bookingDate < today;
    });
  },
};

// Review operations
export const reviewApi = {
  create: async (data: any) => {
    const response = await client.models.Review.create({
      ...data,
      createdAt: new Date().toISOString()
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await client.models.Review.get({ id });
    return response.data;
  },

  list: async (filter?: any) => {
    const response = await client.models.Review.list({ filter });
    return response.data;
  },

  listByService: async (serviceId: string) => {
    const response = await client.models.Review.list({
      filter: { serviceId: { eq: serviceId } }
    });
    return response.data;
  },

  listByCustomer: async (customerEmail: string) => {
    const response = await client.models.Review.list({
      filter: { reviewerEmail: { eq: customerEmail } }
    });
    return response.data;
  },

  listByProvider: async (providerEmail: string) => {
    const response = await client.models.Review.list({
      filter: { revieweeEmail: { eq: providerEmail } }
    });
    return response.data;
  },

  getByBooking: async (bookingId: string) => {
    const response = await client.models.Review.list({
      filter: { bookingId: { eq: bookingId } }
    });
    return response.data[0]; // Should only be one review per booking
  },

  update: async (data: any) => {
    const response = await client.models.Review.update(data);
    return response.data;
  },

  addProviderResponse: async (id: string, providerResponse: string) => {
    const response = await client.models.Review.update({ 
      id, 
      response: providerResponse,
      responseDate: new Date().toISOString()
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await client.models.Review.delete({ id });
    return response.data;
  },

  // Calculate average rating for a service
  getServiceRating: async (serviceId: string) => {
    const reviews = await reviewApi.listByService(serviceId);
    if (reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const averageRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length;
    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length
    };
  },

  // Get provider rating summary
  getProviderRating: async (providerEmail: string) => {
    const reviews = await reviewApi.listByProvider(providerEmail);
    if (reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const averageRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length;
    return {
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length
    };
  },

  // Validate review data
  validateReview: (data: {
    rating: number;
    comment?: string;
    providerResponse?: string;
  }) => {
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
  canReviewBooking: async (bookingId: string) => {
    try {
      const booking = await bookingApi.get(bookingId);
      if (!booking) return { canReview: false, reason: 'Booking not found' };

      // Only completed bookings can be reviewed
      if (booking.status !== 'COMPLETED') {
        return { canReview: false, reason: 'Only completed bookings can be reviewed' };
      }

      // Check if already reviewed
      const existingReview = await reviewApi.getByBooking(bookingId);
      if (existingReview) {
        return { canReview: false, reason: 'This booking has already been reviewed' };
      }

      return { canReview: true, reason: null };
    } catch (error) {
      return { canReview: false, reason: 'Error checking booking status' };
    }
  }
};

// Message operations
export const messageApi = {
  create: async (data: any) => {
    const response = await client.models.Message.create(data);
    return response.data;
  },

  get: async (id: string) => {
    const response = await client.models.Message.get({ id });
    return response.data;
  },

  list: async (filter?: any) => {
    const response = await client.models.Message.list({ filter });
    return response.data;
  },

  update: async (data: any) => {
    const response = await client.models.Message.update(data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await client.models.Message.delete({ id });
    return response.data;
  },

  // Get messages for a specific conversation
  getConversationMessages: async (conversationId: string) => {
    const response = await client.models.Message.list({
      filter: { conversationId: { eq: conversationId } }
    });
    return response.data?.sort((a, b) => 
      new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
    ) || [];
  },

  // Get conversations for a user (distinct conversation IDs)
  getUserConversations: async (userEmail: string) => {
    const sentMessages = await client.models.Message.list({
      filter: { senderEmail: { eq: userEmail } }
    });
    const receivedMessages = await client.models.Message.list({
      filter: { recipientEmail: { eq: userEmail } }
    });

    const allMessages = [...(sentMessages.data || []), ...(receivedMessages.data || [])];
    
    // Get unique conversation IDs and their latest message
    const conversationMap = new Map();
    
    allMessages.forEach(message => {
      const existing = conversationMap.get(message.conversationId);
      if (!existing || new Date(message.createdAt || '') > new Date(existing.createdAt || '')) {
        conversationMap.set(message.conversationId, message);
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  },

  // Get unread message count for a user
  getUnreadCount: async (userEmail: string) => {
    const response = await client.models.Message.list({
      filter: { 
        recipientEmail: { eq: userEmail },
        read: { eq: false }
      }
    });
    return response.data?.length || 0;
  },

  // Mark messages as read
  markAsRead: async (conversationId: string, recipientEmail: string) => {
    const unreadMessages = await client.models.Message.list({
      filter: {
        conversationId: { eq: conversationId },
        recipientEmail: { eq: recipientEmail },
        read: { eq: false }
      }
    });

    const updatePromises = unreadMessages.data?.map(message =>
      client.models.Message.update({ id: message.id, read: true })
    ) || [];

    await Promise.all(updatePromises);
  },

  // Send a new message
  sendMessage: async (data: {
    senderEmail: string;
    recipientEmail: string;
    content: string;
    bookingId?: string;
    serviceId?: string;
  }) => {
    const conversationId = generateConversationId(data.senderEmail, data.recipientEmail);
    
    const messageData = {
      conversationId,
      senderEmail: data.senderEmail,
      recipientEmail: data.recipientEmail,
      content: data.content,
      read: false,
      ...(data.bookingId && { bookingId: data.bookingId }),
      ...(data.serviceId && { serviceId: data.serviceId }),
    };

    return await messageApi.create(messageData);
  },

  // Check if users can message each other (have booking history)
  canMessage: async (userEmail1: string, userEmail2: string) => {
    try {
      // Check if there's any booking between these users
      const bookings1 = await client.models.Booking.list({
        filter: {
          customerEmail: { eq: userEmail1 },
          providerEmail: { eq: userEmail2 }
        }
      });

      const bookings2 = await client.models.Booking.list({
        filter: {
          customerEmail: { eq: userEmail2 },
          providerEmail: { eq: userEmail1 }
        }
      });

      return (bookings1.data?.length || 0) > 0 || (bookings2.data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking messaging permissions:', error);
      return false;
    }
  },

  // Subscribe to new messages in a conversation
  subscribeToConversation: (conversationId: string, callback: (message: any) => void) => {
    return client.models.Message.observeQuery({
      filter: { conversationId: { eq: conversationId } }
    }).subscribe({
      next: ({ items }) => {
        // Get the most recent message and call callback
        const sortedMessages = items.sort((a, b) => 
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
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
    return client.models.Message.observeQuery({
      filter: { 
        recipientEmail: { eq: userEmail },
        read: { eq: false }
      }
    }).subscribe({
      next: ({ items }) => {
        callback(items.length);
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
  create: async (data: any) => {
    const response = await client.models.UserProfile.create({
      ...data,
      role: 'PROVIDER'
    });
    return response.data;
  },
  
  get: async (email: string) => {
    // Get user by email - need to list and filter since get() expects ID
    const response = await client.models.UserProfile.list({ 
      filter: { email: { eq: email } }
    });
    return response.data?.[0] || null;
  },
  
  list: async (filter?: any) => {
    const response = await client.models.UserProfile.list({ 
      filter: { ...filter, role: { eq: 'PROVIDER' } }
    });
    return response.data;
  },
  
  update: async (data: any) => {
    const response = await client.models.UserProfile.update(data);
    return response.data;
  },
  
  delete: async (email: string) => {
    // First get the user by email to get the ID
    const userResponse = await client.models.UserProfile.list({ 
      filter: { email: { eq: email } }
    });
    const user = userResponse.data?.[0];
    if (!user) return null;
    
    // Now delete by ID
    const response = await client.models.UserProfile.delete({ id: user.id });
    return response.data;
  },

  // Get provider by email
  getByEmail: async (email: string) => {
    const response = await client.models.UserProfile.list({
      filter: { email: { eq: email } }
    });
    return response.data?.[0];
  },

  // Update verification status
  updateVerificationStatus: async (id: string, status: 'PENDING' | 'VERIFIED' | 'REJECTED') => {
    const response = await client.models.UserProfile.update({ id, verificationStatus: status });
    return response.data;
  },

  // Get providers by verification status
  listByVerificationStatus: async (status: 'PENDING' | 'VERIFIED' | 'REJECTED') => {
    const response = await client.models.UserProfile.list({
      filter: { verificationStatus: { eq: status } }
    });
    return response.data;
  }
};

// Admin-specific operations
export const adminApi = {
  // Dashboard metrics
  getDashboardMetrics: async () => {
    try {
      const [users, services, bookingsResponse, providers] = await Promise.all([
        userProfileApi.list(),
        serviceApi.list(),
        client.models.Booking.list(),
        providerApi.list()
      ]);

      const bookings = bookingsResponse?.data || [];
      const totalRevenue = bookings.reduce((sum, booking) => 
        sum + (booking.amount || 0), 0);
      const platformCommission = totalRevenue * 0.08;

      return {
        totalUsers: users?.length || 0,
        totalServices: services?.length || 0,
        totalBookings: bookings.length,
        totalProviders: providers?.length || 0,
        totalRevenue,
        platformCommission,
        activeServices: services?.filter(s => s.active)?.length || 0,
        pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
        completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
        verifiedProviders: providers?.filter(p => p.verificationStatus === 'VERIFIED')?.length || 0,
        pendingProviders: providers?.filter(p => p.verificationStatus === 'PENDING')?.length || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  // User management
  getUsersWithStats: async () => {
    try {
      const [users, bookingsResponse, services, reviewsResponse] = await Promise.all([
        userProfileApi.list(),
        client.models.Booking.list(),
        serviceApi.list(),
        client.models.Review.list()
      ]);

      const bookings = bookingsResponse?.data || [];
      const reviews = reviewsResponse?.data || [];

      return users?.map(user => {
        const userBookings = bookings.filter(b => 
          b.customerEmail === user.email || b.providerEmail === user.email);
        const userServices = services?.filter(s => s.providerEmail === user.email) || [];
        const userReviews = reviews.filter(r => 
          r.reviewerEmail === user.email || r.revieweeEmail === user.email);

        return {
          ...user,
          bookingsCount: userBookings.length,
          servicesCount: userServices.length,
          reviewsCount: userReviews.length,
          totalSpent: userBookings
            .filter(b => b.customerEmail === user.email)
            .reduce((sum, b) => sum + (b.amount || 0), 0),
          totalEarned: userBookings
            .filter(b => b.providerEmail === user.email)
            .reduce((sum, b) => sum + ((b.amount || 0) * 0.92), 0), // After commission
          lastActivity: user.updatedAt || user.createdAt
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching users with stats:', error);
      throw error;
    }
  },

  // Service management
  getServicesWithStats: async () => {
    try {
      const [services, bookingsResponse, reviewsResponse] = await Promise.all([
        serviceApi.list(),
        client.models.Booking.list(),
        client.models.Review.list()
      ]);

      const bookings = bookingsResponse?.data || [];
      const reviews = reviewsResponse?.data || [];

      return services?.map(service => {
        const serviceBookings = bookings.filter(b => b.serviceId === service.id);
        const serviceReviews = reviews.filter(r => r.serviceId === service.id);
        const averageRating = serviceReviews.length > 0 
          ? serviceReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / serviceReviews.length 
          : 0;

        return {
          ...service,
          bookingsCount: serviceBookings.length,
          reviewsCount: serviceReviews.length,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRevenue: serviceBookings.reduce((sum, b) => sum + (b.amount || 0), 0),
          pendingBookings: serviceBookings.filter(b => b.status === 'PENDING').length,
          completedBookings: serviceBookings.filter(b => b.status === 'COMPLETED').length
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching services with stats:', error);
      throw error;
    }
  },

  // Booking management
  getAllBookingsWithDetails: async () => {
    try {
      const [bookingsResponse, services, users] = await Promise.all([
        client.models.Booking.list(),
        serviceApi.list(),
        userProfileApi.list()
      ]);

      const bookings = bookingsResponse?.data || [];

      return bookings.map(booking => {
        const service = services?.find(s => s.id === booking.serviceId);
        const customer = users?.find(u => u.email === booking.customerEmail);
        const provider = users?.find(u => u.email === booking.providerEmail);

        return {
          ...booking,
          service,
          customer,
          provider,
          platformCommission: (booking.amount || 0) * 0.08,
          providerAmount: (booking.amount || 0) * 0.92
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching bookings with details:', error);
      throw error;
    }
  },

  // Provider management
  getProvidersWithStats: async () => {
    try {
      const [providers, services, bookingsResponse, reviewsResponse] = await Promise.all([
        providerApi.list(),
        serviceApi.list(),
        client.models.Booking.list(),
        client.models.Review.list()
      ]);

      const bookings = bookingsResponse?.data || [];
      const reviews = reviewsResponse?.data || [];

      return providers?.map(provider => {
        const providerServices = services?.filter(s => s.providerEmail === provider.email) || [];
        const providerBookings = bookings.filter(b => b.providerEmail === provider.email);
        const providerReviews = reviews.filter(r => r.revieweeEmail === provider.email);
        
        const totalRevenue = providerBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const averageRating = providerReviews.length > 0 
          ? providerReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / providerReviews.length 
          : 0;

        return {
          ...provider,
          servicesCount: providerServices.length,
          bookingsCount: providerBookings.length,
          reviewsCount: providerReviews.length,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRevenue,
          platformCommission: totalRevenue * 0.08,
          providerEarnings: totalRevenue * 0.92,
          completedBookings: providerBookings.filter(b => b.status === 'COMPLETED').length,
          activeServices: providerServices.filter(s => s.active).length
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching providers with stats:', error);
      throw error;
    }
  },

  // Analytics
  getAnalyticsData: async () => {
    try {
      const [bookingsResponse, services, reviewsResponse, users] = await Promise.all([
        client.models.Booking.list(),
        serviceApi.list(),
        client.models.Review.list(),
        userProfileApi.list()
      ]);

      const bookings = bookingsResponse?.data || [];
      const reviews = reviewsResponse?.data || [];

      // Revenue analytics
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const platformCommission = totalRevenue * 0.08;

      // Category performance
      const categoryStats = services?.reduce((acc, service) => {
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
      }, {} as Record<string, any>) || {};

      // Conversion rates
      const totalServiceViews = services?.length || 0; // Mock data
      const totalBookings = bookings?.length || 0;
      const conversionRate = totalServiceViews > 0 ? (totalBookings / totalServiceViews) * 100 : 0;

      // Provider rankings
      const providerStats = await adminApi.getProvidersWithStats();
      const topProviders = providerStats
        .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
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
          total: users?.length || 0,
          customers: users?.filter(u => u.role === 'CUSTOMER')?.length || 0,
          providers: users?.filter(u => u.role === 'PROVIDER')?.length || 0,
          admins: users?.filter(u => u.role === 'ADMIN')?.length || 0
        }
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }
};