# Service Marketplace Platform

A production-ready marketplace platform connecting service providers with customers, built on Next.js 14 and AWS Amplify Gen2.

## Overview

This platform enables service providers to offer their services across multiple categories (Services, Spaces, Events, Experiences) while customers can discover, book, and pay for services with an integrated 8-10% commission structure. Built with enterprise-grade AWS infrastructure for scalability, security, and performance.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, Shadcn/UI
- **Backend**: AWS Amplify Gen2, AppSync GraphQL, Cognito, DynamoDB, Lambda
- **Payments**: Stripe Connect for marketplace transactions
- **Infrastructure**: CloudFront CDN, S3, API Gateway, Step Functions

## Features

- **🔐 Authentication**: Multi-role authentication via Amazon Cognito (Providers, Customers, Admins)
- **📊 GraphQL API**: Type-safe data operations with AWS AppSync
- **💾 Real-time Database**: DynamoDB with live subscriptions
- **💳 Payment Processing**: Stripe Connect with automated commission splitting
- **📅 Booking System**: Real-time availability and scheduling
- **⭐ Reviews & Ratings**: Trust-building through verified customer feedback
- **📍 Location Services**: Proximity-based provider matching
- **💬 Messaging**: In-app communication between providers and customers

## Quick Start

```bash
# Install dependencies
npm install

# Configure AWS credentials
aws configure

# Start development server with AWS sandbox
npm run dev

# In another terminal, start the AWS sandbox
npx ampx sandbox

# Build for production
npm run build

# Run tests
npm run test
```

## Project Structure

```
/
├── amplify/              # AWS Amplify backend configuration
│   ├── auth/            # Cognito authentication setup
│   ├── data/            # GraphQL schema and resolvers
│   ├── functions/       # Lambda functions
│   └── backend.ts       # Backend resource definitions
├── app/                 # Next.js App Router pages
│   ├── admin/          # Admin dashboard
│   ├── auth/           # Authentication flows
│   ├── customer/       # Customer portal
│   ├── provider/       # Provider dashboard
│   └── services/       # Service listings
├── components/          # Reusable React components
│   ├── ui/             # Shadcn/UI components
│   ├── forms/          # Form components
│   └── marketplace/    # Business logic components
├── lib/                # Utilities and helpers
├── hooks/              # Custom React hooks
└── test/               # Test suites
```

## 🤖 AI-Assisted Development Workflow

This project leverages Model Context Protocol (MCP) servers to enhance development productivity and maintain code quality. MCP servers are configured helper tools that provide AI assistants with specialized capabilities for various development tasks.

### Available MCP Servers

1. **Playwright** - Automated E2E testing for critical user flows (bookings, payments, onboarding)
2. **Deepwiki** - Real-time AWS and framework documentation fetching
3. **MarkItDown** - Convert external resources to clean Markdown documentation
4. **Context7** - Instant library/framework command references and best practices
5. **Memory** - Persistent project knowledge graph for architectural decisions and patterns
6. **Sequential-Thinking** - Complex problem decomposition and step-by-step planning
7. **Stripe** - Secure Stripe Connect API interaction for payment development

### Practical Usage Examples

```bash
# Fetch AWS Amplify Gen2 data modeling best practices
deepwiki fetch "AWS Amplify Gen2 data modeling"

# Get Next.js 14 App Router patterns
context7 "Next.js 14 App Router parallel routes"

# Plan a complex feature implementation
sequential-thinking "Implement provider availability calendar with booking conflicts"

# Query project-specific patterns
memory search "payment processing implementation"

# Generate E2E test for booking flow
playwright generate "customer books service with provider"

# Convert Stripe documentation to project docs
markitdown "https://docs.stripe.com/connect/onboarding"

# Test Stripe Connect onboarding
stripe create_account --type=express --country=US
```

### Development Workflows

#### 🚀 New Feature Development
1. Use `sequential-thinking` to create implementation plan
2. Query `memory` for existing patterns
3. Fetch documentation with `deepwiki` or `context7`
4. Implement feature following project conventions
5. Generate tests with `playwright`
6. Update `memory` with new patterns

#### 🐛 Bug Investigation
1. Query `memory` for component history
2. Use `sequential-thinking` for debugging strategy
3. Check documentation with `context7`
4. Implement fix with tests
5. Document resolution in `memory`

#### 📚 Documentation Updates
1. Use `markitdown` to import external resources
2. Query `memory` for architectural decisions
3. Use `deepwiki` for AWS service details
4. Maintain consistency with existing docs

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npx ampx sandbox         # Start AWS Amplify sandbox

# Testing
npm run test            # Run unit tests
npm run test:coverage   # Generate coverage report
npm run test:ui         # Open Vitest UI

# Production
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# AWS Deployment
npx ampx pipeline-deploy --branch [branch-name] --app-id [app-id]
```

## Environment Variables

Create a `.env.local` file:

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

## Testing Strategy

- **Unit Tests**: Components and utilities with Vitest
- **Integration Tests**: API endpoints and data flows
- **E2E Tests**: Critical user journeys with Playwright
- **Load Testing**: AWS performance benchmarks

## Deployment

### AWS Amplify Hosting

```bash
# Initialize Amplify app
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID

# Deploy updates
git push origin main
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Stripe webhook endpoints verified
- [ ] Cognito user pools configured
- [ ] CloudFront distribution optimized
- [ ] Database indexes created
- [ ] Security groups reviewed
- [ ] IAM roles following least privilege
- [ ] Monitoring and alerts configured

## Security

- JWT-based authentication with Cognito
- API Gateway rate limiting and WAF
- Input validation with Zod schemas
- Encrypted data at rest and in transit
- Regular dependency audits
- AWS Secrets Manager for sensitive data

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and code standards.

## License

MIT-0 License - See [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Check [AI_PROTOCOL.md](AI_PROTOCOL.md) for AI-assisted development guidelines
- Review [CLAUDE.md](CLAUDE.md) for project-specific AI instructions
- Open an issue for bugs or feature requests

---

Built with ❤️ using Next.js, AWS Amplify, and AI-assisted development