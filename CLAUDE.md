# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a service marketplace platform built with Next.js 14 (App Router) and AWS Amplify Gen2. The platform will connect service providers with customers across multiple categories (Services, Spaces, Events, Experiences) with an 8-10% commission structure.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Deploy to AWS Amplify (requires AWS credentials)
npx ampx pipeline-deploy --branch [branch-name] --app-id [app-id]
```

## Architecture Overview

### Current Implementation
- **Frontend**: Next.js 14 with App Router, TypeScript, React 18
- **Backend**: AWS Amplify Gen2 backend with:
  - Authentication via Cognito (email-based)
  - GraphQL API via AppSync
  - DynamoDB for data storage
  - Public API key authorization (30-day expiration)

### Planned AWS Architecture

#### Core Services Structure
- **Frontend Layer**: AWS Amplify hosting, CloudFront CDN, S3 for static assets
- **Authentication**: Amazon Cognito with Groups (Providers/Customers) and IAM roles
- **API Layer**: 
  - API Gateway (REST + WebSocket) for complex business logic
  - AppSync for simple CRUD operations (hybrid approach)
  - Lambda functions with Provisioned Concurrency for latency-sensitive operations
- **Database**: 
  - RDS PostgreSQL (primary relational data)
  - DynamoDB (transaction logs, audit trails)
  - ElastiCache Redis (caching)
- **Real-time**: 
  - API Gateway WebSocket APIs for messaging
  - AWS IoT Core for future scaling (10k+ concurrent connections)
  - SNS/SQS for asynchronous notifications
- **Payments**: Stripe Connect integration via Lambda (8-10% commission)
- **Location**: Amazon Location Service for maps/geocoding
- **Search**: Amazon OpenSearch for advanced service/provider search
- **Observability**: CloudWatch Logs, X-Ray for distributed tracing

#### Key Features to Implement
1. **Booking System**: Real-time calendar with WebSocket updates
2. **Commission Processing**: Automated 8% commission via Stripe webhooks
3. **Multi-category Support**: Services, Spaces, Events, Experiences
4. **Provider Profiles**: Verification system with 5-star reviews
5. **Real-time Messaging**: In-app chat between providers and customers
6. **Location Services**: Provider matching based on proximity

## Project Structure

```
/
├── amplify/              # AWS Amplify backend configuration
│   ├── auth/            # Cognito authentication setup
│   ├── data/            # GraphQL schema and data models
│   └── backend.ts       # Backend resource definitions
├── app/                 # Next.js App Router pages
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page (currently Todo demo)
├── public/              # Static assets
└── amplify_outputs.json # Generated Amplify configuration (gitignored)
```

## Data Models

Current schema uses a simple Todo model. This needs to be replaced with:
- User profiles (providers/customers)
- Service listings
- Bookings
- Reviews
- Transactions
- Messages

## Implementation Roadmap

**Phase 1: Foundation (Current)**
- ✅ AWS Amplify setup
- ✅ Next.js application structure
- ✅ Basic authentication configuration
- 🔄 Replace Todo model with marketplace data models

**Phase 2: Core Features**
- User registration with role selection (provider/customer)
- Service listing creation and management
- Search and filter functionality
- Booking system implementation

**Phase 3: Advanced Features**
- Stripe Connect integration
- Real-time messaging system
- Review and rating system
- Location-based services

**Phase 4: Scale & Optimize**
- Performance optimization
- Security hardening
- Analytics implementation
- Multi-region deployment

## Key Considerations

### Authentication Flow
- Current: Email-based authentication only
- Required: Add social logins, phone verification for providers
- **Cognito Groups**: Create 'Providers' and 'Customers' groups with distinct IAM roles
- JWT tokens will include group membership for role-based access control

### Data Architecture
- Transition from simple DynamoDB to RDS PostgreSQL for relational data
- Keep DynamoDB for high-velocity transaction logs
- Implement proper data partitioning for multi-tenancy
- **GraphQL Schema Design**:
  - Use @manyToMany for Service-Category relationships
  - Define indexes on frequently queried fields (providerId, status, location)
  - Consider using AppSync for simple CRUD, API Gateway for complex operations

### Lambda Configuration
- **VPC Considerations**: Lambda functions in VPC will have longer cold starts
- Use Provisioned Concurrency for payment processing and other latency-sensitive functions
- Configure NAT Gateways for Lambda functions needing external API access (Stripe)
- Apply IAM Least Privilege principle - each function gets minimal required permissions

### Payment Integration
- Stripe Connect for marketplace payments
- Implement split payments (92% to provider, 8% platform fee)
- Store sensitive keys in AWS Secrets Manager
- Webhook processing with idempotency checks

### Real-time Features
- WebSocket connections for live updates
- Implement connection pooling and rate limiting
- Use SQS for reliable message delivery
- Consider AWS IoT Core for scaling beyond 10k concurrent connections

## Testing Approach
- Unit tests for Lambda functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Load testing before production launch

## Security Requirements
- **API Protection**: Enable WAF for API Gateway with rate limiting
- **Network Security**: Use VPC for database isolation with proper security groups
- **IAM**: Implement Least Privilege principle, use IAM Access Analyzer
- **Input Validation**: Use Zod/Yup for all API inputs to prevent injection attacks
- **Dependency Management**: 
  - Automated scanning with npm audit, Dependabot, or Snyk
  - Regular dependency updates in CI/CD pipeline
- **Monitoring & Compliance**:
  - CloudTrail for audit logging
  - GuardDuty for threat detection
  - Structured JSON logging in Lambda functions
  - CloudWatch alarms for unusual activity (4xx/5xx spikes)
  - X-Ray for request tracing and performance monitoring
- **Secrets Management**: AWS Secrets Manager for all API keys and credentials