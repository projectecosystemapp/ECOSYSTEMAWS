import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { stripeConnect } from '../functions/stripe-connect/resource';
import { stripeWebhook } from '../functions/stripe-webhook/resource';
import { payoutManager } from '../functions/payout-manager/resource';
import { refundProcessor } from '../functions/refund-processor/resource';
import { bookingProcessor } from '../functions/booking-processor/resource';
import { messagingHandler } from '../functions/messaging-handler/resource';
import { notificationHandler } from '../functions/notification-handler/resource';
import { webhookAuthorizer } from '../functions/webhook-authorizer/resource';

const schema = a.schema({
  // ========== Data Models ==========
  
  // Webhook deduplication to prevent duplicate processing
  ProcessedWebhook: a
    .model({
      eventId: a.string().required(),
      processedAt: a.datetime(),
      result: a.json(),
      eventType: a.string(),
    })
    .identifier(['eventId'])
    .authorization((allow) => [
      allow.custom(), // For webhook processing
      allow.groups(['Admin']), // For admin viewing
    ]),

  // User profile model
  UserProfile: a.model({
    email: a.email().required(),
    firstName: a.string(),
    lastName: a.string(),
    userType: a.string(),
    stripeAccountId: a.string(),
    stripeCustomerId: a.string(),
    profileOwner: a.string(),
  })
  .authorization((allow) => [
    allow.ownerDefinedIn('profileOwner'),
  ]),

  // Booking model
  Booking: a.model({
    serviceId: a.id().required(),
    customerId: a.id().required(),
    providerId: a.id().required(),
    customerEmail: a.email().required(),
    providerEmail: a.email(),
    startDateTime: a.datetime().required(),
    endDateTime: a.datetime().required(),
    status: a.string().required(),
    paymentStatus: a.string(),
    paymentIntentId: a.string(),
    amount: a.float(),
    platformFee: a.float(),
    providerEarnings: a.float(),
    currency: a.string(),
    groupSize: a.integer(),
    specialRequests: a.string(),
    qrCode: a.string(),
    qrCodeScanned: a.boolean(),
    cancelledAt: a.datetime(),
    cancelledBy: a.string(),
    cancellationReason: a.string(),
    refundedAt: a.datetime(),
  })
  .authorization((allow) => [
    allow.authenticated().to(['read']),
    allow.owner().to(['read', 'update']),
    allow.groups(['Admin']),
  ]),

  // Service model
  Service: a.model({
    title: a.string().required(),
    description: a.string(),
    providerId: a.id().required(),
    category: a.string(),
    price: a.float().required(),
    priceType: a.string(),
    currency: a.string(),
    maxGroupSize: a.integer(),
    duration: a.integer(),
    address: a.string(),
    active: a.boolean(),
  })
  .authorization((allow) => [
    allow.authenticated().to(['read']),
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Admin']),
  ]),

  // Message model for in-app messaging
  Message: a.model({
    conversationId: a.string().required(),
    senderId: a.string().required(),
    senderEmail: a.email().required(),
    recipientId: a.string().required(),
    recipientEmail: a.email().required(),
    content: a.string().required(),
    messageType: a.string(),
    attachments: a.string().array(),
    read: a.boolean(),
    readAt: a.string().array(),
    bookingId: a.string(),
    serviceId: a.string(),
  })
  .authorization((allow) => [
    allow.authenticated().to(['read']),
    allow.owner().to(['create', 'read', 'update']),
  ]),

  // ========== Lambda Function Operations (AppSync Integration) ==========
  
  // Stripe Connect operations for provider onboarding and payments
  stripeConnect: a
    .query()
    .arguments({
      action: a.string().required(),
      providerId: a.string(),
      paymentIntentId: a.string(),
      amount: a.float(),
      connectedAccountId: a.string(),
      customerId: a.string(),
      serviceId: a.string(),
      bookingId: a.string(),
      currency: a.string(),
      metadata: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(stripeConnect)),

  // Stripe Webhook processing (requires custom auth for signature validation)
  stripeWebhook: a
    .mutation()
    .arguments({
      body: a.string().required(),
      signature: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.custom(), // Uses Lambda authorizer for signature validation
      allow.groups(['Admin']), // Allow admin access for testing
    ])
    .handler(a.handler.function(stripeWebhook)),

  // Booking processing operations
  processBooking: a
    .mutation()
    .arguments({
      action: a.string().required(),
      bookingId: a.string(),
      serviceId: a.string(),
      customerId: a.string(),
      startDateTime: a.string(),
      endDateTime: a.string(),
      groupSize: a.integer(),
      specialRequests: a.string(),
      customerEmail: a.string(),
      customerPhone: a.string(),
      reason: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(bookingProcessor)),

  // Payout management (admin and provider access)
  processPayouts: a
    .mutation()
    .arguments({
      providerId: a.string().required(),
      payoutId: a.string(),
      amount: a.float(),
      action: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin', 'Provider']),
    ])
    .handler(a.handler.function(payoutManager)),

  // Refund processing
  processRefund: a
    .mutation()
    .arguments({
      paymentIntentId: a.string().required(),
      bookingId: a.string(),
      amount: a.float(),
      reason: a.string(),
      refundType: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin', 'Provider']),
    ])
    .handler(a.handler.function(refundProcessor)),

  // Messaging operations - send message
  sendMessage: a
    .mutation()
    .arguments({
      action: a.string().required(),
      senderEmail: a.string(),
      recipientEmail: a.string(),
      content: a.string(),
      messageType: a.string(),
      bookingId: a.string(),
      serviceId: a.string(),
      conversationId: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(messagingHandler)),

  // Messaging operations - get messages
  getMessages: a
    .query()
    .arguments({
      action: a.string().required(),
      conversationId: a.string(),
      userEmail: a.string().required(),
      query: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(messagingHandler)),

  // Notification operations
  sendNotification: a
    .mutation()
    .arguments({
      action: a.string().required(),
      userId: a.string(),
      type: a.string(),
      title: a.string(),
      message: a.string(),
      data: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(notificationHandler)),

  // Get notifications query
  getNotifications: a
    .query()
    .arguments({
      userId: a.string().required(),
      unreadOnly: a.boolean(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(notificationHandler)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
    lambdaAuthorizationMode: {
      function: webhookAuthorizer,
      ttl: 300, // Cache authorization results for 5 minutes
    },
  },
});