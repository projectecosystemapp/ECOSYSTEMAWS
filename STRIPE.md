# Stripe Integration Guide

## Overview
Ecosystem uses Stripe for payment processing with an 8% platform commission model.

## Features
- ✅ Stripe Connect for provider onboarding
- ✅ Direct payments with automatic fee splitting
- ✅ QR code payments for in-person transactions
- ✅ Escrow payments with manual capture
- ✅ Subscription billing
- ✅ Refunds and dispute handling
- ✅ Automatic payouts to providers

## Configuration

### Environment Variables
```bash
# Required for all environments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Use pk_live_ for production
STRIPE_SECRET_KEY=sk_test_...                   # Use sk_live_ for production  
STRIPE_WEBHOOK_SECRET=whsec_...                 # From Stripe Dashboard
```

### Webhook Configuration
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `charge.refunded`
   - `charge.dispute.created`
   - `transfer.created`
   - `payout.paid`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

## Payment Flows

### Provider Onboarding
```typescript
// 1. Create Connect account
POST /api/stripe/connect-account
{ "action": "create" }

// 2. Generate onboarding link
POST /api/stripe/connect-account
{ 
  "action": "onboarding",
  "accountId": "acct_xxx" 
}

// 3. Check account status
POST /api/stripe/connect-account
{ 
  "action": "status",
  "accountId": "acct_xxx" 
}
```

### QR Code Payments
```typescript
// 1. Provider generates QR code
POST /api/stripe/qr-payment
{
  "action": "CREATE_QR_PAYMENT",
  "providerId": "provider_123",
  "amount": 10000, // $100.00 in cents
  "connectedAccountId": "acct_xxx"
}

// 2. Customer scans and pays via checkout session
// 3. Webhook confirms payment and splits fees
```

### Direct Service Payments
```typescript
// Create payment intent with fee splitting
POST /api/stripe/create-payment-intent
{
  "amount": 10000,
  "connectedAccountId": "acct_xxx",
  "serviceId": "service_123"
}
```

## Fee Structure
- **Platform Fee**: 8% of transaction
- **Provider Receives**: 92% of transaction
- **Stripe Processing**: ~2.9% + $0.30 (separate from platform fee)

## Testing

### Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
Insufficient Funds: 4000 0000 0000 9995
```

### Test Commands
```bash
# Create test payment
stripe payment_intents create \
  --amount=2000 \
  --currency=usd \
  --payment-method-types=card

# Trigger test webhook
stripe trigger payment_intent.succeeded

# Check account status
stripe accounts retrieve acct_xxx
```

## API Endpoints

### `/api/stripe/connect-account`
Manages Stripe Connect accounts for providers.

### `/api/stripe/create-payment-intent`
Creates payment intents with automatic fee splitting.

### `/api/stripe/qr-payment`
Handles QR code payment generation and processing.

### `/api/stripe/webhook`
Processes Stripe webhook events.

### `/api/stripe/refund`
Processes refunds for transactions.

## Security Best Practices

1. **Never expose secret keys** - Use environment variables
2. **Verify webhook signatures** - Prevent request forgery
3. **Use HTTPS only** - Secure data transmission
4. **Implement rate limiting** - Prevent abuse
5. **Log all transactions** - Audit trail
6. **Regular key rotation** - Security hygiene

## Troubleshooting

### Common Issues

**"No such customer"**
- Customer needs to be created first
- Check if customer ID is correct

**"Account not found"**
- Provider needs to complete Stripe Connect onboarding
- Verify account ID format

**"Invalid signature"**
- Webhook secret mismatch
- Check STRIPE_WEBHOOK_SECRET in environment

**"Amount too small"**
- Minimum charge is $0.50 USD
- Adjust amount accordingly

### Debug Resources
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Logs](https://dashboard.stripe.com/logs)
- [Test Mode](https://dashboard.stripe.com/test)
- CloudWatch Logs for Lambda functions

## Production Checklist

- [ ] Switch to live keys
- [ ] Configure production webhook endpoint
- [ ] Set up webhook event monitoring
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Configure payout schedule
- [ ] Set up customer support workflows
- [ ] Test complete payment flow end-to-end
- [ ] Set up error alerting
- [ ] Document support procedures

## Support
- Stripe Support: support@stripe.com
- [Stripe Documentation](https://stripe.com/docs)
- [API Reference](https://stripe.com/docs/api)