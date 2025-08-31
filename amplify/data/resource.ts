import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { profileEventsFunction } from "../functions/profile-events/resource";

const schema = a.schema({
  // Enhanced User Profile (Both Customers and Providers)
  UserProfile: a
    .model({
      email: a.email().required(),
      firstName: a.string(),
      lastName: a.string(),
      phone: a.phone(),
      role: a.enum(['CUSTOMER', 'PROVIDER', 'BOTH', 'ADMIN']),
      profilePicture: a.url(),
      bio: a.string(),
      city: a.string(),
      state: a.string(),
      country: a.string(),
      postalCode: a.string(),
      latitude: a.float(),
      longitude: a.float(),
      timezone: a.string(),
      language: a.string().default('en'),
      // Provider-specific fields
      businessName: a.string(),
      businessType: a.enum(['INDIVIDUAL', 'BUSINESS']),
      stripeAccountId: a.string(),
      stripeOnboardingComplete: a.boolean().default(false),
      stripeAccountStatus: a.enum(['PENDING', 'ACTIVE', 'RESTRICTED', 'REJECTED']),
      stripeChargesEnabled: a.boolean().default(false),
      stripePayoutsEnabled: a.boolean().default(false),
      stripeDetailsSubmitted: a.boolean().default(false),
      stripeRequirements: a.json(), // Store any pending requirements from Stripe
      stripeCapabilities: a.json(), // Store enabled capabilities
      stripeOnboardingUrl: a.url(), // Current onboarding link if needed
      verificationStatus: a.enum(['PENDING', 'VERIFIED', 'REJECTED']),
      verificationDocuments: a.string().array(),
      // Reputation
      totalRatings: a.integer().default(0),
      averageRating: a.float().default(0),
      completedServices: a.integer().default(0),
      responseTime: a.integer(), // Average response time in minutes
      // Preferences
      notificationPreferences: a.json(),
      availabilitySettings: a.json(),
      searchRadius: a.integer().default(10), // km
      instantBooking: a.boolean().default(false),
      // Account status
      active: a.boolean().default(true),
      lastActive: a.datetime(),
      joinedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Admins']),
      allow.publicApiKey().to(['read']),
    ]),

  // Enhanced Service/Listing Model
  Service: a
    .model({
      providerId: a.id().required(),
      providerEmail: a.email().required(),
      // Basic Info
      title: a.string().required(),
      description: a.string().required(),
      category: a.enum(['SERVICE', 'SPACE', 'EVENT', 'EXPERIENCE', 'PRODUCT']),
      subcategory: a.string(),
      tags: a.string().array(),
      // Pricing
      priceType: a.enum(['FIXED', 'HOURLY', 'DAILY', 'PROJECT', 'SUBSCRIPTION']),
      price: a.float().required(),
      currency: a.string().default('USD'),
      minimumBookingTime: a.integer(), // in minutes
      maximumBookingTime: a.integer(),
      // Availability
      availabilityType: a.enum(['ALWAYS', 'SCHEDULE', 'REQUEST']),
      availabilitySchedule: a.json(), // Recurring availability
      blackoutDates: a.date().array(),
      instantBooking: a.boolean().default(false),
      advanceBookingDays: a.integer().default(30),
      cancellationPolicy: a.enum(['FLEXIBLE', 'MODERATE', 'STRICT']),
      // Location
      locationType: a.enum(['PROVIDER_LOCATION', 'CUSTOMER_LOCATION', 'BOTH', 'VIRTUAL']),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      postalCode: a.string(),
      country: a.string(),
      latitude: a.float(),
      longitude: a.float(),
      serviceRadius: a.integer(), // in km
      // Media
      images: a.url().array(),
      videos: a.url().array(),
      documents: a.url().array(),
      // Capacity
      maxGroupSize: a.integer().default(1),
      currentBookings: a.integer().default(0),
      maxConcurrentBookings: a.integer(),
      // Requirements
      requirements: a.string().array(),
      includedItems: a.string().array(),
      excludedItems: a.string().array(),
      // Stats
      viewCount: a.integer().default(0),
      bookingCount: a.integer().default(0),
      averageRating: a.float().default(0),
      totalReviews: a.integer().default(0),
      // Status
      active: a.boolean().default(true),
      featured: a.boolean().default(false),
      verified: a.boolean().default(false),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read']),
      allow.groups(['Admins']),
    ]),

  // Enhanced Booking Model with Escrow Support
  Booking: a
    .model({
      serviceId: a.id().required(),
      providerId: a.id().required(),
      customerId: a.id().required(),
      // Contact info
      customerEmail: a.email().required(),
      providerEmail: a.email().required(),
      customerPhone: a.phone(),
      // Schedule
      startDateTime: a.datetime().required(),
      endDateTime: a.datetime().required(),
      duration: a.integer(), // in minutes
      timezone: a.string(),
      // Status
      status: a.enum([
        'PENDING',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
        'REFUNDED'
      ]),
      // Payment
      paymentStatus: a.enum([
        'PENDING',
        'ESCROW_HELD',
        'RELEASED',
        'REFUNDED',
        'FAILED'
      ]),
      paymentIntentId: a.string(),
      transferId: a.string(),
      amount: a.float().required(),
      platformFee: a.float(),
      providerEarnings: a.float(),
      currency: a.string().default('USD'),
      // Escrow
      escrowEnabled: a.boolean().default(false),
      escrowReleaseDate: a.datetime(),
      escrowReleaseConditions: a.json(),
      // Location
      locationAddress: a.string(),
      locationLatitude: a.float(),
      locationLongitude: a.float(),
      locationType: a.enum(['PROVIDER', 'CUSTOMER', 'CUSTOM']),
      // Details
      notes: a.string(),
      specialRequests: a.string(),
      groupSize: a.integer().default(1),
      // QR Code
      qrCode: a.string(),
      qrCodeScanned: a.boolean().default(false),
      qrCodeScannedAt: a.datetime(),
      // Reviews
      customerReviewId: a.id(),
      providerReviewId: a.id(),
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      completedAt: a.datetime(),
      cancelledAt: a.datetime(),
      cancelledBy: a.string(),
      cancellationReason: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Providers', 'Admins']),
    ]),

  // Availability Schedule
  Availability: a
    .model({
      providerId: a.id().required(),
      serviceId: a.id(),
      // Schedule type
      scheduleType: a.enum(['RECURRING', 'SPECIFIC', 'BLACKOUT']),
      // Recurring schedule (e.g., every Monday 9-5)
      dayOfWeek: a.integer(), // 0-6 (Sunday-Saturday)
      startTime: a.time(),
      endTime: a.time(),
      // Specific dates
      specificDate: a.date(),
      specificStartTime: a.datetime(),
      specificEndTime: a.datetime(),
      // Status
      available: a.boolean().default(true),
      maxBookings: a.integer(),
      currentBookings: a.integer().default(0),
      // Metadata
      notes: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read']),
      allow.groups(['Admins']),
    ]),

  // Enhanced Review Model (Two-way reviews)
  Review: a
    .model({
      bookingId: a.id().required(),
      serviceId: a.id().required(),
      // Reviewer info
      reviewerType: a.enum(['CUSTOMER', 'PROVIDER']),
      reviewerId: a.id().required(),
      reviewerEmail: a.email().required(),
      // Reviewee info
      revieweeId: a.id().required(),
      revieweeEmail: a.email().required(),
      // Review content
      rating: a.integer().required(), // 1-5
      title: a.string(),
      comment: a.string(),
      // Specific ratings
      qualityRating: a.integer(),
      communicationRating: a.integer(),
      punctualityRating: a.integer(),
      valueRating: a.integer(),
      cleanlinessRating: a.integer(),
      // Response
      response: a.string(),
      responseDate: a.datetime(),
      // Media
      images: a.url().array(),
      // Verification
      verified: a.boolean().default(false),
      // Moderation
      flagged: a.boolean().default(false),
      flagReason: a.string(),
      visible: a.boolean().default(true),
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read']),
      allow.groups(['Admins']),
    ]),

  // Transaction/Payment Model
  Transaction: a
    .model({
      bookingId: a.id().required(),
      // Parties
      customerId: a.id().required(),
      providerId: a.id().required(),
      // Payment details
      type: a.enum(['PAYMENT', 'REFUND', 'PAYOUT', 'FEE']),
      amount: a.float().required(),
      currency: a.string().default('USD'),
      // Stripe references
      paymentIntentId: a.string(),
      chargeId: a.string(),
      transferId: a.string(),
      refundId: a.string(),
      // Status
      status: a.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
      // Fees
      platformFee: a.float(),
      stripeFee: a.float(),
      netAmount: a.float(),
      // Metadata
      description: a.string(),
      metadata: a.json(),
      // Timestamps
      createdAt: a.datetime(),
      processedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Admins']),
    ]),

  // UserSubscription Model (renamed from Subscription to avoid GraphQL reserved word conflict)
  UserSubscription: a
    .model({
      customerId: a.id().required(),
      providerId: a.id().required(),
      serviceId: a.id().required(),
      // Subscription details
      stripeSubscriptionId: a.string(),
      status: a.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']),
      // Schedule
      frequency: a.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
      startDate: a.date().required(),
      endDate: a.date(),
      nextBillingDate: a.date(),
      // Pricing
      amount: a.float().required(),
      currency: a.string().default('USD'),
      // Usage
      usageCount: a.integer().default(0),
      maxUsage: a.integer(),
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      cancelledAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Providers', 'Admins']),
    ]),

  // Message/Chat Model
  Message: a
    .model({
      conversationId: a.string().required(),
      // Participants
      senderId: a.id().required(),
      senderEmail: a.email().required(),
      recipientId: a.id().required(),
      recipientEmail: a.email().required(),
      // Content
      content: a.string().required(),
      messageType: a.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']),
      attachments: a.url().array(),
      // Context
      bookingId: a.id(),
      serviceId: a.id(),
      // Status
      read: a.boolean().default(false),
      readAt: a.datetime(),
      edited: a.boolean().default(false),
      editedAt: a.datetime(),
      deleted: a.boolean().default(false),
      // Timestamps
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read', 'create']),
      allow.groups(['Admins']),
    ]),

  // Dispute Model
  Dispute: a
    .model({
      bookingId: a.id().required(),
      // Parties
      initiatorId: a.id().required(),
      initiatorType: a.enum(['CUSTOMER', 'PROVIDER']),
      respondentId: a.id().required(),
      // Details
      reason: a.enum([
        'SERVICE_NOT_PROVIDED',
        'QUALITY_ISSUE',
        'PAYMENT_ISSUE',
        'CANCELLATION_DISPUTE',
        'OTHER'
      ]),
      description: a.string().required(),
      requestedResolution: a.string(),
      // Evidence
      evidence: a.url().array(),
      // Resolution
      status: a.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED']),
      resolution: a.string(),
      resolvedBy: a.id(),
      // Financial
      refundAmount: a.float(),
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      resolvedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Admins']),
    ]),

  // Notification Model
  Notification: a
    .model({
      userId: a.id().required(),
      // Content
      type: a.enum([
        'BOOKING_REQUEST',
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'PAYMENT_RECEIVED',
        'REVIEW_RECEIVED',
        'MESSAGE_RECEIVED',
        'DISPUTE_OPENED',
        'SYSTEM_ALERT'
      ]),
      title: a.string().required(),
      message: a.string().required(),
      // References
      bookingId: a.id(),
      serviceId: a.id(),
      senderId: a.id(),
      // Status
      read: a.boolean().default(false),
      readAt: a.datetime(),
      // Actions
      actionUrl: a.url(),
      actionText: a.string(),
      // Timestamps
      createdAt: a.datetime(),
      expiresAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['Admins']),
    ]),

  // Analytics Model
  Analytics: a
    .model({
      entityId: a.id().required(),
      entityType: a.enum(['SERVICE', 'PROVIDER', 'BOOKING']),
      // Metrics
      eventType: a.enum([
        'VIEW',
        'SEARCH_IMPRESSION',
        'CLICK',
        'BOOKING_STARTED',
        'BOOKING_COMPLETED',
        'SHARE'
      ]),
      // Context
      userId: a.id(),
      sessionId: a.string(),
      referrer: a.string(),
      device: a.string(),
      location: a.string(),
      // Timestamps
      timestamp: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.groups(['Admins']),
      allow.owner(),
    ]),

  // Provider Profile Model - Enhanced marketplace profile
  ProviderProfile: a
    .model({
      userId: a.id().required(),
      // Business Information
      businessName: a.string().required(),
      bio: a.string(),
      tagline: a.string(),
      profileImageUrl: a.url(),
      coverImageUrl: a.url(),
      galleryImages: a.url().array(),
      // Professional Details
      yearsInBusiness: a.integer(),
      certifications: a.string().array(),
      specializations: a.string().array(),
      languages: a.string().array(),
      // Portfolio
      portfolioItems: a.json(), // Array of portfolio items with images and descriptions
      // Social Proof
      socialLinks: a.json(), // Social media links
      testimonials: a.json(), // Featured testimonials
      // SEO
      slug: a.string(), // URL-friendly identifier
      keywords: a.string().array(),
      // Status
      profileComplete: a.boolean().default(false),
      featured: a.boolean().default(false),
      verified: a.boolean().default(false),
      lastUpdated: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['read']),
      allow.authenticated().to(['read']),
    ]),

  // AI Generation Route for Business Bio
  generateBio: a
    .generation({
      aiModel: a.ai.model('Claude 3.5 Sonnet'),
      systemPrompt: 'You are a helpful business assistant specializing in creating compelling and professional service provider bios. Based on the keywords and business details provided, write a engaging one-paragraph bio that highlights the provider\'s expertise, experience, and unique value proposition. Keep the tone professional yet approachable, and limit the response to 150-200 words.',
    })
    .arguments({
      keywords: a.string(),
      businessName: a.string(),
      specializations: a.string().array(),
      yearsExperience: a.integer(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.authenticated()]),
})
  .authorization((allow) => [allow.resource(profileEventsFunction)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});