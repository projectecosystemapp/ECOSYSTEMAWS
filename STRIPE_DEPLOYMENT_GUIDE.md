# Stripe Connect Lambda Deployment Guide

## Overview
This guide covers the deployment and configuration of the Stripe Connect Lambda function for the Ecosystem AWS marketplace platform.

## Deployment Status ✅
- **Lambda Function**: Successfully deployed as `stripe-connect-lambda`
- **API Gateway**: Configured through Amplify backend
- **DynamoDB Access**: Connected to Provider, Booking, and other tables
- **Environment Variables**: Configured using Amplify secrets

## AWS Environment Setup

### 1. Configure Amplify Secrets
Run these commands to set up the required secrets:

```bash
npx ampx sandbox secret set STRIPE_SECRET_KEY
npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET
npx ampx sandbox secret set APP_URL
```

For production deployment:
```bash
npx ampx pipeline deploy --branch main
```

### 2. Environment Variables Required

**Local Development (.env.local):**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**AWS Lambda (via Amplify secrets):**
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook endpoint secret from Stripe
- `APP_URL`: Your production domain (e.g., https://yourdomain.com)

### 3. Stripe Configuration

#### Webhook Endpoints
Configure these endpoints in your Stripe Dashboard:

**Development:**
- URL: `http://localhost:3000/api/stripe/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, `capability.updated`

**Production:**
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events: Same as above

## API Endpoints

### Frontend API Routes (Next.js)
1. **`/app/api/stripe/connect/route.ts`**
   - Handles Stripe Connect account operations
   - Proxies requests to Lambda function
   - Supports development mode with mock responses

2. **`/app/api/stripe/payment/route.ts`**
   - Handles payment intent creation
   - Processes refunds and payouts
   - Validates payment parameters

3. **`/app/api/stripe/webhook/route.ts`**
   - Processes Stripe webhook events
   - Updates booking statuses
   - Handles account status changes

### Lambda Function Endpoints
The Lambda function (`/amplify/functions/stripe-connect/handler.ts`) supports these actions:

- `CREATE_ACCOUNT`: Create a new Stripe Connect account
- `CREATE_ACCOUNT_LINK`: Generate onboarding links
- `CHECK_ACCOUNT_STATUS`: Verify account setup status
- `CREATE_PAYMENT_INTENT`: Process customer payments
- `PROCESS_REFUND`: Handle refund requests
- `CREATE_PAYOUT`: Process provider payouts

## Frontend Integration

### 1. Provider Onboarding
- **File**: `/app/provider/onboarding/page.tsx`
- **Features**: Real Stripe Connect integration, status checking
- **Flow**: Business info → Stripe Connect → Verification → Complete

### 2. Payment Processing
- **File**: `/app/bookings/[id]/payment/page.tsx`
- **Features**: Stripe Elements integration, payment breakdown
- **Components**: Card payment form, payment status tracking

### 3. Provider Dashboard
- **File**: `/app/provider/dashboard/page.tsx`
- **Features**: Stripe account status, dashboard links, earnings view
- **Integration**: Real-time account status, payout information

## Database Schema

### Provider Model
```typescript
Provider: {
  email: string (required)
  firstName?: string
  lastName?: string
  businessName?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  stripeAccountId?: string
  stripeOnboardingComplete: boolean (default: false)
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' (default: 'PENDING')
  active: boolean (default: true)
}
```

## Security Considerations

### 1. Environment Variables
- All Stripe keys are stored as Amplify secrets
- Never commit secrets to version control
- Use different keys for development and production

### 2. Webhook Security
- Webhook signature verification implemented
- CORS headers properly configured
- Error handling prevents information leakage

### 3. API Security
- User authentication required for all operations
- Provider ID validation against authenticated user
- Proper error handling and logging

## Testing

### Development Mode
The system includes development mode support:
- Mock Stripe responses when Lambda URL not configured
- Local API testing without AWS deployment
- Stripe test keys for safe development

### Production Testing
1. Deploy to staging environment
2. Test with Stripe test keys
3. Verify webhook delivery
4. Test payment flows end-to-end

## Monitoring

### CloudWatch Logs
- Lambda function logs available in CloudWatch
- Error tracking and performance monitoring
- API Gateway request/response logging

### Stripe Dashboard
- Monitor payments and account status
- View webhook delivery status
- Track platform fees and payouts

## Common Issues

### 1. Missing Secrets
**Error**: "STRIPE_SECRET_KEY not found"
**Solution**: Configure Amplify secrets using the commands above

### 2. Webhook Verification Failed
**Error**: "Invalid signature"
**Solution**: Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard

### 3. DynamoDB Access Denied
**Error**: "AccessDeniedException"
**Solution**: Ensure Lambda has proper IAM permissions (handled by Amplify)

## Platform Economics

### Commission Structure
- **Platform Fee**: 8% for early adopters (standard 10%)
- **Payment Processing**: Handled by Stripe Connect
- **Automatic Splits**: Platform fee retained, remainder to provider
- **Payout Schedule**: Configurable through Stripe (daily/weekly/monthly)

### Fee Calculation
```typescript
const platformFeeRate = 0.08; // 8%
const platformFee = Math.round(amount * platformFeeRate);
const providerAmount = amount - platformFee;
```

## Deployment Checklist

- [ ] Amplify secrets configured
- [ ] Lambda function deployed
- [ ] Database schema updated with Provider model
- [ ] Stripe webhook endpoints configured
- [ ] Frontend routes tested
- [ ] Payment flow tested
- [ ] Provider onboarding tested
- [ ] Error handling verified
- [ ] Production environment configured

## Next Steps

1. **Test the complete flow**:
   - Provider onboarding → Stripe Connect
   - Service creation → Booking → Payment
   - Webhook handling → Status updates

2. **Production deployment**:
   - Set up production Stripe account
   - Configure production webhook endpoints
   - Deploy to AWS using Amplify pipeline

3. **Additional features**:
   - Provider earnings dashboard
   - Advanced payout controls
   - Payment analytics
   - Customer refund portal