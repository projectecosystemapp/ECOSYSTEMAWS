# AWS Amplify Production Configuration Guide

## 🔐 Production Environment Variables

This document outlines the required environment variables for production deployment on AWS Amplify.

**IMPORTANT**: Production secrets should ONLY be configured in the AWS Amplify Console. They should NEVER be stored in GitHub or committed to the repository.

## Required Production Environment Variables

Configure these in AWS Amplify Console for the `main` branch:

### Stripe Production Keys

```bash
# Stripe Live Keys (PRODUCTION ONLY)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51RxWCDDxTCvsj3BnF7PD1xiH8ERGozM8oNoRWGuWopTIVQ3tzeam7jaDpYDZFcFczKDuH9MQYvw9iiDNbYRdMW7x00dgOGwCs4
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_PRODUCTION_WEBHOOK_SECRET_FROM_STRIPE_DASHBOARD]
```

### AWS Configuration

```bash
# These are typically configured automatically by Amplify
AWS_REGION=us-west-2
```

### Application URLs

```bash
NEXT_PUBLIC_APP_URL=https://[YOUR_PRODUCTION_DOMAIN].com
APP_URL=https://[YOUR_PRODUCTION_DOMAIN].com
```

### Cognito Configuration (Production)

```bash
# Production Cognito User Pool
COGNITO_USER_POOL_ID=us-west-2_[YOUR_PRODUCTION_POOL_ID]
COGNITO_CLIENT_ID=[YOUR_PRODUCTION_CLIENT_ID]
```

## How to Configure in AWS Amplify Console

1. **Navigate to AWS Amplify Console**
   - Go to https://console.aws.amazon.com/amplify/
   - Select your application

2. **Access Environment Variables**
   - Click on "Hosting environments"
   - Select your `main` branch
   - Click on "Environment variables" in the left sidebar

3. **Add Production Variables**
   - Click "Manage variables"
   - Add each variable listed above
   - For sensitive values (keys starting with `sk_`, `whsec_`), ensure they are marked as "Secret"

4. **Save and Redeploy**
   - Click "Save"
   - Trigger a new deployment to apply the changes

## Security Best Practices

### ✅ DO:
- Store production secrets ONLY in AWS Amplify Console
- Use TEST keys for all development and testing
- Mark sensitive values as "Secret" in Amplify Console
- Rotate production keys regularly
- Use different webhook endpoints for test and production

### ❌ DON'T:
- Store production keys in GitHub Secrets
- Commit production keys to the repository
- Use production keys for local development
- Share production keys via email or chat
- Use the same webhook secret for test and production

## Environment Separation

| Environment | Stripe Keys | Storage Location | Access |
|------------|-------------|------------------|--------|
| Local Dev | TEST keys | .env.local (gitignored) | Developers |
| E2E Tests | TEST keys | GitHub Secrets | CI/CD |
| Staging | TEST keys | GitHub Variables | CI/CD |
| Production | LIVE keys | AWS Amplify Console | Production Only |

## Stripe Dashboard Configuration

After setting up the environment variables, configure Stripe:

1. **Production Webhook Endpoint**
   - URL: `https://[YOUR_PRODUCTION_DOMAIN].com/api/stripe/webhook`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated`
     - `account.application.authorized`
     - `account.application.deauthorized`
     - `charge.dispute.created`

2. **Copy the Webhook Signing Secret**
   - After creating the webhook, copy the signing secret
   - Add it as `STRIPE_WEBHOOK_SECRET` in Amplify Console

## Verification

After configuration, verify the setup:

1. Check build logs in Amplify Console for any missing variables
2. Test a payment flow in production (use a test card first)
3. Monitor webhook events in Stripe Dashboard
4. Check CloudWatch logs for any errors

## Support

For issues with production configuration:
1. Check AWS Amplify build logs
2. Verify all required environment variables are set
3. Ensure Stripe webhook is configured correctly
4. Contact DevOps team for AWS access issues

---

**Last Updated**: December 2024
**Security Classification**: CONFIDENTIAL - Handle with care