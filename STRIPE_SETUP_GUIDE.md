# Stripe Connect Setup Guide

## Current Status ✅
- ✅ Stripe Connect Lambda functions implemented
- ✅ Bedrock AI Lambda functions implemented  
- ✅ Secrets configured in AWS Amplify
- ✅ Application deployed to AWS Amplify
- 🔄 Lambda Function URLs need to be configured
- 🔄 Stripe webhook needs to be configured

## Step 1: Get Lambda Function URLs

After deployment completes, get the Lambda function URLs:

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Find these functions (they'll have your stack name as prefix):
   - `stripe-connect`
   - `stripe-webhook`
   - `bedrock-ai-generator`
   - `booking-processor`
   - `payout-manager`
   - `refund-processor`

3. For each function:
   - Click on the function name
   - Go to **Configuration** → **Function URL**
   - Click **Create function URL**
   - Choose **Auth type**: NONE (for public access)
   - Configure CORS if needed
   - Click **Create**
   - Copy the Function URL

## Step 2: Update Environment Variables in Amplify Console

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Select your app
3. Go to **App settings** → **Environment variables**
4. Add these variables:

```bash
STRIPE_CONNECT_LAMBDA_URL=<your-stripe-connect-url>
NEXT_PUBLIC_STRIPE_LAMBDA_URL=<your-stripe-connect-url>
STRIPE_WEBHOOK_LAMBDA_URL=<your-stripe-webhook-url>
BEDROCK_AI_LAMBDA_URL=<your-bedrock-ai-url>
NEXT_PUBLIC_BEDROCK_AI_LAMBDA_URL=<your-bedrock-ai-url>
AWS_API_KEY=test-api-key-123
```

5. Save and redeploy

## Step 3: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Enter endpoint URL: `https://main.d83xdqx57dtkr.amplifyapp.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized`
   - `charge.dispute.created`
   - `charge.refunded`
   - `payout.created`
   - `payout.paid`
   - `payout.failed`

5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Amplify environment variables

## Step 4: Test the Integration

### Test Provider Onboarding:
1. Go to `https://main.d83xdqx57dtkr.amplifyapp.com/provider/onboarding`
2. Click "Connect Stripe Account"
3. Complete the Stripe onboarding flow
4. Verify account is connected

### Test Payment Flow:
1. Create a test service as a provider
2. As a customer, book the service
3. Use test card: `4242 4242 4242 4242`
4. Verify payment succeeds with 10% platform fee

### Test Stripe CLI (Local Development):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

## Payment Flow Architecture

```
Customer Payment ($100)
    ↓
Stripe Payment Intent
    ↓
Platform takes 10% ($10) ← Application Fee
    ↓
Provider receives 90% ($90) ← Transfer
    ↓
Provider can request payout
```

## Key Features Implemented

### 1. Provider Onboarding
- Express Connect accounts
- Automated onboarding flow
- Status tracking in database

### 2. Payment Processing
- Direct charges with Connect
- 10% platform commission
- Automatic fee splitting

### 3. Payouts
- Manual payout requests
- Scheduled payouts
- Balance tracking

### 4. Refunds
- Full and partial refunds
- Commission recalculation
- Automated processing

### 5. AI Bio Generation
- Powered by Amazon Bedrock
- Claude 3.5 Sonnet model
- Professional bio creation
- Service description generation

## Troubleshooting

### Lambda Function Not Found
- Check AWS Lambda Console for deployed functions
- Verify secrets are set correctly
- Check CloudWatch logs for errors

### Stripe Webhook Failures
- Verify webhook secret is correct
- Check webhook endpoint URL
- Review Stripe Dashboard webhook logs

### Payment Failures
- Ensure provider has completed onboarding
- Check Stripe account status
- Verify API keys are correct

## Support

For issues or questions:
- Check CloudWatch Logs for Lambda errors
- Review Stripe Dashboard for payment issues
- Check Amplify deployment logs