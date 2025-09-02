# Deployment Configuration

## Stripe Webhook URL

Configure your Stripe webhook endpoint to:

```
https://your-domain.com/api/stripe/webhook
```

## Environment Variables Needed

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## What Changed

- Removed duplicate Lambda functions
- All API logic now handled by Next.js routes in `/app/api/`
- No more manual Lambda URL configuration needed
- Simplified architecture: Amplify handles auth/data/storage, Next.js handles API
