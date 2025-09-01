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
    id: apiUser.id,
    email: apiUser.email,
    firstName: nullToUndefined(apiUser.firstName),
    lastName: nullToUndefined(apiUser.lastName),
    phone: nullToUndefined(apiUser.phone),
    role: withDefault(apiUser.role, 'CUSTOMER'),
    profilePicture: nullToUndefined(apiUser.profilePicture),
    bio: nullToUndefined(apiUser.bio),
    city: nullToUndefined(apiUser.city),
    state: nullToUndefined(apiUser.state),
    country: nullToUndefined(apiUser.country),
    postalCode: nullToUndefined(apiUser.postalCode),
    latitude: nullToUndefined(apiUser.latitude),
    longitude: nullToUndefined(apiUser.longitude),
    timezone: nullToUndefined(apiUser.timezone),
    language: withDefault(apiUser.language, 'en'),
    // Provider-specific fields
    businessName: nullToUndefined(apiUser.businessName),
    businessType: nullToUndefined(apiUser.businessType),
    stripeAccountId: nullToUndefined(apiUser.stripeAccountId),
    stripeOnboardingComplete: withDefault(apiUser.stripeOnboardingComplete, false),
    verificationStatus: nullToUndefined(apiUser.verificationStatus),
    verificationDocuments: apiUser.verificationDocuments?.filter((doc): doc is string => doc !== null) ?? [],
    // Reputation
    totalRatings: withDefault(apiUser.totalRatings, 0),
    averageRating: withDefault(apiUser.averageRating, 0),
    completedServices: withDefault(apiUser.completedServices, 0),
    responseTime: nullToUndefined(apiUser.responseTime),
    // Preferences
    notificationPreferences: apiUser.notificationPreferences ?? {},
    availabilitySettings: apiUser.availabilitySettings ?? {},
    searchRadius: withDefault(apiUser.searchRadius, 10),
    instantBooking: withDefault(apiUser.instantBooking, false),
    // Account status
    active: withDefault(apiUser.active, true),
    lastActive: nullToUndefined(apiUser.lastActive),
    joinedAt: nullToUndefined(apiUser.joinedAt),
    createdAt: nullToUndefined(apiUser.createdAt),
    updatedAt: nullToUndefined(apiUser.updatedAt)
  };
}

/**
 * Maps API Service to our domain Service type
 * Handles the provider name vs provider email mismatch
 */
export function mapApiServiceToService(apiService: ApiService): Service {
  return {
    id: apiService.id,
    title: apiService.title,
    description: apiService.description,
    // Convert cents (integer) to dollars for UI
    price: withDefault((apiService as any).priceCents, 0) / 100,
    category: withDefault(apiService.category, 'SERVICE'),
    providerName: apiService.providerEmail.split('@')[0], // Extract username from email
    providerEmail: apiService.providerEmail,
    duration: withDefault(apiService.minimumBookingTime, 60), // Use minimumBookingTime as duration
    active: withDefault(apiService.active, true),
    // Location fields
    serviceAddress: nullToUndefined(apiService.address),
    serviceCity: nullToUndefined(apiService.city),
    serviceState: nullToUndefined(apiService.state),
    serviceZipCode: nullToUndefined(apiService.postalCode),
    serviceRadius: nullToUndefined(apiService.serviceRadius),
    latitude: nullToUndefined(apiService.latitude),
    longitude: nullToUndefined(apiService.longitude),
    locationType: nullToUndefined(apiService.locationType),
    createdAt: nullToUndefined(apiService.createdAt),
    updatedAt: nullToUndefined(apiService.updatedAt)
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
    // Convert cents (integer) to dollars for UI
    totalAmount: withDefault((apiBooking as any).amountCents, 0) / 100,
    platformFee: (apiBooking as any).platformFeeCents == null ? undefined : (((apiBooking as any).platformFeeCents || 0) / 100),
    providerEarnings: (apiBooking as any).providerEarningsCents == null ? undefined : (((apiBooking as any).providerEarningsCents || 0) / 100),
    notes: nullToUndefined(apiBooking.notes),
    providerNotes: nullToUndefined(apiBooking.specialRequests),
    cancellationReason: nullToUndefined(apiBooking.cancellationReason),
    cancelledBy: nullToUndefined(apiBooking.cancelledBy),
    cancelledAt: nullToUndefined(apiBooking.cancelledAt),
    completedAt: nullToUndefined(apiBooking.completedAt),
    paymentIntentId: nullToUndefined(apiBooking.paymentIntentId),
    paymentStatus: nullToUndefined(apiBooking.paymentStatus),
    refundAmount: 0, // Not in current schema
    refundedAt: undefined, // Not in current schema
    location: nullToUndefined(apiBooking.locationAddress),
    reviewId: nullToUndefined(apiBooking.customerReviewId),
    reviewed: !!apiBooking.customerReviewId,
    reminderSent: false, // Field not in schema
    metadata: {}, // Not in current schema
    createdAt: nullToUndefined(apiBooking.createdAt),
    updatedAt: nullToUndefined(apiBooking.updatedAt)
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
    images: apiReview.images?.filter((img): img is string => img !== null) ?? [],
    verified: withDefault(apiReview.verified, false),
    helpful: 0, // Not in schema
    reported: withDefault(apiReview.flagged, false),
    hidden: !withDefault(apiReview.visible, true),
    createdAt: nullToUndefined(apiReview.createdAt),
    updatedAt: nullToUndefined(apiReview.updatedAt)
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
    attachments: apiMessage.attachments?.filter((att): att is string => att !== null) ?? [],
    bookingId: nullToUndefined(apiMessage.bookingId),
    serviceId: nullToUndefined(apiMessage.serviceId),
    read: withDefault(apiMessage.read, false),
    readAt: nullToUndefined(apiMessage.readAt),
    edited: withDefault(apiMessage.edited, false),
    editedAt: nullToUndefined(apiMessage.editedAt),
    deleted: withDefault(apiMessage.deleted, false),
    deletedAt: undefined, // Not in schema
    metadata: {}, // Not in schema
    createdAt: nullToUndefined(apiMessage.createdAt),
    updatedAt: nullToUndefined(apiMessage.updatedAt)
  };
}

/**
 * Maps API Transaction to our domain Transaction type
 */
export function mapApiTransactionToTransaction(apiTransaction: ApiTransaction): Transaction {
  return {
    id: apiTransaction.id,
    bookingId: apiTransaction.bookingId,
    serviceId: undefined, // Not in schema
    customerId: apiTransaction.customerId,
    customerEmail: '', // Not in schema
    providerId: apiTransaction.providerId,
    providerEmail: '', // Not in schema
    type: withDefault(apiTransaction.type, 'PAYMENT'),
    status: withDefault(apiTransaction.status, 'PENDING'),
    // Convert cents (integer) to dollars for UI
    amount: withDefault((apiTransaction as any).amountCents, 0) / 100,
    currency: withDefault(apiTransaction.currency, 'USD'),
    platformFee: (apiTransaction as any).platformFeeCents == null ? undefined : (((apiTransaction as any).platformFeeCents || 0) / 100),
    providerEarnings: (apiTransaction as any).netAmountCents == null ? undefined : (((apiTransaction as any).netAmountCents || 0) / 100),
    stripePaymentIntentId: nullToUndefined(apiTransaction.paymentIntentId),
    stripeTransferId: nullToUndefined(apiTransaction.transferId),
    stripeRefundId: nullToUndefined(apiTransaction.refundId),
    paymentMethod: undefined, // Not in schema
    last4: undefined, // Not in schema
    receiptUrl: undefined, // Not in schema
    escrowEnabled: false, // Not in schema
    escrowReleaseDate: undefined, // Not in schema
    escrowReleaseConditions: {}, // Not in schema
    metadata: apiTransaction.metadata ?? {},
    failureReason: nullToUndefined(apiTransaction.description),
    processedAt: nullToUndefined(apiTransaction.processedAt),
    createdAt: nullToUndefined(apiTransaction.createdAt),
    updatedAt: nullToUndefined(apiTransaction.updatedAt)
  };
}

/**
 * Maps API Notification to our domain Notification type
 */
export function mapApiNotificationToNotification(apiNotification: ApiNotification): Notification {
  return {
    id: apiNotification.id,
    userId: apiNotification.userId,
    userEmail: '', // Not in schema
    type: withDefault(apiNotification.type, 'INFO'),
    title: apiNotification.title,
    message: apiNotification.message,
    actionUrl: nullToUndefined(apiNotification.actionUrl),
    actionLabel: nullToUndefined(apiNotification.actionText),
    icon: undefined, // Not in schema
    read: withDefault(apiNotification.read, false),
    readAt: nullToUndefined(apiNotification.readAt),
    metadata: {}, // Not in schema
    expiresAt: nullToUndefined(apiNotification.expiresAt),
    createdAt: nullToUndefined(apiNotification.createdAt),
    updatedAt: undefined // Not in schema
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