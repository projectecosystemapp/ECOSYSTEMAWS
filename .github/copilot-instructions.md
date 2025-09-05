# GitHub Copilot Custom Instructions - AWS Amplify Gen2 Marketplace

## Project Overview
You are working on a **Service Marketplace MVP** built with Next.js 14 and AWS Amplify Gen2. This is a comprehensive marketplace platform connecting service providers with customers, featuring real-time messaging, payments via Stripe, AI-powered matching, and dispute resolution.

## Architecture Principles

### 1. AWS-Native First Architecture
**CRITICAL**: Always prioritize AWS-native services over external solutions. Before suggesting any external service:

1. Check if AWS provides equivalent functionality
2. Consider AWS service combinations
3. Only suggest external services with documented business justification

**Service Mapping Reference**:
- Real-time updates → AppSync Subscriptions (NOT Socket.io)
- Workflow orchestration → Step Functions (NOT Temporal/Airflow)
- Event routing → EventBridge (NOT RabbitMQ/Kafka)
- Search → OpenSearch (NOT Elasticsearch/Algolia)
- File storage → S3 via Amplify Storage (NOT custom servers)
- Authentication → Cognito (NOT Auth0/Okta)
- Notifications → SNS/Pinpoint (NOT Twilio/SendGrid)
- Queuing → SQS (NOT Redis Queue)
- Caching → ElastiCache/DynamoDB (NOT Redis/Memcached)

### 2. Amplify Gen2 Patterns
- Use `amplify/` directory for all backend resources
- Define data models in `amplify/data/resource.ts`
- Lambda functions in `amplify/functions/[function-name]/`
- Authorization via Cognito User Pools with custom authorizers for webhooks
- Real-time subscriptions via AppSync
- File uploads via Amplify Storage (S3)

## Project Structure & File Locations

### Core Directories
```
amplify/                 # Backend resources (auth, data, functions)
├── auth/               # Cognito configuration
├── data/               # GraphQL schema & resolvers
├── functions/          # Lambda functions
├── storage/            # S3 storage configuration
└── backend.ts          # Main backend configuration

app/                    # Next.js App Router
├── admin/              # Admin dashboard
├── auth/               # Authentication pages
├── customer/           # Customer-specific pages
├── provider/           # Provider-specific pages
├── api/                # API routes
└── services/           # Service-related pages

components/             # React components
├── ui/                 # Reusable UI components (shadcn/ui)
├── admin/              # Admin-specific components
├── customer/           # Customer-specific components
├── provider/           # Provider-specific components
├── messaging/          # Real-time messaging components
└── search/             # Search & filtering components

lib/                    # Shared utilities
├── amplify-client.ts   # Amplify client configuration
├── types.ts            # TypeScript type definitions
├── api.ts              # API utilities
└── utils.ts            # General utilities
```

### Key Files to Reference
- **Schema**: `amplify/data/resource.ts` - Complete GraphQL schema
- **Types**: `lib/types.ts` - TypeScript interfaces
- **Client**: `lib/amplify-client.ts` - Amplify configuration
- **Config**: `amplify_outputs.json` - Generated Amplify config

## Data Models & Schema

### Core Models (from amplify/data/resource.ts)
```typescript
// Primary entities
User, UserProfile, Provider, ProviderProfile
Service, Booking, Review
Message, Notification
ServiceRequest, ServiceOffer (ISO system)
Dispute, DisputeEvidence
GeneratedBio, ProcessedWebhook

// Key relationships
Booking → Service → Provider
Message → Conversation (conversationId)
ServiceOffer → ServiceRequest
Dispute → Booking
```

### Authorization Patterns
```typescript
// Standard pattern for user-owned resources
.authorization((allow) => [
  allow.owner().to(['create', 'read', 'update', 'delete']),
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
])

// Public read with owner write
.authorization((allow) => [
  allow.owner().to(['create', 'read', 'update', 'delete']),
  allow.authenticated().to(['read']),
])

// Webhook processing (custom authorizer)
.authorization((allow) => [
  allow.custom(), // Lambda authorizer
  allow.groups(['Admin']),
])
```

## Lambda Functions & Operations

### Available Lambda Operations (from schema)
```typescript
// Stripe & Payments
stripeConnect(action, providerId, paymentIntentId, amount, ...)
stripeWebhook(body, signature) // Custom auth required
processPayouts(providerId, payoutId, amount, action)
processRefund(paymentIntentId, bookingId, amount, reason)

// Booking Management
processBooking(action, bookingId, serviceId, customerId, ...)

// Messaging & Notifications
sendMessage(action, senderEmail, recipientEmail, content, ...)
getMessages(action, conversationId, userEmail, query)
sendNotification(action, userId, type, title, message, data)
getNotifications(userId, unreadOnly)

// AI & Matching
generateBio(businessName, specializations, keywords, ...)
createServiceRequest(title, description, category, budget, ...)
findMatchingRequests(providerId, category, maxResults)

// Search
searchAll(query, filters, location, radius, sortBy, ...)
getSearchSuggestions(query, type)

// Workflows & Disputes
startWorkflow(workflowType, input, executionName)
initiateDispute(bookingId, reason, description, amount)
submitEvidence(disputeId, evidenceType, description, fileUrl)
```

## Code Patterns & Best Practices

### 1. Amplify Client Usage
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// Query pattern
const { data: services } = await client.models.Service.list();

// Mutation pattern
const { data: newService } = await client.models.Service.create({
  title: 'Service Title',
  description: 'Description',
  price: 100,
  category: 'Home Services'
});

// Lambda function call
const result = await client.queries.stripeConnect({
  action: 'create_payment_intent',
  amount: 100,
  customerId: 'cust_123'
});
```

### 2. Real-time Subscriptions
```typescript
// Subscribe to model changes
const subscription = client.models.Message.onCreate({
  filter: { conversationId: { eq: conversationId } }
}).subscribe({
  next: (data) => {
    setMessages(prev => [...prev, data]);
  }
});

// Cleanup
return () => subscription.unsubscribe();
```

### 3. Authentication Patterns
```typescript
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

// Get current user
const user = await getCurrentUser();

// Get auth session with tokens
const session = await fetchAuthSession();
const token = session.tokens?.idToken?.toString();
```

### 4. File Upload Pattern
```typescript
import { uploadData } from 'aws-amplify/storage';

const result = await uploadData({
  key: `profile-images/${userId}/${file.name}`,
  data: file,
  options: {
    accessLevel: 'protected'
  }
});
```

### 5. Error Handling
```typescript
try {
  const result = await client.models.Service.create(serviceData);
  return { success: true, data: result.data };
} catch (error) {
  console.error('Service creation failed:', error);
  return { 
    success: false, 
    error: error.message || 'Unknown error occurred' 
  };
}
```

## Component Patterns

### 1. UI Components (shadcn/ui)
Located in `components/ui/`. Always use existing components:
- `Button`, `Input`, `Card`, `Badge`, `Avatar`
- `Select`, `Checkbox`, `Tabs`, `Toast`
- `LoadingSpinner`, `Skeleton`

### 2. Feature Components Structure
```typescript
// components/[feature]/ComponentName.tsx
'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

interface ComponentProps {
  // Define props
}

export default function ComponentName({ ...props }: ComponentProps) {
  const client = generateClient<Schema>();
  
  // Component logic
  
  return (
    // JSX
  );
}
```

### 3. Page Components (App Router)
```typescript
// app/[route]/page.tsx
import { Metadata } from 'next';
import ComponentName from '@/components/feature/ComponentName';

export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description'
};

export default function PageName() {
  return <ComponentName />;
}
```

## Specific Use Cases & Responses

### When implementing authentication:
- Use Cognito User Pools (configured in `amplify/auth/resource.ts`)
- Reference `hooks/useAuth.ts` for auth state management
- Use `components/auth/` components for auth UI
- Implement role-based access (CUSTOMER, PROVIDER, ADMIN)

### When implementing real-time features:
- Use AppSync subscriptions, not WebSockets
- Subscribe to model changes via `client.models.ModelName.onCreate/onUpdate`
- Handle subscription cleanup in useEffect

### When implementing payments:
- Use Stripe Connect for marketplace payments
- Call `stripeConnect` Lambda function for payment operations
- Handle webhooks via `stripeWebhook` with signature validation
- Reference `lib/stripe-client.ts` for client-side Stripe

### When implementing search:
- Use `searchAll` Lambda function for universal search
- Implement filters via `components/search/FilterSidebar.tsx`
- Use OpenSearch for advanced search capabilities
- Reference `components/search/` for search UI patterns

### When implementing messaging:
- Use `Message` model with real-time subscriptions
- Call `sendMessage` and `getMessages` Lambda functions
- Reference `components/messaging/` for chat UI
- Implement conversation threading via `conversationId`

### When implementing file uploads:
- Use Amplify Storage (S3) via `uploadData`
- Store file keys in database, not full URLs
- Use protected access level for user files
- Reference `components/ImageUploader.tsx`

## Testing Patterns

### E2E Tests (Playwright)
Located in `tests/e2e/`. Test critical user flows:
- Authentication flows
- Booking creation and management
- Payment processing
- Provider onboarding

### Unit Tests (Jest)
Located in `tests/unit/`. Test utility functions and components:
- API utilities
- Type transformations
- Component logic

## Environment & Configuration

### Required Environment Variables
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Development Commands
```bash
npm run dev              # Next.js dev server
npx ampx sandbox         # Amplify backend sandbox
npm run test:e2e         # Playwright tests
npm run lint             # ESLint with TypeScript rules
```

## Code Quality Standards

### TypeScript
- Use strict TypeScript configuration
- Import types from `lib/types.ts`
- Use Schema types from `@/amplify/data/resource`
- Avoid `any` types, use proper interfaces

### React
- Use functional components with hooks
- Implement proper error boundaries
- Use `'use client'` directive for client components
- Handle loading and error states

### Styling
- Use Tailwind CSS classes
- Follow existing design patterns
- Use shadcn/ui components
- Implement responsive design

### Performance
- Use React.memo for expensive components
- Implement proper subscription cleanup
- Use loading states and skeletons
- Optimize images and assets

## Security Considerations

### Authentication
- Always validate user permissions
- Use Cognito tokens for API calls
- Implement proper session management
- Handle token refresh automatically

### Data Access
- Use owner-based authorization
- Validate input data
- Sanitize user content
- Implement rate limiting

### Webhooks
- Validate Stripe webhook signatures
- Use custom authorizers for webhook endpoints
- Implement idempotency for webhook processing
- Log webhook events for debugging

## Common Patterns to Avoid

❌ **Don't use external services without justification**
```typescript
// Wrong
import io from 'socket.io-client';

// Right
const subscription = client.models.Message.onCreate().subscribe();
```

❌ **Don't bypass Amplify for AWS services**
```typescript
// Wrong
import AWS from 'aws-sdk';
const s3 = new AWS.S3();

// Right
import { uploadData } from 'aws-amplify/storage';
```

❌ **Don't hardcode configuration**
```typescript
// Wrong
const API_URL = 'https://api.example.com';

// Right
const config = await fetchAuthSession();
```

## When Suggesting Code

1. **Always check existing patterns** in the codebase first
2. **Use TypeScript interfaces** from `lib/types.ts`
3. **Follow the established file structure**
4. **Include proper error handling**
5. **Add loading states** for async operations
6. **Use existing UI components** from `components/ui/`
7. **Implement proper cleanup** for subscriptions/effects
8. **Follow AWS-native architecture** principles
9. **Include relevant imports** and dependencies
10. **Consider mobile responsiveness** with Tailwind classes

## Priority Order for Suggestions

1. **Use existing code patterns** from the project
2. **Leverage AWS Amplify Gen2** capabilities
3. **Follow established component structure**
4. **Implement proper TypeScript typing**
5. **Add comprehensive error handling**
6. **Include loading and empty states**
7. **Ensure mobile responsiveness**
8. **Add proper accessibility attributes**
9. **Include relevant tests** when appropriate
10. **Document complex logic** with comments

Remember: This is a production marketplace application with real users, payments, and business logic. Always prioritize security, performance, and user experience in your suggestions.