import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Single table design for Ecosystem Marketplace
  EcosystemMarketplace: a
    .model({
      pk: a.string().required(),
      sk: a.string().required(),
      entityType: a.string().required(),
      
      // GSI keys for different access patterns
      gsi1pk: a.string(),
      gsi1sk: a.string(),
      gsi2pk: a.string(), 
      gsi2sk: a.string(),
      gsi3pk: a.string(),
      gsi3sk: a.string(),
      
      // Common attributes
      name: a.string(),
      email: a.string(),
      slug: a.string(),
      status: a.string(),
      
      // Provider attributes
      role: a.enum(['customer', 'provider']),
      stripeAccountId: a.string(),
      stripeAccountStatus: a.string(),
      
      // Service attributes
      title: a.string(),
      description: a.string(),
      price: a.integer(),
      duration: a.integer(),
      category: a.string(),
      
      // Booking attributes
      providerId: a.string(),
      serviceId: a.string(),
      customerId: a.string(),
      customerEmail: a.string(),
      startAt: a.datetime(),
      endAt: a.datetime(),
      amount: a.integer(),
      platformFee: a.integer(),
      guestSurcharge: a.integer(),
      paymentIntentId: a.string(),
      refundAmount: a.integer(),
      
      // Flexible metadata for entity-specific data
      metadata: a.json(),
      
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['pk', 'sk'])
    .secondaryIndexes((index) => [
      index('gsi1pk').sortKeys(['gsi1sk']).name('GSI1'), // Provider slug lookup
      index('gsi2pk').sortKeys(['gsi2sk']).name('GSI2'), // Status filtering
      index('gsi3pk').sortKeys(['gsi3sk']).name('GSI3'), // Customer bookings
    ])
    .authorization((allow) => [
      allow.authenticated(),
      allow.guest().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ 
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});