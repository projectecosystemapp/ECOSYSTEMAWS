import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
// AWS-Native Payment System Functions
import { awsPaymentProcessor } from '../functions/aws-payment-processor/resource';
import { achTransferManager } from '../functions/ach-transfer-manager/resource';
import { escrowManager } from '../functions/escrow-manager/resource';
import { fraudDetector } from '../functions/fraud-detector/resource';
import { costMonitor } from '../functions/cost-monitor/resource';
// Core Business Functions (AWS-converted)
import { payoutManager } from '../functions/payout-manager/resource';
import { refundProcessor } from '../functions/refund-processor/resource';
import { bookingProcessor } from '../functions/booking-processor/resource';
import { messagingHandler } from '../functions/messaging-handler/resource';
import { notificationHandler } from '../functions/notification-handler/resource';
import { workflowOrchestrator } from '../functions/workflow-orchestrator/resource';
import { bioGenerator } from '../functions/bio-generator/resource';
import { isoMatcher } from '../functions/iso-matcher/resource';
import { realtimeMessaging } from '../functions/realtime-messaging/resource';
import { disputeWorkflow } from '../functions/dispute-workflow/resource';
import { enhancedSearch } from '../functions/enhanced-search/resource';

const schema = a.schema({
  // ========== AWS-Native Payment Models ==========
  
  // Payment Method model (replaces Stripe payment methods)
  PaymentMethod: a
    .model({
      customerId: a.string().required(),
      type: a.enum(['card', 'bank_account', 'digital_wallet']),
      cardLast4: a.string(),
      cardBrand: a.string(),
      cardExpMonth: a.integer(),
      cardExpYear: a.integer(),
      bankAccountLast4: a.string(),
      bankName: a.string(),
      accountType: a.enum(['checking', 'savings']),
      isDefault: a.boolean(),
      encryptedData: a.string(), // AWS Payment Cryptography encrypted data
      tokenId: a.string(), // Tokenized reference
      verified: a.boolean(),
      fingerprint: a.string(), // Unique identifier for duplicate detection
      billingAddress: a.json(),
      metadata: a.json(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.groups(['Admin']).to(['read', 'update']),
    ]),

  // Transaction model (replaces Stripe payment intents)
  Transaction: a
    .model({
      paymentId: a.string().required(),
      customerId: a.string().required(),
      providerId: a.string(),
      bookingId: a.string(),
      serviceId: a.string(),
      amount: a.float().required(),
      currency: a.string().required(),
      platformFee: a.float(),
      processingFee: a.float(),
      netAmount: a.float(),
      status: a.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']),
      paymentMethod: a.enum(['card', 'ach', 'wire', 'digital_wallet']),
      failureReason: a.string(),
      fraudScore: a.float(),
      fraudRecommendation: a.enum(['APPROVE', 'REVIEW', 'BLOCK']),
      encryptedCardData: a.string(), // AWS Payment Cryptography encrypted
      receiptUrl: a.url(),
      refundedAmount: a.float(),
      metadata: a.json(),
      processedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [
      index('customerId'),
      index('providerId'),
      index('bookingId'),
      index('status'),
    ])
    .authorization((allow) => [
      allow.owner().to(['create', 'read']),
      allow.groups(['Provider', 'Admin']).to(['read']),
    ]),

  // Payment Account model (for provider bank accounts)
  PaymentAccount: a
    .model({
      providerId: a.string().required(),
      accountType: a.enum(['checking', 'savings', 'business_checking']),
      bankName: a.string(),
      routingNumber: a.string(),
      accountNumberLast4: a.string(),
      accountHolderName: a.string().required(),
      encryptedAccountData: a.string(), // Encrypted full account details
      verified: a.boolean(),
      verificationMethod: a.enum(['micro_deposits', 'instant', 'manual']),
      verifiedAt: a.datetime(),
      isDefault: a.boolean(),
      active: a.boolean(),
      achEnabled: a.boolean(),
      wireEnabled: a.boolean(),
      metadata: a.json(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.groups(['Admin']).to(['read', 'update']),
    ]),

  // Escrow Account model (for marketplace fund holding)
  EscrowAccount: a
    .model({
      providerId: a.string().required(),
      accountId: a.string().required(),
      balance: a.float().required(),
      availableBalance: a.float(),
      heldBalance: a.float(),
      frozenBalance: a.float(),
      pendingTransfers: a.float(),
      status: a.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
      lastTransactionId: a.string(),
      lastPayoutAt: a.datetime(),
      totalEarnings: a.float(),
      totalPayouts: a.float(),
      holdPolicy: a.enum(['immediate', 'booking_complete', 'time_based', 'manual']),
      holdDurationDays: a.integer(),
    })
    .identifier(['providerId'])
    .authorization((allow) => [
      allow.owner().to(['read']),
      allow.groups(['Admin']).to(['create', 'read', 'update']),
    ]),

  // ACH Transfer model (for direct bank transfers)
  ACHTransfer: a
    .model({
      transferId: a.string().required(),
      providerId: a.string().required(),
      accountId: a.string().required(),
      amount: a.float().required(),
      fees: a.float(),
      netAmount: a.float(),
      transferType: a.enum(['standard', 'same_day', 'wire']),
      status: a.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
      failureReason: a.string(),
      estimatedArrival: a.datetime(),
      completedAt: a.datetime(),
      achTraceNumber: a.string(), // Bank trace number
      memo: a.string(),
      metadata: a.json(),
    })
    .secondaryIndexes((index) => [
      index('providerId'),
      index('status'),
    ])
    .authorization((allow) => [
      allow.owner().to(['create', 'read']),
      allow.groups(['Admin']).to(['read', 'update']),
    ]),

  // Fraud Event model (for fraud detection tracking)
  FraudEvent: a
    .model({
      eventId: a.string().required(),
      type: a.enum(['FRAUD_EVALUATION', 'FRAUD_REPORT', 'RULE_UPDATE']),
      transactionId: a.string(),
      customerId: a.string(),
      fraudScore: a.float(),
      riskLevel: a.enum(['LOW', 'MEDIUM', 'HIGH']),
      recommendation: a.enum(['APPROVE', 'REVIEW', 'BLOCK']),
      ruleMatches: a.string().array(),
      reasonCodes: a.string().array(),
      fraudType: a.enum(['payment_fraud', 'account_takeover', 'identity_theft', 'velocity_abuse']),
      reportDetails: a.string(),
      reportedBy: a.string(),
      status: a.enum(['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'FALSE_POSITIVE']),
      eventVariables: a.json(),
      modelVersion: a.string(),
    })
    .secondaryIndexes((index) => [
      index('customerId'),
      index('type'),
      index('riskLevel'),
      index('status'),
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'Fraud_Team']).to(['read', 'update']),
      allow.authenticated().to(['create']), // For fraud reporting
    ]),

  // ========== Legacy Data Models ==========
  
  // Webhook deduplication to prevent duplicate processing
  ProcessedWebhook: a
    .model({
      eventId: a.string().required(),
      processedAt: a.datetime(),
      result: a.json(),
      eventType: a.string(),
      ownerId: a.string(),
    })
    .identifier(['eventId'])
    .authorization((allow) => [
      allow.custom(), // For webhook processing
      allow.groups(['Admin']), // For admin viewing
      allow.owner(), // Allow owner access via ownerId
    ]),

  // User model
  User: a.model({
    email: a.email().required(),
    firstName: a.string(),
    lastName: a.string(),
    name: a.string(),
    phone: a.phone(),
    role: a.enum(['CUSTOMER', 'PROVIDER', 'ADMIN']),
    accountType: a.string(),
    profilePicture: a.url(),
    city: a.string(),
    state: a.string(),
    province: a.string(),
    paymentAccountId: a.string(),
    userType: a.string(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  ]),

  // User profile model (alias for User)
  UserProfile: a.model({
    email: a.email().required(),
    firstName: a.string(),
    lastName: a.string(),
    name: a.string(),
    phone: a.phone(),
    role: a.enum(['CUSTOMER', 'PROVIDER', 'ADMIN']),
    accountType: a.string(),
    profilePicture: a.url(),
    city: a.string(),
    state: a.string(),
    province: a.string(),
    paymentAccountId: a.string(),
    userType: a.string(),
    profileOwner: a.string(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  ]),

  // Provider model
  Provider: a.model({
    email: a.email().required(),
    firstName: a.string(),
    lastName: a.string(),
    businessName: a.string(),
    phone: a.phone(),
    address: a.string(),
    city: a.string(),
    state: a.string(),
    province: a.string(),
    zipCode: a.string(),
    paymentAccountId: a.string(),
    stripeOnboardingComplete: a.boolean(),
    verificationStatus: a.enum(['PENDING', 'APPROVED', 'REJECTED']),
    active: a.boolean(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  ]),

  // Provider profile model (alias for Provider)
  ProviderProfile: a.model({
    email: a.email().required(),
    firstName: a.string(),
    lastName: a.string(),
    businessName: a.string(),
    phone: a.phone(),
    publicEmail: a.string(),
    phoneNumber: a.string(),
    bio: a.string(),
    profileImageUrl: a.url(),
    address: a.string(),
    city: a.string(),
    state: a.string(),
    province: a.string(),
    zipCode: a.string(),
    paymentAccountId: a.string(),
    stripeOnboardingComplete: a.boolean(),
    verificationStatus: a.enum(['PENDING', 'APPROVED', 'REJECTED']),
    active: a.boolean(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  ]),

  // Review model
  Review: a.model({
    serviceId: a.id().required(),
    bookingId: a.id().required(),
    customerEmail: a.email().required(),
    providerEmail: a.email().required(),
    rating: a.integer().required(),
    comment: a.string(),
    providerResponse: a.string(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Providers', 'Admins']).to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
  ]),

  // Booking model
  Booking: a.model({
    serviceId: a.id().required(),
    customerEmail: a.email().required(),
    providerEmail: a.email().required(),
    scheduledDate: a.date().required(),
    scheduledTime: a.time().required(),
    startDateTime: a.datetime(),
    endDateTime: a.datetime(),
    status: a.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
    paymentStatus: a.string(),
    totalAmount: a.float().required(),
    amountCents: a.integer(),
    platformFeeCents: a.integer(),
    paymentIntentId: a.string(),
    providerId: a.string(),
    customerId: a.string(),
    notes: a.string(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Providers', 'Admins']).to(['create', 'read', 'update', 'delete']),
  ]),

  // Service model
  Service: a.model({
    title: a.string().required(),
    description: a.string().required(),
    price: a.float().required(),
    category: a.string(),
    providerName: a.string(),
    providerEmail: a.email(),
    duration: a.integer(),
    active: a.boolean(),
  })
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.guest().to(['read']),
    allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
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

  // Notification model for in-app notifications
  Notification: a.model({
    userId: a.string().required(),
    type: a.string().required(),
    title: a.string().required(),
    message: a.string().required(),
    read: a.boolean(),
    readAt: a.datetime(),
    bookingId: a.string(),
    serviceId: a.string(),
    senderId: a.string(),
    actionUrl: a.string(),
    actionText: a.string(),
    expiresAt: a.datetime(),
  })
  .secondaryIndexes((index) => [
    index('userId'),
    index('type'),
  ])
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.groups(['Admin']).to(['read', 'update', 'delete']),
  ]),

  // Generic marketplace data model
  EcosystemMarketplace: a.model({
    pk: a.string().required(),
    sk: a.string().required(),
    entityType: a.string(),
    gsi1pk: a.string(),
    gsi1sk: a.string(),
    gsi2pk: a.string(),
    gsi2sk: a.string(),
    name: a.string(),
    slug: a.string(),
    email: a.string(),
    description: a.string(),
    category: a.string(),
    status: a.string(),
    role: a.string(),
  })
  .identifier(['pk', 'sk'])
  .authorization((allow) => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
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
  
  // ========== AWS-Native Payment Operations ==========
  
  // AWS Payment Processor operations
  processPayment: a
    .mutation()
    .arguments({
      action: a.enum(['process_payment', 'encrypt_card_data', 'decrypt_card_data', 'validate_payment', 'get_payment_status', 'cancel_payment']),
      paymentId: a.string(),
      cardNumber: a.string(),
      expiryMonth: a.string(),
      expiryYear: a.string(),
      cvc: a.string(),
      amount: a.float(),
      currency: a.string(),
      customerId: a.string(),
      providerId: a.string(),
      bookingId: a.string(),
      serviceId: a.string(),
      encryptedCardData: a.string(),
      paymentMethod: a.enum(['card', 'ach', 'wire']),
      billingAddress: a.json(),
      customerInfo: a.json(),
      metadata: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(awsPaymentProcessor)),

  // Payment Methods Management  
  managePaymentMethod: a
    .mutation()
    .arguments({
      action: a.enum(['create', 'update', 'delete', 'set_default', 'list']),
      paymentMethodId: a.string(),
      customerId: a.string(),
      type: a.enum(['card', 'bank_account']),
      cardNumber: a.string(),
      expiryMonth: a.string(),
      expiryYear: a.string(),
      cvc: a.string(),
      bankAccountNumber: a.string(),
      routingNumber: a.string(),
      accountType: a.enum(['checking', 'savings']),
      billingAddress: a.json(),
      metadata: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(awsPaymentProcessor)),

  // ACH Transfer Manager operations
  manageACHTransfer: a
    .mutation()
    .arguments({
      action: a.enum(['initiate_transfer', 'check_status', 'cancel_transfer', 'get_transfer_history', 'validate_bank_account', 'add_bank_account', 'verify_micro_deposits', 'request_payout']),
      transferId: a.string(),
      providerId: a.string(),
      accountId: a.string(),
      amount: a.float(),
      bankAccountNumber: a.string(),
      routingNumber: a.string(),
      accountType: a.enum(['checking', 'savings', 'business_checking']),
      accountHolderName: a.string(),
      transferType: a.enum(['standard', 'same_day', 'wire']),
      memo: a.string(),
      microDepositAmounts: a.json(),
      metadata: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(achTransferManager)),

  // Provider Bank Account Management
  manageBankAccount: a
    .mutation()
    .arguments({
      action: a.enum(['add', 'verify', 'update', 'delete', 'set_default', 'list', 'get_verification_status']),
      providerId: a.string(),
      accountId: a.string(),
      routingNumber: a.string(),
      accountNumber: a.string(),
      accountType: a.enum(['checking', 'savings', 'business_checking']),
      accountHolderName: a.string(),
      bankName: a.string(),
      microDepositAmounts: a.json(),
      verificationDocuments: a.json(),
      metadata: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(achTransferManager)),

  // Escrow Manager operations  
  manageEscrow: a
    .mutation()
    .arguments({
      action: a.enum(['create_account', 'hold_funds', 'release_funds', 'freeze_funds', 'get_balance', 'get_transactions', 'dispute_funds']),
      providerId: a.string(),
      customerId: a.string(),
      bookingId: a.string(),
      transactionId: a.string(),
      amount: a.float(),
      reason: a.string(),
      releaseCondition: a.enum(['booking_complete', 'manual', 'time_based', 'dispute_resolved']),
      holdDuration: a.integer(),
      metadata: a.json(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin', 'Provider']),
    ])
    .handler(a.handler.function(escrowManager)),

  // Fraud Detection operations
  detectFraud: a
    .query()
    .arguments({
      action: a.enum(['evaluate_transaction', 'report_fraud', 'get_fraud_score', 'update_rules', 'get_fraud_history']),
      transactionId: a.string(),
      customerId: a.string(),
      amount: a.float(),
      currency: a.string(),
      paymentMethod: a.string(),
      ipAddress: a.string(),
      userAgent: a.string(),
      deviceFingerprint: a.string(),
      billingAddress: a.json(),
      cardBin: a.string(),
      email: a.string(),
      phone: a.string(),
      fraudType: a.enum(['payment_fraud', 'account_takeover', 'identity_theft', 'velocity_abuse']),
      reportDetails: a.string(),
      rules: a.json().array(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(fraudDetector)),

  // Payment Cryptography operations
  encryptPaymentData: a
    .mutation()
    .arguments({
      action: a.enum(['encrypt_card_data', 'decrypt_card_data', 'generate_data_key', 'rotate_keys', 'validate_card_number', 'tokenize_card']),
      plaintext: a.string(),
      ciphertext: a.string(),
      cardNumber: a.string(),
      keyId: a.string(),
      encryptionContext: a.json(),
      algorithm: a.string(),
      keySpec: a.string(),
      dataKeySpec: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['Admin']), // Restrict access to encryption operations
    ])
    .handler(a.handler.function(awsPaymentProcessor)),

  // ========== Legacy Operations ==========


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
    // lambdaAuthorizationMode: {
    //   function: webhookAuthorizer, // TODO: Implement webhook authorizer
    //   // ttl: 300, // Cache authorization results for 5 minutes
    // },
  },
});