# AppSync Migration Guide: Lambda URL to AppSync Transition

This guide provides comprehensive instructions for migrating from Lambda Function URLs to AWS AppSync GraphQL API integration. This migration is part of the architectural mandate to standardize on AppSync for all Lambda function integrations.

## 🎯 Migration Overview

### Current Architecture Status

**Migration Progress: 1/8 Functions (12.5%)**

| Function | AppSync Status | Feature Flag | Priority | Status |
|----------|---------------|--------------|----------|---------|
| stripe-connect | ✅ **MIGRATED** | `NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT` | P1 | Complete |
| stripe-webhook | 🟡 **IN PROGRESS** | `NEXT_PUBLIC_USE_APPSYNC_STRIPE_WEBHOOK` | P1 | Merge conflicts |
| booking-processor | ❌ **PENDING** | `NEXT_PUBLIC_USE_APPSYNC_BOOKING` | P2 | Not started |
| payout-manager | ❌ **PENDING** | `NEXT_PUBLIC_USE_APPSYNC_PAYOUT` | P3 | Not started |
| refund-processor | ❌ **PENDING** | `NEXT_PUBLIC_USE_APPSYNC_REFUND` | P3 | Not started |
| messaging-handler | ❌ **PENDING** | `NEXT_PUBLIC_USE_APPSYNC_MESSAGING` | P4 | Not started |
| notification-handler | ❌ **PENDING** | `NEXT_PUBLIC_USE_APPSYNC_NOTIFICATION` | P4 | Not started |
| bedrock-ai | ❌ **PENDING** | `NEXT_PUBLIC_USE_APPSYNC_BEDROCK` | P6 | Not started |

### Key Architecture Changes

- **Before**: Lambda Function URLs with direct HTTP endpoints
- **After**: AppSync GraphQL mutations/queries with type-safe resolvers
- **Event Handling**: Lambda receives `AppSyncResolverEvent` instead of HTTP event
- **Authorization**: Cognito User Pool integration with fine-grained permissions
- **Error Handling**: GraphQL errors with structured responses
- **Circuit Breaker**: Resilience layer with automatic fallback to legacy endpoints

## 📋 Prerequisites

Before starting any migration:

1. **Environment Setup**: Ensure `.env.local` is configured with feature flags
2. **Testing Infrastructure**: All migrations must include comprehensive tests
3. **Rollback Plan**: Feature flags enable instant rollback
4. **Monitoring**: CloudWatch dashboards for both architectures

## 🏗️ Migration Pattern

### Step 1: Update Lambda Handler

Convert from HTTP event handler to AppSync resolver handler:

#### Before (Lambda URL Pattern):
```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { action, ...params } = body;
  
  // Process action
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
```

#### After (AppSync Pattern):
```typescript
import { AppSyncResolverHandler } from 'aws-lambda';

export const handler: AppSyncResolverHandler<any, any> = async (event) => {
  // AppSync passes arguments in event.arguments
  const { action, ...params } = event.arguments;
  
  // Process action - return data directly (no HTTP wrapper)
  return result;
};
```

### Step 2: Define GraphQL Schema

Add query/mutation to `/amplify/data/resource.ts`:

```typescript
// Example: Booking processor migration
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
```

### Step 3: Update Amplify Client Wrapper

Add function to `/lib/amplify-client-wrapper.ts`:

```typescript
export async function processBooking(params: {
  action: string;
  bookingId?: string;
  // ... other params
}): Promise<NormalizedResponse> {
  return withCorrelation('booking-processor', async () => {
    const startTime = Date.now();
    
    const mainOperation = async () => {
      if (useNewArchitecture.bookingProcessor) {
        console.log('✅ Using AppSync for Booking Processor');
        const { data, errors } = await client.mutations.processBooking(params);
        
        if (errors) {
          throw new Error(errors[0]?.message || 'Booking processing failed');
        }
        
        return responseNormalizer.normalizeAppSyncResponse(data);
      } else {
        throw new Error('AppSync not enabled, fallback will be used');
      }
    };

    const fallbackOperation = async () => {
      console.warn('⚠️ Circuit breaker triggered, using Lambda URL fallback');
      const response = await fetch(LAMBDA_URLS.bookingProcessor!, {
        method: 'POST',
        headers: correlationTracker.injectIntoHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return responseNormalizer.normalizeLambdaResponse(data);
    };

    try {
      const result = await circuitBreakers.bookingProcessor.execute(
        mainOperation,
        fallbackOperation
      );

      // Track performance metrics
      const duration = Date.now() - startTime;
      performanceTracker.recordMetric('booking-processor', duration, true, 'appsync');
      
      return result;
    } catch (error) {
      // Track failure metrics and rethrow
      const duration = Date.now() - startTime;
      performanceTracker.recordMetric('booking-processor', duration, false, 'appsync');
      throw error;
    }
  });
}
```

### Step 4: Update Feature Flags

Add feature flag to `/lib/feature-flags.ts`:

```typescript
export const useNewArchitecture = {
  // ... existing flags
  bookingProcessor: process.env.NEXT_PUBLIC_USE_APPSYNC_BOOKING === 'true',
  // ... other flags
};
```

### Step 5: Update Frontend Code

Replace direct fetch calls with Amplify wrapper:

#### Before:
```typescript
const response = await fetch('/api/booking', {
  method: 'POST',
  body: JSON.stringify(params)
});
```

#### After:
```typescript
import { processBooking } from '@/lib/amplify-client-wrapper';

const result = await processBooking(params);
```

### Step 6: Create Tests

Create comprehensive test suite covering both architectures:

```typescript
// tests/unit/booking-processor.test.ts
describe('Booking Processor', () => {
  describe('AppSync Architecture', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_USE_APPSYNC_BOOKING = 'true';
    });

    it('should process booking creation via AppSync', async () => {
      // Test AppSync path
    });
  });

  describe('Legacy Lambda URL Architecture', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_USE_APPSYNC_BOOKING = 'false';
    });

    it('should process booking creation via Lambda URL', async () => {
      // Test legacy path
    });
  });
});
```

## 📊 Detailed Function Migration Status

### ✅ stripe-connect (COMPLETED)
- **Status**: Fully migrated to AppSync
- **GraphQL**: `stripeConnect` query in schema
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT`
- **Circuit Breaker**: Implemented with fallback
- **Handler**: Accepts `AppSyncResolverEvent`
- **Tests**: Required (currently missing)

### 🟡 stripe-webhook (IN PROGRESS)
- **Status**: Implementation complete, merge conflicts present
- **GraphQL**: `stripeWebhook` mutation in schema
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_STRIPE_WEBHOOK`
- **Authorization**: Custom Lambda authorizer for signature verification
- **Deduplication**: Atomic webhook processing with DynamoDB
- **Issues**: Git merge conflicts need resolution

### ❌ booking-processor (HIGH PRIORITY)
- **Current**: Lambda URL only
- **Required GraphQL**: `processBooking` mutation (already defined in schema)
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_BOOKING`
- **Handler Update**: Convert to `AppSyncResolverEvent`
- **Business Logic**: Booking creation, cancellation, updates
- **Dependencies**: Stripe Connect, notifications

### ❌ payout-manager (MEDIUM PRIORITY)
- **Current**: Lambda URL only
- **Required GraphQL**: `processPayouts` mutation (already defined)
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_PAYOUT`
- **Business Logic**: Provider payout processing
- **Scheduled Jobs**: EventBridge integration required
- **Dependencies**: Stripe Connect, booking data

### ❌ refund-processor (MEDIUM PRIORITY)
- **Current**: Lambda URL only
- **Required GraphQL**: `processRefund` mutation (already defined)
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_REFUND`
- **Business Logic**: Refund processing with commission logic
- **Dependencies**: Stripe Connect, booking data

### ❌ messaging-handler (LOW PRIORITY)
- **Current**: Lambda URL only
- **Required GraphQL**: `sendMessage` and `getMessages` (already defined)
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_MESSAGING`
- **Business Logic**: In-app messaging, conversation threads
- **Real-time**: AppSync subscriptions opportunity

### ❌ notification-handler (LOW PRIORITY)
- **Current**: Lambda URL only
- **Required GraphQL**: `sendNotification` and `getNotifications` (already defined)
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_NOTIFICATION`
- **Business Logic**: Push notifications, email notifications
- **Real-time**: AppSync subscriptions opportunity

### ❌ bedrock-ai (FUTURE)
- **Current**: Lambda URL only
- **Required GraphQL**: Not yet defined
- **Feature Flag**: `NEXT_PUBLIC_USE_APPSYNC_BEDROCK`
- **Business Logic**: AI-powered features
- **Priority**: Low, can be deferred

## 🔄 Rollback Procedures

### Immediate Rollback (Feature Flag)

For any migrated function, instant rollback is available:

1. **Disable Feature Flag**:
   ```bash
   # Set to 'false' in .env.local or environment
   NEXT_PUBLIC_USE_APPSYNC_[FUNCTION]=false
   ```

2. **Verify Fallback**:
   ```bash
   # Check logs for fallback activation
   npx ampx sandbox logs --function [function-name]
   ```

3. **Monitor Metrics**:
   - Circuit breaker metrics in CloudWatch
   - Performance tracker logs
   - Error rates for both architectures

### Function-Specific Rollback

#### stripe-connect Rollback:
```bash
# Disable AppSync
NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT=false

# Ensure Lambda URL is available
STRIPE_CONNECT_LAMBDA_URL=https://your-function.lambda-url.amazonaws.com/

# Restart application
npm run dev
```

#### booking-processor Rollback (when migrated):
```bash
# Disable AppSync
NEXT_PUBLIC_USE_APPSYNC_BOOKING=false

# Ensure Lambda URL is available
BOOKING_PROCESSOR_LAMBDA_URL=https://your-function.lambda-url.amazonaws.com/

# Clear any cached resolvers
rm -rf .amplify/cache/
npx ampx sandbox clean
```

### Emergency Rollback Checklist

1. ☐ Disable feature flag immediately
2. ☐ Verify Legacy Lambda URLs are functional
3. ☐ Check circuit breaker metrics
4. ☐ Monitor error rates in CloudWatch
5. ☐ Test critical user flows
6. ☐ Document incident and root cause
7. ☐ Plan remediation before re-enabling

## 🚨 Critical Migration Issues

### Current Blockers

1. **Merge Conflicts**: `stripe-webhook` handler has unresolved merge conflicts
2. **Missing Tests**: No test coverage for migrated functions
3. **Lambda URLs Still Active**: Legacy endpoints should be removed post-migration
4. **Mixed Architecture**: Only 12.5% migrated creates inconsistency

### Immediate Actions Required

#### Priority 1: Resolve stripe-webhook Conflicts
```bash
# Resolve merge conflicts in:
# - amplify/functions/stripe-webhook/handler.ts
# - amplify/functions/stripe-webhook/resource.ts
# - amplify/backend.ts
```

#### Priority 2: Test Coverage
```bash
# Create comprehensive test suites:
mkdir -p tests/unit/lambda-functions
mkdir -p tests/unit/resilience
mkdir -p tests/integration/appsync

# Required test files:
# - tests/unit/lambda-functions/stripe-connect.test.ts
# - tests/unit/lambda-functions/stripe-webhook.test.ts
# - tests/unit/resilience/circuit-breaker.test.ts
# - tests/integration/appsync/mutations.test.ts
```

#### Priority 3: Environment Variable Cleanup
```bash
# Remove deprecated Lambda URLs from production:
unset STRIPE_CONNECT_LAMBDA_URL
unset STRIPE_WEBHOOK_LAMBDA_URL
unset BOOKING_PROCESSOR_LAMBDA_URL
unset PAYOUT_MANAGER_LAMBDA_URL
unset REFUND_PROCESSOR_LAMBDA_URL
unset MESSAGING_HANDLER_LAMBDA_URL
unset NOTIFICATION_HANDLER_LAMBDA_URL
```

## 📈 Migration Phases

### Phase 1: Foundation (CURRENT)
- [x] stripe-connect migrated
- [x] Feature flag system implemented
- [x] Circuit breaker with fallback
- [x] Correlation tracking
- [ ] Resolve stripe-webhook conflicts
- [ ] Comprehensive test coverage

### Phase 2: Core Business Logic
- [ ] booking-processor migration
- [ ] E2E testing for booking flows
- [ ] Performance benchmarking
- [ ] Load testing both architectures

### Phase 3: Financial Operations
- [ ] payout-manager migration
- [ ] refund-processor migration
- [ ] Financial flow testing
- [ ] Audit trail verification

### Phase 4: Communication Systems
- [ ] messaging-handler migration
- [ ] notification-handler migration
- [ ] Real-time subscriptions evaluation
- [ ] User experience testing

### Phase 5: Cleanup
- [ ] Remove all Lambda URLs from backend.ts
- [ ] Remove legacy environment variables
- [ ] Update documentation
- [ ] Performance analysis report

### Phase 6: Future Enhancements
- [ ] bedrock-ai migration
- [ ] AppSync subscription implementation
- [ ] Advanced GraphQL features
- [ ] Performance optimizations

## 🛡️ Security Considerations

### AppSync Security Features

1. **Cognito Integration**: All mutations require authenticated users
2. **Fine-grained Authorization**: Field-level permissions
3. **Lambda Authorizers**: Custom auth for webhooks (signature validation)
4. **API Key Fallback**: For specific use cases
5. **VTL Resolvers**: Optional server-side validation

### Security Migration Checklist

- [ ] Verify all AppSync mutations have proper authorization
- [ ] Test unauthenticated access is blocked
- [ ] Validate webhook signature verification still works
- [ ] Ensure sensitive data is not exposed in GraphQL errors
- [ ] Audit CloudWatch logs for data leakage

## 📊 Performance Monitoring

### Key Metrics to Track

1. **Latency Comparison**:
   - AppSync mutation response time
   - Lambda URL response time
   - Circuit breaker activation rate

2. **Error Rates**:
   - AppSync errors per function
   - Lambda URL errors per function
   - Fallback success rate

3. **Business Metrics**:
   - Payment success rate (stripe operations)
   - Booking completion rate
   - User experience metrics

### CloudWatch Dashboards

Create separate dashboards for:
- **AppSync Performance**: Mutation latencies, error rates
- **Circuit Breaker Status**: Open/closed state, failure rates
- **Migration Progress**: Feature flag status, usage patterns
- **Business Impact**: Transaction success, user satisfaction

## 🔧 Development Tools

### Local Development Commands

```bash
# Start sandbox with GraphQL introspection
npx ampx sandbox --config-format typescript

# Generate GraphQL types after schema changes
npx ampx generate graphql-client-code --format typescript --out lib/graphql

# Test specific function
npx ampx sandbox logs --function stripe-connect

# Run migration-specific tests
npm test -- --grep "AppSync"
```

### Debugging AppSync Integration

```bash
# Enable detailed logging
LOG_LEVEL=debug npm run dev

# Test GraphQL mutation directly
curl -X POST \
  https://your-appsync-endpoint/graphql \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "mutation processBooking($action: String!) { processBooking(action: $action) }"}'
```

### Circuit Breaker Testing

```bash
# Force circuit breaker to open (for testing)
# Temporarily set feature flag to true but break AppSync endpoint
NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT=true
# Remove authentication to trigger AppSync failures
# Verify fallback to Lambda URL occurs
```

## 📚 References

- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/latest/devguide/)
- [Amplify Gen 2 Documentation](https://docs.amplify.aws/gen2/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [GraphQL Authorization](https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html)

---

**⚠️ IMPORTANT**: This is a living document. Update migration status as functions are completed. All migrations must include comprehensive testing and rollback procedures.

**🔄 Last Updated**: September 2025
**👥 Maintainers**: Development Team
**📧 Questions**: See CLAUDE.md for architectural guidance