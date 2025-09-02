# Amplify Environment Variables (Example)

Use this as a reference for configuring environment variables in AWS Amplify Console. Do not commit real secrets.

## Core Configuration
NEXT_PUBLIC_APP_URL=https://your-app.example.com
NEXT_PUBLIC_AWS_REGION=us-west-2
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXX

## Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX

## Lambda Function URLs
STRIPE_CONNECT_LAMBDA_URL=<set-in-console>
STRIPE_WEBHOOK_LAMBDA_URL=<set-in-console>
PAYOUT_MANAGER_LAMBDA_URL=<set-in-console>
REFUND_PROCESSOR_LAMBDA_URL=<set-in-console>
BOOKING_PROCESSOR_LAMBDA_URL=<set-in-console>
MESSAGING_HANDLER_LAMBDA_URL=<set-in-console>
NOTIFICATION_HANDLER_LAMBDA_URL=<set-in-console>

# Also add NEXT_PUBLIC versions for client-side access (if needed)
NEXT_PUBLIC_STRIPE_CONNECT_LAMBDA_URL=<same-as-above>
NEXT_PUBLIC_STRIPE_WEBHOOK_URL=<same-as-above>
NEXT_PUBLIC_BEDROCK_AI_LAMBDA_URL=<same-as-above>

## Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=<your-dsn>
# For CI/CD sourcemap uploads (GitHub Secrets)
# SENTRY_AUTH_TOKEN=<token>
# SENTRY_ORG=<org>
# SENTRY_PROJECT=<project>
# SENTRY_URL=https://us.sentry.io

## Application Settings
APP_URL=https://your-app.example.com
NODE_ENV=production
PLATFORM_FEE_PERCENT=8

## Notes
- Populate actual values via Amplify Console environment variables.
- Keep this file as an example only.
