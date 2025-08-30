# Stripe Configuration Guide

## ✅ Stripe CLI Setup Complete

Your Stripe account is now fully configured with the Ecosystem platform:

- **Account ID**: `acct_1RxWCID905P0bnNc`
- **Account Name**: ECOSYSTEM GLOBAL SOLUTIONS INCORPORATED
- **Mode**: LIVE (Production Ready)

## 🔐 Security Configuration

### Live Keys (Currently Active)
- **Publishable Key**: `pk_live_51RxWCDDx...` (Public - Safe to expose)
- **Secret Key**: `sk_live_51RxWCDDx...` (NEVER expose - Server-side only)
- **Webhook Secret**: `whsec_c74f92cc...` (For webhook verification)

### Important Security Notes:
1. **NEVER commit live keys to Git**
2. **Store keys in environment variables only**
3. **Use AWS Secrets Manager for production**
4. **Rotate keys regularly**

## 🚀 Current Capabilities

### Payment Processing
- ✅ Direct payments
- ✅ Escrow payments (manual capture)
- ✅ QR code payments
- ✅ Stripe Connect for providers
- ✅ 8% platform commission
- ✅ Subscription billing
- ✅ Refunds and disputes

### Webhook Events Configured
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated`
- `charge.dispute.created`
- `transfer.created`
- `payout.paid`
- `customer.subscription.created`
- `invoice.payment_succeeded`

## 📱 QR Payment Flow

1. **Provider generates QR code**:
   ```bash
   POST /api/stripe/qr-payment
   {
     "action": "CREATE_QR_PAYMENT",
     "providerId": "provider_123",
     "amount": 10000, // $100.00 in cents
     "connectedAccountId": "acct_xxx"
   }
   ```

2. **Customer scans and pays**
3. **Webhook confirms payment**
4. **Funds distributed**: 92% to provider, 8% to platform

## 🔄 Testing Payments

### Test Card Numbers (for development)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

### Create Test Payment Intent
```bash
stripe payment_intents create \
  --amount=2000 \
  --currency=usd \
  --payment-method-types=card
```

## 📊 Dashboard Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Payments](https://dashboard.stripe.com/payments)
- [Connected Accounts](https://dashboard.stripe.com/connect/accounts/overview)
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [API Keys](https://dashboard.stripe.com/apikeys)

## 🚨 Production Checklist

Before going live:
- [ ] Set up production webhook endpoint
- [ ] Configure webhook signing secret
- [ ] Enable all required webhook events
- [ ] Test payment flows end-to-end
- [ ] Set up error monitoring
- [ ] Configure fraud prevention rules
- [ ] Review Stripe Radar settings
- [ ] Set up customer support workflows

## 📝 Webhook Endpoint Configuration

For production, add this webhook endpoint in Stripe Dashboard:
```
https://your-domain.com/api/stripe/webhook
```

Select these events:
- Payment intents: All events
- Accounts: All events
- Charges: `charge.dispute.*`
- Transfers: All events
- Payouts: All events
- Subscriptions: All events
- Invoices: All events

## 🔧 Troubleshooting

### Common Issues:
1. **"No such customer"**: Customer needs to be created first
2. **"Account not found"**: Provider needs Stripe Connect onboarding
3. **"Invalid signature"**: Webhook secret mismatch
4. **"Amount too small"**: Minimum charge is $0.50 USD

### Debug Commands:
```bash
# View recent events
stripe events list --limit 10

# Trigger test webhook
stripe trigger payment_intent.succeeded

# Check account status
stripe accounts retrieve acct_xxx
```

## 📞 Support

- Stripe Support: support@stripe.com
- Documentation: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api

---

**Remember**: Always use test mode for development and thoroughly test before processing real payments!