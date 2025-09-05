# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ECOSYSTEMAWS is a Next.js 14 + AWS Amplify Gen2 marketplace with **AWS-native payment processing** that achieves **98% cost reduction** compared to traditional payment processors like Stripe. This is a service marketplace connecting providers with customers, featuring real-time messaging, AI-powered matching, and comprehensive payment infrastructure.

**Key Achievement:**
- **Cost Reduction**: From $3.45 per $100 transaction (Stripe) to $0.30 (AWS native) = **91% savings**
- **Annual Savings**: $46,800+ on $100k monthly volume

## Development Commands

### Core Development
```bash
# Start development environment
npm install                    # Install dependencies
npm run dev                    # Next.js dev server (http://localhost:3000)
npx ampx sandbox               # AWS Amplify backend sandbox (auto-deploys infrastructure)

# Production deployment
npm run build                  # Production build
npm start                      # Start production server
npx ampx pipeline-deploy --branch main --app-id <YOUR_APP_ID>
```

### AWS Payment System Testing
```bash
# AWS-native payment testing
npm run test:payment-processor      # Test KMS card tokenization
npm run test:ach-manager           # Test direct bank transfers
npm run test:pci-compliance        # Validate PCI DSS compliance
npm run test:cost-validation       # Verify 98% cost savings
npm run test:aws-payment-client    # Test AWS payment client

# Payment flow testing
npm run test:payment-flow          # Integration payment tests
npm run test:load                  # Payment load testing
npm run test:aws-payments          # AWS native payment flows
```

### Testing & Quality
```bash
# Unit Testing (Jest)
npm test                      # Run all unit tests
npm run test:ui              # Watch mode for debugging
npm run test:coverage        # Generate coverage report (80% minimum required)
npm run test:watch           # Watch mode for development
npm run test:smoke           # Quick smoke tests

# E2E Testing (Playwright)
npm run test:e2e             # Complete end-to-end test suite
npm run test:e2e:ui          # Interactive UI mode
npm run test:e2e:headed      # Run with browser visible
npm run test:e2e:debug       # Step-through debugging
npm run test:e2e:smoke       # Critical tests only (@critical tag)
npm run test:e2e:codegen     # Generate test code from browser actions

# Specific E2E test suites
npm run test:e2e:auth               # Authentication flows
npm run test:e2e:payments           # Payment tests (@payments tag)
npm run test:e2e:aws-payments       # Native AWS payment integration tests
npm run test:e2e:provider-payments  # Provider payout testing
npm run test:e2e:customer-journey   # Complete customer payment journey
npm run test:e2e:checkout           # Checkout flow tests
npm run test:e2e:booking            # Booking tests (@booking tag)
```

### Code Quality
```bash
# Linting and formatting
npm run lint                 # ESLint with TypeScript strict rules
npm run fix:types            # TypeScript validation without build
npm run build:verify         # Full verification (types + build + smoke tests)

# Pre-commit hooks run automatically via Husky
# - ESLint fixes for JS/TS files
# - Prettier formatting
# - Tests must pass
```

### Single Test Execution
```bash
# Run specific test files
jest lib/aws-payment-client.test.ts                    # Specific unit test
jest amplify/functions/aws-payment-processor/handler.test.ts  # Lambda function test
playwright test tests/e2e/auth/provider-sign-up.spec.ts      # Specific E2E test
playwright test --grep "AWS.*payment|native.*payment"        # Pattern-based E2E tests
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: AWS Amplify Gen2, 29+ Lambda functions
- **Database**: DynamoDB with GraphQL (AppSync)
- **Authentication**: AWS Cognito User Pools
- **Storage**: S3 via Amplify Storage
- **Payments**: AWS-native (Payment Cryptography, KMS, ACH transfers)
- **Testing**: Jest (unit), Playwright (E2E)
- **UI Components**: shadcn/ui with Radix UI primitives

### Project Structure
```
amplify/                     # AWS Amplify Gen2 backend
├── auth/                   # Cognito configuration with triggers
├── data/                   # GraphQL schema & resolvers (29 Lambda integrations)
├── functions/              # Lambda functions (29 functions)
│   ├── aws-payment-processor/     # KMS-based card tokenization
│   ├── ach-transfer-manager/      # Direct bank transfers
│   ├── escrow-manager/           # Automated fund holding & release
│   ├── fraud-detector/           # AWS ML-based fraud prevention
│   ├── cost-monitor/            # Real-time cost tracking
│   ├── booking-processor/       # Service booking with payments
│   ├── payout-manager/         # Direct provider payouts
│   └── refund-processor/       # Instant refunds with cost tracking
├── storage/                # S3 configuration
└── backend.ts             # Main backend configuration

app/                        # Next.js App Router
├── admin/                 # Admin dashboard pages
├── auth/                  # Authentication pages
├── customer/              # Customer-specific pages
├── provider/              # Provider-specific pages
├── services/              # Service-related pages
├── bookings/              # Booking management
├── api/                   # API routes (minimal - mostly for webhooks)
└── layout.tsx             # Root layout

components/                 # React components
├── ui/                    # Reusable UI components (shadcn/ui)
├── admin/                 # Admin-specific components
├── customer/              # Customer-specific components
├── provider/              # Provider-specific components
├── messaging/             # Real-time messaging components
└── search/                # Search & filtering components

lib/                        # Shared utilities & clients
├── amplify-client.ts      # Amplify client configuration
├── amplify-client-wrapper.ts  # Production-grade wrapper with resilience
├── types.ts               # TypeScript type definitions
├── aws-payment-client.ts  # AWS payment processing client
└── utils.ts               # General utilities

tests/                      # Testing infrastructure
├── e2e/                   # Playwright E2E tests
├── unit/                  # Jest unit tests
├── integration/           # API integration tests
├── security/              # Security & PCI compliance tests
├── performance/           # Performance & load tests
└── pages/                 # Page Object Models for E2E tests
```

### AWS-Native Payment Architecture

The system replaces traditional payment processors with AWS-native services:

**Core Payment Components:**
- **AWS Payment Cryptography**: Secure card tokenization and encryption
- **AWS KMS**: Envelope encryption for PCI-compliant card processing
- **Direct ACH Transfers**: Bank-to-bank transfers without third-party fees
- **AWS Fraud Detector**: Real-time ML-based fraud prevention
- **Native Escrow Management**: Automated fund holding and conditional release

**Cost Comparison (per $100 transaction):**
- Traditional (Stripe): $3.20 + $0.25 = $3.45 total fees
- AWS Native: ~$0.05 + $0.25 = $0.30 total fees
- **Savings: 91% reduction per transaction**

### Data Models & Database

**AWS Payment Models (replacing Stripe):**
- `PaymentMethod`: Tokenized payment methods with KMS encryption
- `Transaction`: Payment processing with fraud scores and status tracking  
- `PaymentAccount`: Provider bank accounts for direct payouts
- `EscrowAccount`: Marketplace fund holding with automated release
- `ACHTransfer`: Direct bank transfers with trace numbers
- `FraudEvent`: Fraud detection events and risk scoring

**Core Business Models:**
- `User`, `UserProfile`: User management and authentication
- `Provider`, `ProviderProfile`: Service provider data
- `Service`, `Booking`, `Review`: Core marketplace entities
- `Message`, `Notification`: Real-time messaging and notifications
- `ServiceRequest`, `ServiceOffer`: ISO (In Search Of) matching system
- `Dispute`, `DisputeEvidence`: Dispute resolution workflow

### Lambda Function Integration Pattern

**CRITICAL**: This codebase uses AppSync-based Lambda integration, NOT direct HTTP endpoints.

All Lambda functions are integrated through AppSync custom queries/mutations in `amplify/data/resource.ts`:
- Functions receive `AppSyncResolverEvent` instead of raw HTTP events
- Type-safe integration using generated Schema types
- Authorization rules defined in the GraphQL schema
- Real-time subscriptions available for data changes

**Available Operations (via AppSync):**
```typescript
// AWS Payment Processing
awsPaymentProcessor(action, customerId, amount, paymentMethodId, ...)
achTransferManager(action, providerId, amount, accountId, ...)
escrowManager(action, transactionId, amount, releaseConditions, ...)
fraudDetector(action, transactionId, customerId, deviceInfo, ...)
costMonitor(action, timeRange, providerId, ...)

// Core Business Functions  
bookingProcessor(action, bookingId, serviceId, customerId, ...)
payoutManager(action, providerId, payoutId, amount, ...)
refundProcessor(action, transactionId, bookingId, amount, reason, ...)
messagingHandler(action, senderEmail, recipientEmail, content, ...)
notificationHandler(action, userId, type, title, message, data, ...)
```

### Authentication & Authorization

**Authentication Flow:**
1. User signs up → Cognito creates account
2. Post-confirmation trigger → Creates UserProfile in DynamoDB  
3. Role-based access: CUSTOMER, PROVIDER, ADMIN
4. Frontend uses `@aws-amplify/adapter-nextjs` for server-side auth

**Authorization Patterns:**
- Owner-based: Users can only access their own resources
- Role-based: Admins have broader access, Providers can access customer data for their services
- Custom authorizers: Used for webhook endpoints with signature validation

### Real-time Features

**AppSync Subscriptions** (NOT WebSockets):
- Real-time messaging via `Message` model subscriptions
- Live booking updates via `Booking` model subscriptions
- Payment status updates via `Transaction` model subscriptions
- Notification delivery via `Notification` model subscriptions

### Testing Strategy

**Unit Tests (Jest):**
- 80% minimum coverage requirement (enforced)
- Focus on AWS payment processing logic, utility functions, and API clients
- Mock AWS services for isolated testing

**E2E Tests (Playwright):**
- Critical user journeys: authentication, booking creation, payment processing
- AWS payment flow testing with test payment methods
- Provider onboarding and payout testing
- Mobile responsiveness testing across devices

**Load Testing:**
- Payment processing performance under load
- AWS cost optimization validation
- Real-time messaging scalability

### Environment Setup

**Required Environment Variables:**
```bash
# Core Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AWS_REGION=us-west-2

# AWS Payment System (automatically configured by Amplify)
KMS_KEY_ID=alias/ecosystemaws-payment-key
AWS_FRAUD_DETECTOR_NAME=ecosystemaws-fraud-detector

# Optional: Custom KMS configuration
PAYMENT_ENCRYPTION_KEY_ALIAS=payment-encryption-key
ACH_PROCESSING_ENDPOINT=your-ach-processor
FRAUD_DETECTOR_THRESHOLD=500
```

**Development Setup:**
1. Ensure Node 20.x (use `.nvmrc`) and npm 10+
2. Configure AWS credentials: `aws configure`
3. Copy `.env.local.example` to `.env.local`
4. Install dependencies: `npm install`
5. Start development: `npm run dev` + `npx ampx sandbox`

### Key Implementation Patterns

**Amplify Client Usage:**
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// Query pattern
const { data: services } = await client.models.Service.list();

// Lambda function call
const result = await client.queries.awsPaymentProcessor({
  action: 'tokenize_card',
  customerId: 'customer_123',
  cardData: encryptedCardData
});
```

**Real-time Subscriptions:**
```typescript
const subscription = client.models.Message.onCreate({
  filter: { conversationId: { eq: conversationId } }
}).subscribe({
  next: (data) => setMessages(prev => [...prev, data])
});
```

**Error Handling & Resilience:**
The `lib/amplify-client-wrapper.ts` implements production-grade patterns:
- Circuit breaker protection against cascading failures
- Correlation tracking for distributed tracing  
- Response time monitoring and performance metrics
- Automatic fallback and recovery mechanisms

### Security & Compliance

**Payment Security:**
- AWS KMS envelope encryption for all card data
- PCI DSS compliance through AWS Payment Cryptography
- No raw card data stored - only tokenized references
- End-to-end encryption for all payment operations

**Access Control:**
- Cognito-based authentication with JWT tokens
- Resource-level authorization via AppSync
- API-level rate limiting and input validation
- Webhook signature verification for external integrations

### Cost Optimization

**AWS Native Benefits:**
- **91% reduction** in payment processing fees
- Direct ACH transfers eliminate third-party payout fees
- Batch processing optimization reduces transaction costs
- Real-time cost monitoring and savings analytics

**Infrastructure Deployed:**
- 29 Lambda Functions for payment and business logic processing
- DynamoDB Tables for payment data and audit logs
- KMS Keys for PCI-compliant card encryption
- CloudWatch Dashboards for monitoring cost savings
- SNS Topics for payment notifications
- IAM Roles with least-privilege access

This architecture enables a complete marketplace platform with enterprise-grade payment processing at a fraction of traditional costs while maintaining security, compliance, and scalability.
