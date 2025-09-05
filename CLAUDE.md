# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: AWS NATIVE PAYMENT MIGRATION MANDATE

**IMMEDIATE ACTION REQUIRED**: This codebase is undergoing a complete migration from Stripe to AWS-native payment processing. ALL Stripe dependencies, functions, and references MUST be removed and replaced with AWS Payment Cryptography, ACH processing, and native escrow management.

### Migration Priority Actions
1. **DELETE ALL STRIPE**: Remove all Stripe packages, functions, API routes, and environment variables
2. **CREATE AWS PAYMENT SYSTEM**: Implement AWS Payment Cryptography for card processing
3. **ENABLE DIRECT PAYOUTS**: Use ACH/Wire transfers for provider payments (no Stripe Connect)
4. **BUILD ESCROW MANAGEMENT**: AWS-native funds holding and release
5. **COST REDUCTION**: Achieve 98%+ reduction in payment processing fees

### Agent Orchestration System Available

This project includes specialized AWS agents for parallel execution. Use these commands:

```bash
# Initialize agent system (run once)
./aws-agent-orchestrator.sh init

# Run full payment migration
./aws-agent-orchestrator.sh run migration StripeToAWSNative

# Deploy payment infrastructure
./aws-agent-orchestrator.sh run full-stack-app AWSPaymentSystem

# Check migration status
./aws-agent-orchestrator.sh status
```

### Available Specialized Agents
- **aws-architect**: Design AWS-native payment architecture
- **aws-migration**: Migrate from Stripe to AWS payments
- **aws-security**: Secure payment processing with AWS Payment Cryptography
- **aws-amplify**: Update schema and create new models
- **aws-cicd**: Deploy payment infrastructure
- **aws-cost-optimizer**: Optimize payment processing costs

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Development server (runs on http://localhost:3000)
npm run dev

# Run Amplify sandbox for backend development
npx ampx sandbox

# Build for production
npm run build

# Start production server
npm start
```

### Linting and Type Checking
```bash
# Run ESLint with type-aware rules
npm run lint

# Type check without emitting (quick type validation)
npm run fix:types

# Full build verification (types + build + smoke tests)
npm run build:verify
```

### Testing Commands
```bash
# Unit tests (Jest)
npm test                     # Run all unit tests
npm run test:ui             # Watch mode for debugging
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode for development
npm run test:smoke          # Quick smoke tests only

# E2E tests (Playwright)
npm run test:e2e            # Run all E2E tests
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:headed     # Run with browser visible
npm run test:e2e:debug      # Step-through debugging
npm run test:e2e:smoke      # Critical tests only (@critical tag)

# Specific E2E test suites
npm run test:e2e:auth               # Authentication flows
npm run test:e2e:provider-signup    # Provider signup flow
npm run test:e2e:checkout           # Checkout flow
npm run test:e2e:payments           # Payment tests (@payments tag)
npm run test:e2e:booking            # Booking tests (@booking tag)
npm run test:e2e:report             # View HTML test report

# Generate E2E test code from browser actions
npm run test:e2e:codegen
```

### Deployment
```bash
# Deploy to Amplify (requires AWS credentials)
npx ampx pipeline-deploy --branch main --app-id <YOUR_APP_ID>
```

## Architectural Mandate: AppSync-Only

**CRITICAL**: All new and migrated backend functionality MUST use the AppSync pattern. The creation or use of Lambda Function URLs is strictly FORBIDDEN.

### Prohibited Practices
- ❌ NEVER create Lambda Function URLs
- ❌ NEVER add *_LAMBDA_URL environment variables
- ❌ NEVER use direct Lambda invocation from frontend
- ❌ NEVER run scripts/setup-lambda-urls.sh or similar scripts

### Required Practices
- ✅ ALWAYS use AppSync mutations/queries for Lambda integration
- ✅ ALWAYS use the amplify-client-wrapper for API calls
- ✅ ALWAYS implement feature flags for gradual migration
- ✅ ALWAYS write tests for both legacy and new architectures during migration

## Architecture Overview

### Application Structure
This is a Next.js 14 marketplace application with AWS Amplify Gen 2 backend, implementing a service booking platform with integrated Stripe payments.

### Key Architectural Components

#### Frontend (Next.js App Router)
- **Route Groups**: `/admin`, `/auth`, `/customer`, `/provider`, `/services`, `/bookings`
- **API Routes**: Located in `/app/api/` for Stripe webhooks and server-side operations
- **Components**: Modular UI components in `/components/ui/` and feature components organized by domain

#### Backend (AWS Amplify Gen 2)
- **Authentication**: AWS Cognito with post-confirmation triggers
- **Data Layer**: GraphQL API with DynamoDB, custom queries/mutations for Lambda integration
- **Storage**: S3 bucket for file uploads
- **Functions**: Lambda functions for payment processing and business logic

#### Payment Architecture
The application uses Stripe Connect with an 8% platform commission model:

1. **Stripe Connect Account Creation**: Providers onboard via `/amplify/functions/stripe-connect/`
2. **Payment Processing**: Direct payments with automatic fee splitting
3. **Webhook Processing**: `/amplify/functions/stripe-webhook/` handles Stripe events
4. **Payout Management**: `/amplify/functions/payout-manager/` manages provider payouts
5. **Refund Processing**: `/amplify/functions/refund-processor/` handles refunds with commission logic

#### Lambda Function Integration Pattern
Lambda functions are integrated through AppSync custom queries/mutations in `/amplify/data/resource.ts`:
- Functions receive AppSyncResolverEvent instead of raw HTTP events
- Type-safe integration using generated Schema types
- Authorization rules defined in the schema

## Critical Implementation Details

### Environment Configuration
Required environment variables in `.env.local`:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `STRIPE_SECRET_KEY`: Stripe secret key (server-side only)
- `STRIPE_WEBHOOK_SECRET`: For webhook signature verification
- `NEXT_PUBLIC_APP_URL`: Application URL
- `NEXT_PUBLIC_AWS_REGION`: AWS region

### Lambda URL to AppSync Migration Status
**CRITICAL**: This codebase is migrating from Lambda Function URLs to AppSync-based architecture. ALL new Lambda functions MUST be integrated via AppSync custom queries/mutations in `/amplify/data/resource.ts`. Direct HTTP endpoints are FORBIDDEN.

#### Priority Migration Checklist
- [ ] **PRIORITY 1**: Remove all *_LAMBDA_URL environment variables from production
- [ ] **PRIORITY 2**: Delete all Lambda Function URL creation scripts (scripts/setup-lambda-urls.sh, fix-this-shit.sh)
- [x] stripe-connect - Converted to AppSync mutation (Feature flag: NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT)
- [ ] stripe-webhook - Convert to AppSync mutation  
- [ ] payout-manager - Convert to AppSync mutation
- [ ] refund-processor - Convert to AppSync mutation
- [ ] booking-processor - Convert to AppSync mutation
- [ ] messaging-handler - Already uses Amplify client (partial migration)
- [ ] notification-handler - Convert to AppSync mutation
- [ ] profile-events - Convert to AppSync mutation
- [ ] bedrock-ai - Convert to AppSync mutation
- [ ] webhook-authorizer - Custom auth (already integrated)
- [ ] webhook-reconciliation - Convert to AppSync mutation
- [ ] workflow-orchestrator - Convert to AppSync mutation
- [ ] search-indexer - Convert to AppSync mutation
- [ ] bio-generator - Convert to AppSync mutation
- [ ] iso-matcher - Convert to AppSync mutation
- [ ] realtime-messaging - Convert to AppSync mutation
- [ ] dispute-workflow - Convert to AppSync mutation
- [ ] enhanced-search - Convert to AppSync mutation
- [ ] opensearch-sync - Convert to AppSync mutation
- [ ] Remove all Lambda Function URLs from backend.ts
- [ ] Update all frontend fetch calls to use Amplify client wrapper
- [ ] Enable all AppSync feature flags by default
- [ ] Remove legacy Lambda URL code paths

### Authentication Flow
1. User signs up → Cognito creates account
2. Post-confirmation trigger → Creates UserProfile in DynamoDB
3. Frontend uses `@aws-amplify/adapter-nextjs` for server-side auth
4. Protected routes check authentication via middleware

### Testing Strategy
- **Unit Tests**: Jest with React Testing Library, setup in `/tests/test/setup.ts`
- **Coverage Requirement**: 80% minimum across branches, functions, lines, and statements
- **E2E Tests**: Playwright with Page Object Model pattern in `/tests/pages/`
- **Test Environment**: Configured via `.env.test` (not committed)
- **Global Setup**: `/tests/setup/global-setup.ts` handles test environment initialization

### Stripe Integration Points
1. **Connect Account API**: `/api/stripe/connect/route.ts`
2. **Webhook Handler**: `/api/stripe-webhook/route.ts`
3. **Lambda Functions**: Process payments via AppSync mutations
4. **Frontend Components**: Stripe Elements in checkout flows

### Security Considerations
- All Lambda functions use AWS Secrets Manager for sensitive data
- IAM roles follow least privilege principle
- Stripe webhook signatures verified before processing
- Authentication required for all GraphQL operations except webhooks

### Webhook Security & Deduplication
The system implements comprehensive webhook security:
- **Idempotency**: `ProcessedWebhook` model prevents duplicate webhook processing
- **Event Tracking**: All webhook events stored with `eventId`, `processedAt`, and `result`
- **Custom Authorization**: Webhook endpoints use custom authorizers for security
- **Signature Verification**: Stripe webhook signatures validated before processing
- **Deduplication Logic**: Located in `amplify/data/webhook-deduplication.ts`

### Feature Flag System
The application uses feature flags to safely migrate from Lambda URLs to AppSync:

```typescript
// lib/feature-flags.ts controls the migration
export const useNewArchitecture = {
  stripeConnect: process.env.NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT === 'true',
  bookingProcessor: process.env.NEXT_PUBLIC_USE_APPSYNC_BOOKING === 'true',
  // ... other flags
}
```

To enable new architecture for a service:
1. Set the corresponding environment variable to 'true'
2. The lib/amplify-client-wrapper.ts will automatically route to AppSync
3. To rollback, set the environment variable to 'false'

### Resilience Patterns
The `lib/amplify-client-wrapper.ts` implements production-grade resilience patterns:

#### Circuit Breaker Protection
- **Automatic Fallback**: Circuit breakers protect against cascading failures
- **Service-Specific Configuration**: Each Lambda function has tailored circuit breaker settings
- **Recovery Monitoring**: Automatic recovery detection and health checks
- **Volume-Based Triggering**: Circuit opens only after minimum request volume

#### Correlation Tracking
- **Distributed Tracing**: Correlation IDs track requests across services
- **Request Correlation**: Every API call tagged with unique correlation identifier
- **Debugging Support**: Correlation IDs in logs for issue investigation

#### Performance Monitoring
- **Response Time Tracking**: All API calls monitored for performance metrics
- **Latency Analysis**: Built-in performance data collection
- **Health Metrics**: Service health monitoring and alerting

#### Response Normalization
- **Consistent Format**: All API responses normalized to standard format
- **Error Handling**: Unified error response structure
- **Type Safety**: TypeScript interfaces for all normalized responses

## Common Development Tasks

### Adding a New Lambda Function (AppSync Pattern - Recommended)
1. Create function in `/amplify/functions/<function-name>/`
2. Define resource in `/amplify/functions/<function-name>/resource.ts`
3. Add to `/amplify/backend.ts`
4. Create AppSync query/mutation in `/amplify/data/resource.ts`
5. Add to lib/amplify-client-wrapper.ts with feature flag support
6. Use the wrapper in frontend: `import { yourOperation } from '@/lib/amplify-client-wrapper'`

**IMPORTANT**: Never create Lambda Function URLs. Always use AppSync integration.

### Modifying GraphQL Schema
1. Edit `/amplify/data/resource.ts`
2. Run `npx ampx sandbox` to test locally
3. Generated types automatically update in frontend

### Running E2E Tests Locally
1. Copy `.env.test.example` to `.env.test`
2. Configure test environment variables
3. Start dev server: `npm run dev`
4. Run tests: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npm run test:e2e`

### Test Configuration Details
- **Jest Configuration**: Located in `jest.config.js` with Next.js integration
- **Test Patterns**: `**/*.test.{ts,tsx}` in project root, `/tests/unit/`, and `/lib/`
- **Setup File**: `/tests/test/setup.ts` configures test environment
- **Module Mapping**: `@/` alias resolves to project root
- **Coverage Thresholds**: 80% minimum for branches, functions, lines, and statements
- **Ignored Paths**: `.next/`, `node_modules/`, `tests/e2e/`, `amplify/`
- **Environment**: `jest-environment-jsdom` for React component testing

### Debugging Payment Flows
1. Use Stripe test cards (4242 4242 4242 4242)
2. Monitor Stripe Dashboard logs
3. Check CloudWatch logs for Lambda functions
4. Verify webhook signatures in `/api/stripe-webhook/route.ts`

### Managing Secrets in Amplify
```bash
# Add a secret to sandbox
npx ampx sandbox secret set STRIPE_SECRET_KEY

# List secrets
npx ampx sandbox secret list

# Remove a secret
npx ampx sandbox secret remove STRIPE_SECRET_KEY

# For production
npx ampx secret set STRIPE_SECRET_KEY --branch main
```

### Migration Workflow
When migrating a Lambda function from URL to AppSync:

1. **Update Lambda Handler**: Ensure it accepts AppSyncResolverEvent
2. **Add to Schema**: Define in amplify/data/resource.ts
3. **Create Wrapper**: Add to lib/amplify-client-wrapper.ts with feature flag
4. **Update Frontend**: Replace fetch() calls with wrapper functions
5. **Test with Flag**: Enable feature flag in .env.local
6. **Monitor**: Check CloudWatch logs for errors
7. **Rollback if Needed**: Disable feature flag instantly

### Generate TypeScript Types
```bash
# Generate GraphQL types after schema changes
npx ampx generate graphql-client-code --format typescript --out lib/graphql

# Generate types for Lambda handlers
npx ampx generate types
```

## Code Style and Quality

### ESLint Configuration
- TypeScript strict mode with type-aware rules
- No explicit `any` types allowed
- Security rules enforced (no-eval, no-implied-eval)
- Max complexity: 10, Max depth: 4, Max lines: 300
- Import ordering enforced alphabetically

### Pre-commit Hooks
Husky runs lint-staged on commit:
- ESLint fixes for JS/TS files
- Prettier formatting for all files
- Tests must pass before push

### Component Patterns
- Use `/components/ui/` for reusable UI components
- Feature components organized by domain
- Server components by default in App Router
- Client components marked with 'use client'
