# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Service marketplace platform connecting providers with customers across multiple categories (Services, Spaces, Events, Experiences) with 8-10% commission structure. Built with Next.js 14 (App Router), TypeScript, and AWS Amplify Gen2.

## Development Commands

```bash
# Development
npm run dev                  # Start Next.js dev server (port 3000)
npx ampx sandbox            # Start AWS Amplify sandbox (run in separate terminal)

# Testing
npm run test                # Run Vitest unit tests
npm run test:ui             # Open Vitest UI for interactive testing
npm run test:coverage       # Generate test coverage report

# Production
npm run build               # Build for production
npm run start               # Start production server
npm run lint                # Run ESLint

# AWS Deployment
npx ampx sandbox            # Local development with AWS sandbox
npx ampx pipeline-deploy --branch [branch-name] --app-id [app-id]  # Deploy to AWS
```

## High-level Architecture

### Frontend Architecture
- **Next.js 14 App Router** with TypeScript, React 18
- **Route Structure**:
  - `/app/auth/*` - Authentication flows (login, register, signout)
  - `/app/provider/*` - Provider dashboard and service management
  - `/app/admin/*` - Admin dashboard for platform management
  - `/app/bookings/*` - Booking flows and payment processing
  - `/app/messages/*` - In-app messaging system
- **UI Components**: Shadcn/UI components in `/components/ui/`
- **State Management**: React hooks with AWS Amplify data stores
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture (AWS Amplify Gen2)
- **Authentication**: Amazon Cognito with email-based auth and user groups (Providers, Customers, Admins)
- **Data Layer**: `/amplify/data/resource.ts` defines comprehensive GraphQL schema with:
  - UserProfile, Service, Booking, Review, Transaction models
  - Real-time subscriptions for live updates
  - Public API key (30-day expiry) + UserPool auth modes
- **Functions**: Lambda functions in `/amplify/functions/` (e.g., stripe-connect)
- **Auth Triggers**: Pre-signup and post-confirmation hooks in `/amplify/auth/`

### Key API Integration Points
- **Service API** (`/lib/api.ts`): CRUD operations for services, bookings, reviews
- **Data Mappers** (`/lib/api/mappers.ts`): Transform between frontend/backend types
- **Stripe Integration**: Payment processing with Stripe Connect (8% commission)
- **Type Definitions** (`/lib/types.ts`): Comprehensive TypeScript interfaces

### Testing Strategy
- **Vitest Configuration** (`/vitest.config.ts`): Happy-DOM environment with React Testing Library
- **Test Structure**: `/test/` directory with setup files
- **Path Aliases**: `@/lib`, `@/components`, `@/app`, `@/amplify`

## Current Implementation Status

### ✅ Completed Features
- Provider dashboard with service management (`/app/provider/*`)
- Admin interfaces for users, services, bookings, analytics
- Authentication system with Cognito integration
- Comprehensive data models with relationships
- Service CRUD operations with validation
- Basic booking system structure

### 🔄 In Progress
- Payment integration with Stripe Connect
- Real-time messaging implementation
- Review and rating system
- Location-based service matching

### Data Model Highlights
The GraphQL schema (`/amplify/data/resource.ts`) includes:
- **UserProfile**: Multi-role support (CUSTOMER, PROVIDER, BOTH, ADMIN) with verification
- **Service**: Flexible pricing models, availability schedules, location types
- **Booking**: Complete workflow from PENDING to COMPLETED with escrow support
- **Transaction**: Payment tracking with platform fee calculations
- **Review**: Two-way review system between customers and providers
- **Message**: Real-time chat with conversation threading
- **Dispute**: Conflict resolution workflow

## Security & Performance Considerations

- **Authentication**: All provider/admin routes require Cognito authentication
- **Authorization**: GraphQL resolvers enforce owner-based and group-based access
- **Validation**: Zod schemas for form validation, server-side validation in Lambda
- **Commission**: 8% platform fee automatically calculated in transactions
- **Error Handling**: Comprehensive try-catch blocks with user-friendly error messages
- **TypeScript**: Strict typing throughout for compile-time safety

## Environment Variables Required

```env
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## AWS Infrastructure Notes

- **Cognito Groups**: Create 'Providers', 'Customers', 'Admins' groups with IAM roles
- **API Gateway**: Use for complex business logic beyond AppSync capabilities
- **Lambda VPC**: Consider cold start implications for payment processing functions
- **DynamoDB Indexes**: Configure GSIs for providerId, status, location queries
- **CloudWatch**: Set up alarms for 4xx/5xx error rate monitoring
- **Secrets Manager**: Store all sensitive keys (Stripe, third-party APIs)