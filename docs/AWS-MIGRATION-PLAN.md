# AWS Migration Implementation Plan

## Current State Analysis
- ✅ Next.js 14 App Router (keep)
- ✅ Tailwind + ShadCN UI (keep)
- 🔄 Supabase → DynamoDB + Cognito + S3
- 🔄 Clerk → Amazon Cognito
- 🔄 Vercel → AWS Amplify Hosting
- ✅ Stripe Connect (keep)

## Step 1: Amplify Gen 2 Backend Setup

### Update amplify/backend.ts
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { stripeWebhook } from './functions/stripe-webhook/resource.js';
import { bookingProcessor } from './functions/booking-processor/resource.js';
import { searchIndexer } from './functions/search-indexer/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  stripeWebhook,
  bookingProcessor,
  searchIndexer,
});

// Configure DynamoDB streams
backend.data.resources.tables["EcosystemMarketplace"].addStreamSpecification({
  streamViewType: "NEW_AND_OLD_IMAGES"
});
```

### DynamoDB Schema (amplify/data/resource.ts)
```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Single table design
  EcosystemItem: a
    .model({
      pk: a.string().required(),
      sk: a.string().required(),
      entityType: a.string().required(),
      gsi1pk: a.string(),
      gsi1sk: a.string(),
      gsi2pk: a.string(),
      gsi2sk: a.string(),
      // Flexible attributes for different entity types
      name: a.string(),
      email: a.string(),
      role: a.enum(['customer', 'provider']),
      slug: a.string(),
      status: a.string(),
      price: a.integer(),
      stripeAccountId: a.string(),
      // Add more fields as needed
      metadata: a.json(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['pk', 'sk'])
    .secondaryIndexes((index) => [
      index('gsi1pk').sortKeys(['gsi1sk']),
      index('gsi2pk').sortKeys(['gsi2sk']),
    ])
    .authorization((allow) => [
      allow.authenticated(),
      allow.guest().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
```

## Step 2: Authentication Migration (Cognito)

### amplify/auth/resource.ts
```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    phone: false,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    name: {
      required: true,
      mutable: true,
    },
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
  },
  multifactor: {
    mode: 'optional',
    sms: true,
    totp: true,
  },
});
```

## Step 3: Lambda Functions

### Stripe Webhook Handler
```typescript
// amplify/functions/stripe-webhook/handler.ts
import type { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    const stripeEvent = stripe.webhooks.constructEvent(event.body!, sig!, endpointSecret);
    
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(stripeEvent.data.object as Stripe.PaymentIntent);
        break;
      case 'account.updated':
        await handleAccountUpdate(stripeEvent.data.object as Stripe.Account);
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 400, body: 'Webhook error' };
  }
};

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  await dynamoClient.send(new UpdateCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Key: { pk: `BOOKING#${bookingId}`, sk: 'METADATA' },
    UpdateExpression: 'SET #status = :status, updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'confirmed',
      ':now': new Date().toISOString(),
    },
  }));
}
```

## Step 4: Frontend Updates

### Update lib/aws/clients.ts
```typescript
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import outputs from '../../amplify_outputs.json';

Amplify.configure(outputs);

export const client = generateClient<Schema>();

// Auth helpers
export const auth = {
  getCurrentUser,
  signIn,
  signOut,
  signUp,
};
```

### Update components to use Amplify
```typescript
// components/auth/SignInForm.tsx
import { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn({ username: email, password });
      // Redirect to dashboard
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit">Sign In</Button>
    </form>
  );
}
```

## Step 5: Data Access Layer

### lib/dynamodb/queries.ts
```typescript
import { client } from '@/lib/aws/clients';

export async function getProviderBySlug(slug: string) {
  const response = await client.models.EcosystemItem.list({
    filter: {
      and: [
        { entityType: { eq: 'Provider' } },
        { slug: { eq: slug } }
      ]
    }
  });
  
  return response.data[0];
}

export async function createBooking(booking: {
  providerId: string;
  serviceId: string;
  customerId: string;
  startAt: string;
  amount: number;
}) {
  const bookingId = crypto.randomUUID();
  
  return await client.models.EcosystemItem.create({
    pk: `BOOKING#${bookingId}`,
    sk: 'METADATA',
    entityType: 'Booking',
    gsi1pk: `CUSTOMER#${booking.customerId}`,
    gsi1sk: booking.startAt,
    gsi2pk: `PROVIDER#${booking.providerId}`,
    gsi2sk: booking.startAt,
    status: 'pending',
    metadata: JSON.stringify(booking),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
```

## Step 6: Environment Configuration

### Update .env.local
```bash
# AWS Amplify
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxx

# DynamoDB
DYNAMODB_TABLE_NAME=EcosystemMarketplace-dev

# S3
S3_BUCKET_NAME=ecosystem-assets-dev

# Stripe (unchanged)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Step 7: Deployment

### Deploy Backend
```bash
# Development
npx ampx sandbox

# Production
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID
```

### Update package.json scripts
```json
{
  "scripts": {
    "dev": "npm run sandbox & next dev",
    "sandbox": "npx ampx sandbox",
    "deploy": "npx ampx pipeline-deploy --branch main",
    "build": "next build",
    "start": "next start"
  }
}
```

## Migration Checklist

### Backend Infrastructure
- [ ] Amplify Gen 2 project created
- [ ] DynamoDB table with GSIs configured
- [ ] Cognito User Pool set up
- [ ] S3 bucket for asset storage
- [ ] Lambda functions deployed
- [ ] API Gateway endpoints configured

### Application Code
- [ ] Auth components updated for Cognito
- [ ] Database queries migrated to DynamoDB
- [ ] File uploads switched to S3
- [ ] Stripe webhooks using Lambda
- [ ] Environment variables updated

### Testing
- [ ] Unit tests updated for new AWS services
- [ ] Integration tests with DynamoDB
- [ ] E2E tests with Cognito auth
- [ ] Load testing with AWS infrastructure

### Deployment
- [ ] CI/CD pipeline configured
- [ ] Monitoring and logging set up
- [ ] Security policies implemented
- [ ] Cost monitoring enabled

This migration maintains the core marketplace functionality while leveraging AWS services for better scalability and integration with the AWS ecosystem.