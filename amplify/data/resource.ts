import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { stripeConnect } from '../functions/stripe-connect/resource';
import { stripeWebhook } from '../functions/stripe-webhook/resource';
import { payoutManager } from '../functions/payout-manager/resource';
import { refundProcessor } from '../functions/refund-processor/resource';
import { bookingProcessor } from '../functions/booking-processor/resource';
import { messagingHandler } from '../functions/messaging-handler/resource';
import { notificationHandler } from '../functions/notification-handler/resource';
import { webhookAuthorizer } from '../functions/webhook-authorizer/resource';
import { workflowOrchestrator } from '../functions/workflow-orchestrator/resource';
import { bioGenerator } from '../functions/bio-generator/resource';
import { isoMatcher } from '../functions/iso-matcher/resource';
import { realtimeMessaging } from '../functions/realtime-messaging/resource';
import { disputeWorkflow } from '../functions/dispute-workflow/resource';
import { enhancedSearch } from '../functions/enhanced-search/resource';

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

  // Message model for in-app messaging with real-time subscriptions
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
    requestId: a.string(),
  })
  .secondaryIndexes((index) => [
    index('conversationId'),
    index('senderId'),
    index('recipientId'),
  ])
  .authorization((allow) => [
    allow.authenticated().to(['read']),
    allow.owner().to(['create', 'read', 'update']),
  ]),

  // Generated Bio model for AI-generated provider bios
  GeneratedBio: a.model({
    providerId: a.string().required(),
    businessName: a.string().required(),
    bio: a.string().required(),
    specializations: a.string().array(),
    keywords: a.string().array(),
    yearsExperience: a.integer(),
    generatedAt: a.datetime(),
    status: a.string(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
  ]),

  // ISO System: Service Request model
  ServiceRequest: a.model({
    customerId: a.string().required(),
    customerEmail: a.email().required(),
    title: a.string().required(),
    description: a.string().required(),
    category: a.string().required(),
    budget: a.float(),
    desiredDate: a.datetime(),
    location: a.string(),
    status: a.string().required(),
    embedding: a.float().array(),
    expiresAt: a.datetime(),
  })
  .secondaryIndexes((index) => [
    index('customerId'),
    index('category'),
    index('status'),
  ])
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
  ]),

  // ISO System: Service Offer model
  ServiceOffer: a.model({
    requestId: a.id().required(),
    providerId: a.string().required(),
    providerEmail: a.email().required(),
    message: a.string().required(),
    proposedPrice: a.float(),
    estimatedDuration: a.string(),
    availableDate: a.datetime(),
    status: a.string().required(),
    request: a.belongsTo('ServiceRequest', 'requestId'),
  })
  .secondaryIndexes((index) => [
    index('requestId'),
    index('providerId'),
    index('status'),
  ])
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
  ]),

  // Dispute Resolution: Main dispute model
  Dispute: a.model({
    bookingId: a.id().required(),
    customerId: a.string().required(),
    providerId: a.string().required(),
    initiatedBy: a.string().required(),
    reason: a.string().required(),
    description: a.string().required(),
    amount: a.float(),
    status: a.string().required(),
    resolution: a.string(),
    resolutionReason: a.string(),
    workflowExecutionArn: a.string(),
    autoResolvedAt: a.datetime(),
    resolvedAt: a.datetime(),
    expiresAt: a.datetime(),
  })
  .secondaryIndexes((index) => [
    index('bookingId'),
    index('customerId'),
    index('providerId'),
    index('status'),
  ])
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update']),
    allow.authenticated().to(['read']),
    allow.groups(['Admin']).to(['read', 'update']),
  ]),

  // Dispute Resolution: Evidence collection
  DisputeEvidence: a.model({
    disputeId: a.id().required(),
    submittedBy: a.string().required(),
    evidenceType: a.string().required(),
    description: a.string(),
    fileUrl: a.string(),
    metadata: a.json(),
    dispute: a.belongsTo('Dispute', 'disputeId'),
  })
  .secondaryIndexes((index) => [
    index('disputeId'),
    index('submittedBy'),
  ])
  .authorization((allow) => [
    allow.owner().to(['create', 'read']),
    allow.authenticated().to(['read']),
    allow.groups(['Admin']).to(['read']),
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

  // ========== Step Functions Workflow Operations ==========
  
  // Start a workflow execution
  startWorkflow: a
    .mutation()
    .arguments({
      workflowType: a.string().required(),
      input: a.json(),
      executionName: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin', 'Provider']),
    ])
    .handler(a.handler.function(workflowOrchestrator)),
  
  // Stop a running workflow execution
  stopWorkflow: a
    .mutation()
    .arguments({
      executionArn: a.string().required(),
      workflowType: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin']),
    ])
    .handler(a.handler.function(workflowOrchestrator)),
    
  // Get workflow execution status
  getWorkflowStatus: a
    .query()
    .arguments({
      executionArn: a.string().required(),
      workflowType: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin', 'Provider']),
    ])
    .handler(a.handler.function(workflowOrchestrator)),

  // ========== EventBridge Event Publishing ==========
  
  // Publish custom marketplace events
  publishEvent: a
    .mutation()
    .arguments({
      source: a.string().required(),
      detailType: a.string().required(),
      detail: a.json().required(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin']),
    ])
    .handler(a.handler.function(workflowOrchestrator)),

  // AI Bio Generation using AWS Bedrock
  generateBio: a
    .mutation()
    .arguments({
      businessName: a.string().required(),
      specializations: a.string().array(),
      keywords: a.string().array(),
      yearsExperience: a.integer(),
      providerId: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(bioGenerator)),

  // ISO System: Create service request with AI matching
  createServiceRequest: a
    .mutation()
    .arguments({
      title: a.string().required(),
      description: a.string().required(),
      category: a.string().required(),
      budget: a.float(),
      desiredDate: a.string(),
      location: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(isoMatcher)),

  // ISO System: Find matching requests for provider
  findMatchingRequests: a
    .query()
    .arguments({
      providerId: a.string().required(),
      category: a.string(),
      maxResults: a.integer(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(isoMatcher)),

  // Real-time messaging: Send message with instant delivery
  sendRealtimeMessage: a
    .mutation()
    .arguments({
      conversationId: a.string().required(),
      recipientId: a.string().required(),
      content: a.string().required(),
      messageType: a.string(),
      requestId: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(realtimeMessaging)),

  // Dispute Resolution: Initiate dispute workflow
  initiateDispute: a
    .mutation()
    .arguments({
      bookingId: a.string().required(),
      reason: a.string().required(),
      description: a.string().required(),
      amount: a.float(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(disputeWorkflow)),

  // Dispute Resolution: Submit evidence
  submitEvidence: a
    .mutation()
    .arguments({
      disputeId: a.string().required(),
      evidenceType: a.string().required(),
      description: a.string(),
      fileUrl: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(disputeWorkflow)),

  // Dispute Resolution: Get dispute status
  getDisputeStatus: a
    .query()
    .arguments({
      disputeId: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(disputeWorkflow)),

  // Enhanced Search: Universal search across all content
  searchAll: a
    .query()
    .arguments({
      query: a.string().required(),
      filters: a.json(),
      location: a.string(),
      radius: a.float(),
      sortBy: a.string(),
      limit: a.integer(),
      offset: a.integer(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(enhancedSearch)),

  // Enhanced Search: Get search suggestions/autocomplete
  getSearchSuggestions: a
    .query()
    .arguments({
      query: a.string().required(),
      type: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(enhancedSearch)),

  // Enhanced Search: Get search analytics
  getSearchAnalytics: a
    .query()
    .arguments({
      timeRange: a.string(),
      type: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.groups(['Admin'])])
    .handler(a.handler.function(enhancedSearch)),
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