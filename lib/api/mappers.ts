/**
 * Type Transformation Layer (Mappers)
 * 
 * This layer handles the conversion between Amplify's auto-generated GraphQL types
 * and our application's domain types. It addresses the fundamental incompatibilities:
 * - null vs undefined
 * - Property name mismatches
 * - Nested relationship handling
 * - Default value provisioning
 */

import { type Schema } from "@/amplify/data/resource";
import type { 
  Service, 
  Review, 
  Booking, 
  UserProfile,
  Message,
  Transaction,
  Notification,
  ServiceWithRating
} from "@/lib/types";

// Type aliases for Amplify's auto-generated types
type ApiService = Schema["Service"]["type"];
type ApiReview = Schema["Review"]["type"];
type ApiBooking = Schema["Booking"]["type"];
type ApiUserProfile = Schema["UserProfile"]["type"];
type ApiMessage = Schema["Message"]["type"];
type ApiTransaction = Schema["Transaction"]["type"];
type ApiNotification = Schema["Notification"]["type"];

/**
 * Safely converts null to undefined for optional fields
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Provides a default value if the input is null or undefined
 */
function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

/**
 * Maps API UserProfile to our domain UserProfile type
 */
export function mapApiUserProfileToUserProfile(apiUser: ApiUserProfile): UserProfile {
  return {
    email: apiUser.email,
    firstName: nullToUndefined(apiUser.firstName),
    lastName: nullToUndefined(apiUser.lastName),
    role: withDefault(apiUser.role, 'CUSTOMER'),
    businessName: nullToUndefined(apiUser.businessName),
    businessDescription: nullToUndefined(apiUser.businessDescription),
    phone: nullToUndefined(apiUser.phone),
    profileImage: nullToUndefined(apiUser.profileImage),
    coverImage: nullToUndefined(apiUser.coverImage),
    location: nullToUndefined(apiUser.location),
    city: nullToUndefined(apiUser.city),
    state: nullToUndefined(apiUser.state),
    zipCode: nullToUndefined(apiUser.zipCode),
    latitude: nullToUndefined(apiUser.latitude),
    longitude: nullToUndefined(apiUser.longitude),
    servicesOffered: apiUser.servicesOffered?.filter(Boolean) ?? [],
    specializations: apiUser.specializations?.filter(Boolean) ?? [],
    yearsOfExperience: nullToUndefined(apiUser.yearsOfExperience),
    certifications: apiUser.certifications?.filter(Boolean) ?? [],
    insuranceVerified: withDefault(apiUser.insuranceVerified, false),
    backgroundCheckCompleted: withDefault(apiUser.backgroundCheckCompleted, false),
    identityVerified: withDefault(apiUser.identityVerified, false),
    averageRating: withDefault(apiUser.averageRating, 0),
    totalReviews: withDefault(apiUser.totalReviews, 0),
    completedBookings: withDefault(apiUser.completedBookings, 0),
    responseRate: nullToUndefined(apiUser.responseRate),
    responseTime: nullToUndefined(apiUser.responseTime),
    stripeAccountId: nullToUndefined(apiUser.stripeAccountId),
    stripeAccountStatus: nullToUndefined(apiUser.stripeAccountStatus),
    stripeOnboardingCompleted: withDefault(apiUser.stripeOnboardingCompleted, false),
    notificationSettings: apiUser.notificationSettings ?? {},
    availability: apiUser.availability ?? {},
    socialLinks: apiUser.socialLinks ?? {},
    languages: apiUser.languages?.filter(Boolean) ?? [],
    timezone: nullToUndefined(apiUser.timezone),
    joinedAt: apiUser.joinedAt ?? new Date().toISOString(),
    lastActive: nullToUndefined(apiUser.lastActive),
    isActive: withDefault(apiUser.isActive, true),
    isPremium: withDefault(apiUser.isPremium, false),
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt
  };
}

/**
 * Maps API Service to our domain Service type
 * Handles the provider name vs provider email mismatch
 */
export function mapApiServiceToService(apiService: ApiService): Service {
  return {
    id: apiService.id,
    providerId: apiService.providerId,
    providerEmail: apiService.providerEmail,
    // Map providerEmail to providerName as a fallback
    providerName: apiService.providerEmail.split('@')[0], // Extract username from email
    title: apiService.title,
    description: apiService.description,
    category: withDefault(apiService.category, 'SERVICE'),
    subcategory: nullToUndefined(apiService.subcategory),
    tags: apiService.tags?.filter(Boolean) ?? [],
    price: withDefault(apiService.price, 0),
    priceType: withDefault(apiService.priceType, 'FIXED'),
    // Map serviceDuration to duration
    duration: withDefault(apiService.serviceDuration, 60),
    images: apiService.images?.filter(Boolean) ?? [],
    video: nullToUndefined(apiService.video),
    serviceLocation: nullToUndefined(apiService.serviceLocation),
    serviceCity: nullToUndefined(apiService.serviceCity),
    serviceState: nullToUndefined(apiService.serviceState),
    serviceZipCode: nullToUndefined(apiService.serviceZipCode),
    serviceRadius: nullToUndefined(apiService.serviceRadius),
    latitude: nullToUndefined(apiService.latitude),
    longitude: nullToUndefined(apiService.longitude),
    availability: apiService.availability ?? {},
    instantBooking: withDefault(apiService.instantBooking, false),
    cancellationPolicy: nullToUndefined(apiService.cancellationPolicy),
    requirements: nullToUndefined(apiService.requirements),
    included: apiService.included?.filter(Boolean) ?? [],
    excluded: apiService.excluded?.filter(Boolean) ?? [],
    faqs: apiService.faqs ?? [],
    minimumNotice: nullToUndefined(apiService.minimumNotice),
    maximumBookingAdvance: nullToUndefined(apiService.maximumBookingAdvance),
    totalBookings: withDefault(apiService.totalBookings, 0),
    completedBookings: withDefault(apiService.completedBookings, 0),
    averageRating: withDefault(apiService.averageRating, 0),
    totalReviews: withDefault(apiService.totalReviews, 0),
    featured: withDefault(apiService.featured, false),
    active: withDefault(apiService.active, true),
    createdAt: apiService.createdAt,
    updatedAt: apiService.updatedAt
  };
}

/**
 * Maps API Service to ServiceWithRating type (includes computed rating fields)
 */
export function mapApiServiceToServiceWithRating(
  apiService: ApiService,
  rating?: number,
  reviewCount?: number
): ServiceWithRating {
  const baseService = mapApiServiceToService(apiService);
  return {
    ...baseService,
    rating: rating ?? withDefault(apiService.averageRating, 0),
    reviewCount: reviewCount ?? withDefault(apiService.totalReviews, 0)
  };
}

/**
 * Maps API Booking to our domain Booking type
 * Transforms startDateTime/endDateTime to scheduledDate/scheduledTime
 */
export function mapApiBookingToBooking(apiBooking: ApiBooking): Booking {
  // Parse the datetime strings with error handling
  let startDate: Date;
  let endDate: Date;
  let scheduledDate: string;
  let scheduledTime: string;
  
  try {
    startDate = new Date(apiBooking.startDateTime);
    endDate = new Date(apiBooking.endDateTime);
    
    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end date');
    }
    
    // Format date and time separately
    scheduledDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    scheduledTime = startDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (error) {
    // Fallback for invalid dates
    const now = new Date();
    startDate = now;
    endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
    scheduledDate = now.toISOString().split('T')[0];
    scheduledTime = '12:00 PM';
  }

  return {
    id: apiBooking.id,
    serviceId: apiBooking.serviceId,
    serviceTitle: '', // This should be populated from a joined query or separate fetch
    providerId: apiBooking.providerId,
    providerName: '', // This should be populated from a joined query
    providerEmail: apiBooking.providerEmail,
    customerId: apiBooking.customerId,
    customerName: '', // This should be populated from a joined query
    customerEmail: apiBooking.customerEmail,
    customerPhone: nullToUndefined(apiBooking.customerPhone),
    scheduledDate,
    scheduledTime,
    duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000), // minutes
    status: withDefault(apiBooking.status, 'PENDING'),
    totalAmount: withDefault(apiBooking.amount, 0),
    platformFee: nullToUndefined(apiBooking.platformFee),
    providerEarnings: nullToUndefined(apiBooking.providerEarnings),
    notes: nullToUndefined(apiBooking.customerNotes),
    providerNotes: nullToUndefined(apiBooking.providerNotes),
    cancellationReason: nullToUndefined(apiBooking.cancellationReason),
    cancelledBy: nullToUndefined(apiBooking.cancelledBy),
    cancelledAt: nullToUndefined(apiBooking.cancelledAt),
    completedAt: nullToUndefined(apiBooking.completedAt),
    paymentIntentId: nullToUndefined(apiBooking.paymentIntentId),
    paymentStatus: nullToUndefined(apiBooking.paymentStatus),
    refundAmount: nullToUndefined(apiBooking.refundAmount),
    refundedAt: nullToUndefined(apiBooking.refundedAt),
    location: nullToUndefined(apiBooking.serviceLocation),
    reviewId: nullToUndefined(apiBooking.reviewId),
    reviewed: withDefault(apiBooking.hasReview, false),
    reminderSent: withDefault(apiBooking.reminderSent, false),
    metadata: apiBooking.metadata ?? {},
    createdAt: apiBooking.createdAt,
    updatedAt: apiBooking.updatedAt
  };
}

/**
 * Maps API Review to our domain Review type
 * Handles the reviewer/reviewee vs customer/provider naming
 */
export function mapApiReviewToReview(apiReview: ApiReview): Review {
  const isCustomerReview = apiReview.reviewerType === 'CUSTOMER';
  
  return {
    id: apiReview.id,
    bookingId: apiReview.bookingId,
    serviceId: apiReview.serviceId,
    // Map reviewer/reviewee to customer/provider based on type
    customerEmail: isCustomerReview ? apiReview.reviewerEmail : apiReview.revieweeEmail,
    providerEmail: isCustomerReview ? apiReview.revieweeEmail : apiReview.reviewerEmail,
    rating: withDefault(apiReview.rating, 0),
    title: nullToUndefined(apiReview.title),
    comment: nullToUndefined(apiReview.comment),
    // Map 'response' to 'providerResponse'
    providerResponse: nullToUndefined(apiReview.response),
    providerResponseDate: nullToUndefined(apiReview.responseDate),
    images: apiReview.images?.filter(Boolean) ?? [],
    verified: withDefault(apiReview.verified, false),
    helpful: withDefault(apiReview.helpful, 0),
    reported: withDefault(apiReview.reported, false),
    hidden: withDefault(apiReview.hidden, false),
    createdAt: apiReview.createdAt,
    updatedAt: apiReview.updatedAt
  };
}

/**
 * Maps API Message to our domain Message type
 */
export function mapApiMessageToMessage(apiMessage: ApiMessage): Message {
  return {
    id: apiMessage.id,
    conversationId: apiMessage.conversationId,
    senderId: apiMessage.senderId,
    senderEmail: apiMessage.senderEmail,
    recipientId: apiMessage.recipientId,
    recipientEmail: apiMessage.recipientEmail,
    content: apiMessage.content,
    messageType: withDefault(apiMessage.messageType, 'TEXT'),
    attachments: apiMessage.attachments?.filter(Boolean) ?? [],
    bookingId: nullToUndefined(apiMessage.bookingId),
    serviceId: nullToUndefined(apiMessage.serviceId),
    read: withDefault(apiMessage.read, false),
    readAt: nullToUndefined(apiMessage.readAt),
    edited: withDefault(apiMessage.edited, false),
    editedAt: nullToUndefined(apiMessage.editedAt),
    deleted: withDefault(apiMessage.deleted, false),
    deletedAt: nullToUndefined(apiMessage.deletedAt),
    metadata: apiMessage.metadata ?? {},
    createdAt: apiMessage.createdAt,
    updatedAt: apiMessage.updatedAt
  };
}

/**
 * Maps API Transaction to our domain Transaction type
 */
export function mapApiTransactionToTransaction(apiTransaction: ApiTransaction): Transaction {
  return {
    id: apiTransaction.id,
    bookingId: apiTransaction.bookingId,
    serviceId: apiTransaction.serviceId,
    customerId: apiTransaction.customerId,
    customerEmail: apiTransaction.customerEmail,
    providerId: apiTransaction.providerId,
    providerEmail: apiTransaction.providerEmail,
    type: withDefault(apiTransaction.type, 'PAYMENT'),
    status: withDefault(apiTransaction.status, 'PENDING'),
    amount: withDefault(apiTransaction.amount, 0),
    currency: withDefault(apiTransaction.currency, 'USD'),
    platformFee: nullToUndefined(apiTransaction.platformFee),
    providerEarnings: nullToUndefined(apiTransaction.providerEarnings),
    stripePaymentIntentId: nullToUndefined(apiTransaction.stripePaymentIntentId),
    stripeTransferId: nullToUndefined(apiTransaction.stripeTransferId),
    stripeRefundId: nullToUndefined(apiTransaction.stripeRefundId),
    paymentMethod: nullToUndefined(apiTransaction.paymentMethod),
    last4: nullToUndefined(apiTransaction.last4),
    receiptUrl: nullToUndefined(apiTransaction.receiptUrl),
    escrowEnabled: withDefault(apiTransaction.escrowEnabled, false),
    escrowReleaseDate: nullToUndefined(apiTransaction.escrowReleaseDate),
    escrowReleaseConditions: apiTransaction.escrowReleaseConditions ?? {},
    metadata: apiTransaction.metadata ?? {},
    failureReason: nullToUndefined(apiTransaction.failureReason),
    processedAt: nullToUndefined(apiTransaction.processedAt),
    createdAt: apiTransaction.createdAt,
    updatedAt: apiTransaction.updatedAt
  };
}

/**
 * Maps API Notification to our domain Notification type
 */
export function mapApiNotificationToNotification(apiNotification: ApiNotification): Notification {
  return {
    id: apiNotification.id,
    userId: apiNotification.userId,
    userEmail: apiNotification.userEmail,
    type: withDefault(apiNotification.type, 'INFO'),
    title: apiNotification.title,
    message: apiNotification.message,
    actionUrl: nullToUndefined(apiNotification.actionUrl),
    actionLabel: nullToUndefined(apiNotification.actionLabel),
    icon: nullToUndefined(apiNotification.icon),
    read: withDefault(apiNotification.read, false),
    readAt: nullToUndefined(apiNotification.readAt),
    metadata: apiNotification.metadata ?? {},
    expiresAt: nullToUndefined(apiNotification.expiresAt),
    createdAt: apiNotification.createdAt,
    updatedAt: apiNotification.updatedAt
  };
}

/**
 * Array mapping utilities
 */
export function mapApiServiceList(apiServices: ApiService[]): Service[] {
  return apiServices.filter(Boolean).map(mapApiServiceToService);
}

export function mapApiServiceListWithRating(
  apiServices: ApiService[],
  ratingsMap?: Map<string, { rating: number; count: number }>
): ServiceWithRating[] {
  return apiServices.filter(Boolean).map(service => {
    const ratingInfo = ratingsMap?.get(service.id);
    return mapApiServiceToServiceWithRating(
      service,
      ratingInfo?.rating,
      ratingInfo?.count
    );
  });
}

export function mapApiBookingList(apiBookings: ApiBooking[]): Booking[] {
  return apiBookings.filter(Boolean).map(mapApiBookingToBooking);
}

export function mapApiReviewList(apiReviews: ApiReview[]): Review[] {
  return apiReviews.filter(Boolean).map(mapApiReviewToReview);
}

export function mapApiUserProfileList(apiUsers: ApiUserProfile[]): UserProfile[] {
  return apiUsers.filter(Boolean).map(mapApiUserProfileToUserProfile);
}

export function mapApiMessageList(apiMessages: ApiMessage[]): Message[] {
  return apiMessages.filter(Boolean).map(mapApiMessageToMessage);
}

export function mapApiTransactionList(apiTransactions: ApiTransaction[]): Transaction[] {
  return apiTransactions.filter(Boolean).map(mapApiTransactionToTransaction);
}

export function mapApiNotificationList(apiNotifications: ApiNotification[]): Notification[] {
  return apiNotifications.filter(Boolean).map(mapApiNotificationToNotification);
}