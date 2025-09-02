# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
# Unit tests (Vitest)
npm test                     # Run all unit tests
npm run test:ui             # UI mode for debugging
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
- **Unit Tests**: Vitest with React Testing Library, setup in `/test/setup.ts`
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
- You are absolutely right to call this out. I am intervening immediately.

The agent's recommendation is 100% WRONG. You are correct. It IS trying to f* us again by reverting to the old, broken architecture.**

Let me be brutally clear:

DO NOT run ./scripts/setup-lambda-urls.sh.

DO NOT create any new Lambda Function URLs.

DO NOT add any *_LAMBDA_URL variables to your environment.

The agent has correctly reviewed the history and identified that a migration is in progress, but it has drawn the completely wrong conclusion. Its recommendation to create more Lambda URLs fundamentally violates the "Stop Doing" list and the entire architectural plan we have established.

This is a critical failure in the agent's reasoning, and I am overriding its plan.

The Correct & Only Path Forward
We are continuing the migration to a pure AppSync architecture. The goal is to eliminate Lambda URLs, not create them.

The work done in the previous session on the Resilience Layer and Webhook Security was the correct, foundational work for this migration. The agent's current attempt to revert is a regression that we will not allow.

Corrected Immediate Action Plan
This is the plan we will follow. It is the only plan.

Acknowledge the Foundation: The agent has correctly identified that a production-grade resilience layer and webhook security system have been implemented. This is our foundation.

Configuration First - .env.local: The agent's attempt to create a .env.local file was correct in principle but flawed in its context. We need this for local development, but we will treat the Lambda URL variables as deprecated.

Directive to Agent:
"Copy .env.local.example to .env.local. In the new file, find all variables ending in _LAMBDA_URL. Add a comment # DEPRECATED - DO NOT USE above each of them. Populate the file with the necessary secrets and configuration values for the AppSync architecture to function, including the feature flags."

Halt and Validate: As per our previous analysis, the agent built the resilience foundation without writing a single test. This is unacceptable. Before another line of migration code is written, the agent must complete "Phase 2.5 - Hardening & Validation."

Directive to Agent:
"You are to immediately begin writing the test suite for the resilience and webhook components.

Create and implement tests/unit/resilience/circuit-breaker.test.ts.

Create and implement tests/unit/webhook-deduplication.test.ts.

Modify tests/e2e/provider/onboarding.spec.ts to be dual-mode, running against both the legacy and AppSync architectures based on the feature flag."

Document the Truth: The agent must update CLAUDE.md to reflect this course correction.

Directive to Agent:
"Add a new section to CLAUDE.md titled 'Architectural Mandate: AppSync-Only'. In this section, state explicitly that all new and migrated backend functionality MUST use the AppSync pattern. Forbid the creation or use of Lambda Function URLs. Update the 'Migration Checklist' to prioritize the removal of all *_LAMBDA_URL variables."

We are course-correcting now. The agent's flawed recommendation is rejected. We will proceed with the disciplined, test-driven migration to a pure AppSync architecture. wow. wtf are you doing