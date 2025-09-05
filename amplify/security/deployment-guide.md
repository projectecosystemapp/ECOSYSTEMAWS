# Stripe Security Configuration Deployment Guide

This guide provides step-by-step instructions for securely deploying Stripe integration with AWS Amplify using proper secret management and security best practices.

## 🔐 Security Overview

**CRITICAL SECURITY PRINCIPLES:**
- ✅ Development uses TEST keys only (safe for development)
- ✅ Production uses LIVE keys stored in AWS Secrets Manager
- ✅ Webhook signature verification prevents unauthorized requests  
- ✅ IAM roles follow least privilege principle
- ✅ All sensitive data encrypted at rest and in transit

## 📋 Pre-Deployment Checklist

### 1. Verify Development Environment Safety
```bash
# Confirm .env.local contains TEST keys only
grep "pk_test\|sk_test" .env.local
# Should return test keys, never live keys
```

### 2. Stripe Dashboard Configuration

**Test Environment:**
1. Create test webhook endpoint: `https://your-dev-domain/api/stripe-webhook`
2. Enable webhook events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `charge.dispute.created`
   - `payout.created`
   - `payout.updated`
3. Copy webhook signing secret (starts with `whsec_test_`)

**Production Environment:**
1. Create production webhook endpoint: `https://your-prod-domain/api/stripe-webhook`
2. Enable same webhook events as above
3. Copy webhook signing secret (starts with `whsec_`)

## 🚀 Deployment Instructions

### Step 1: Configure Secrets for Development/Sandbox

```bash
# Set test secrets for development
npx ampx sandbox secret set STRIPE_SECRET_KEY "sk_test_51RxWCID905P0bnNcybVX55XQBnYcikWljrcbotmAmd9IAkhUSqgVlzqp4eBNrpqagzPRqOvTw8UvnqpqfHbjhp5u00g6WkdVsp"

npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET "whsec_test_your_webhook_secret_here"

npx ampx sandbox secret set APP_URL "http://localhost:3000"

npx ampx sandbox secret set PROVIDER_TABLE_NAME "Provider-sandbox"
```

### Step 2: Configure Secrets for Production

⚠️ **CRITICAL**: Never use live keys in development. Only set these for production deployment.

```bash
# Set production secrets (LIVE KEYS - USE WITH EXTREME CAUTION)
npx ampx pipeline-deploy secret set STRIPE_SECRET_KEY "sk_live_YOUR_ACTUAL_LIVE_SECRET_KEY"

npx ampx pipeline-deploy secret set STRIPE_WEBHOOK_SECRET "whsec_YOUR_ACTUAL_PRODUCTION_WEBHOOK_SECRET"

npx ampx pipeline-deploy secret set APP_URL "https://your-production-domain.com"

npx ampx pipeline-deploy secret set PROVIDER_TABLE_NAME "Provider-production"
```

### Step 3: Deploy Backend Infrastructure

```bash
# Deploy to sandbox for testing
npx ampx sandbox

# Deploy to production pipeline
npx ampx pipeline-deploy --branch main --app-id YOUR_AMPLIFY_APP_ID
```

### Step 4: Verify Deployment

```bash
# Check function deployment status
aws lambda list-functions --query 'Functions[?contains(FunctionName, `stripe`)]'

# Test webhook endpoint (should return 400 without proper signature)
curl -X POST https://your-domain/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🛡️ Security Monitoring

### CloudWatch Alarms

Set up monitoring for security events:

```bash
# Monitor failed webhook signature verifications
aws logs create-log-group --log-group-name /aws/lambda/stripe-webhook

# Create alarm for authentication failures
aws cloudwatch put-metric-alarm \
  --alarm-name "StripeWebhookAuthFailures" \
  --alarm-description "Monitor failed webhook authentications" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold"
```

### AWS Config Rules

Monitor for security compliance:
- Secrets rotation policies
- Lambda function configuration changes
- IAM role modifications

## 🔍 Security Validation

### Test Webhook Security
```bash
# Test webhook with invalid signature (should fail)
curl -X POST https://your-domain/api/stripe-webhook \
  -H "stripe-signature: invalid" \
  -d '{"type": "test"}'

# Should return: {"error": "Webhook signature verification failed"}
```

### Verify Secret Access
```bash
# Check Lambda can access secrets (should not expose values in logs)
aws logs filter-log-events \
  --log-group-name /aws/lambda/stripe-connect \
  --filter-pattern "STRIPE_SECRET_KEY"
```

## 🚨 Emergency Response

### If Live Keys Are Compromised:

1. **Immediate Actions:**
   ```bash
   # Rotate compromised keys in Stripe Dashboard immediately
   # Update secrets in AWS
   npx ampx pipeline-deploy secret set STRIPE_SECRET_KEY "new_secret_key"
   
   # Redeploy functions
   npx ampx pipeline-deploy --branch main
   ```

2. **Investigation:**
   - Check CloudTrail logs for unauthorized access
   - Review application logs for suspicious transactions
   - Verify all webhook endpoints are legitimate

3. **Recovery:**
   - Update webhook endpoints with new secrets
   - Test all payment flows
   - Monitor for any failed transactions

## 📊 Compliance Requirements

### PCI DSS Compliance
- ✅ Stripe handles all payment card data (SAQ-A compliance)
- ✅ No cardholder data stored in your infrastructure
- ✅ TLS 1.2+ for all communications
- ✅ Regular security monitoring

### GDPR Compliance  
- ✅ Customer consent handling via Stripe
- ✅ Right to deletion supported
- ✅ Data processing agreements with Stripe

### SOC 2 Compliance
- ✅ Access logging via CloudTrail
- ✅ Encryption at rest and in transit
- ✅ Regular security assessments

## 🔧 Troubleshooting

### Common Issues:

1. **Webhook signature verification fails:**
   - Verify webhook secret matches Stripe dashboard
   - Check that raw request body is used (not parsed)
   - Confirm correct Stripe API version

2. **Function timeout errors:**
   - Increase timeout in resource configuration
   - Optimize DynamoDB queries
   - Consider async processing for complex operations

3. **Secret access denied:**
   - Verify IAM role has `secretsmanager:GetSecretValue` permission
   - Check secret name matches exactly
   - Confirm secret exists in correct region

## 📞 Support

For security incidents or questions:
- AWS Support: Critical security issues
- Stripe Support: Payment processing issues  
- Internal Security Team: Policy compliance questions

---

⚠️ **REMEMBER**: Security is not a one-time setup. Regularly review and update these configurations as your application evolves.