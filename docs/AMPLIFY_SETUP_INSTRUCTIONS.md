# Amplify Console Setup Instructions

## 🔧 Environment Variables to Add

Go to **AWS Amplify Console** → **Your App** → **App settings** → **Environment variables**

Add these variables:

```
STRIPE_CONNECT_LAMBDA_URL=https://s7qzhri5vsolt25a3z7cbef6fy0dteib.lambda-url.us-east-1.on.aws/
NEXT_PUBLIC_STRIPE_LAMBDA_URL=https://s7qzhri5vsolt25a3z7cbef6fy0dteib.lambda-url.us-east-1.on.aws/
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RxWCID905P0bnNcQc985pyBmuLFRbouYDLFadXXaPpK3ECsCuHrzew8T1D0Lpkh8VblNLzEVGUfuTWv2HImM7hr00E4ECXRir
STRIPE_SECRET_KEY=sk_test_51RxWCID905P0bnNcybVX55XQBnYcikWljrcbotmAmd9IAkhUSqgVlzqp4eBNrpqagzPRqOvTw8UvnqpqfHbjhp5u00g6WkdVsp
STRIPE_WEBHOOK_SECRET=whsec_c74f92ccb15e1a752b85752c471365d71e7e6e31391960934cd8ebf774e1688b
AWS_API_KEY=test-api-key-123
NEXT_PUBLIC_APP_URL=https://ecosystem-app.com
APP_URL=https://ecosystem-app.com
```

## 🔗 Stripe Webhook Configuration

1. Go to [Stripe Dashboard - Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL**: `https://ecosystem-app.com/api/stripe/webhook`
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized`
   - `charge.refunded`
   - `payout.created`
   - `payout.paid`
   - `payout.failed`

5. After creating, copy the **Signing secret** (starts with `whsec_`)
6. Update the `STRIPE_WEBHOOK_SECRET` environment variable in Amplify

## ✅ What's Working

- **Stripe Connect Lambda**: `https://s7qzhri5vsolt25a3z7cbef6fy0dteib.lambda-url.us-east-1.on.aws/`
  - Account creation
  - Onboarding links
  - Payment processing
  - Refunds
  - Payouts

## 🧪 Test the Integration

### 1. Test Lambda Directly
```bash
curl -X POST https://s7qzhri5vsolt25a3z7cbef6fy0dteib.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'
```

### 2. Test Provider Onboarding
Visit: `https://ecosystem-app.com/provider/onboarding`

### 3. Test Payment Flow
- Use test card: `4242 4242 4242 4242`
- Any future date for expiry
- Any 3-digit CVC

## 📊 Monitoring

- **CloudWatch Logs**: Check Lambda execution logs
- **Stripe Dashboard**: Monitor payment events at dashboard.stripe.com
- **Amplify Console**: View deployment logs

## 🚨 Troubleshooting

### If Stripe Connect doesn't work:
1. Verify environment variables are set in Amplify Console
2. Check CloudWatch logs for the Lambda function
3. Ensure Lambda URL is accessible (test with curl)

### If payments fail:
1. Check Stripe Dashboard for error details
2. Verify webhook is receiving events
3. Check browser console for JavaScript errors

## 📝 Notes

- Currently using Stripe TEST keys (safe for development)
- Lambda function has public access (auth handled at app level)
- 10% platform fee is automatically deducted from payments
- Provider payouts can be triggered manually or scheduled