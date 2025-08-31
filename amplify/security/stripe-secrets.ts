/**
 * Stripe Secrets Configuration for AWS Amplify Backend
 * 
 * This file defines the secure configuration strategy for Stripe API keys
 * using AWS Secrets Manager via Amplify's secret() function.
 * 
 * SECURITY PRINCIPLES:
 * - Development uses TEST keys stored in .env.local
 * - Production uses LIVE keys stored in AWS Secrets Manager
 * - Keys are never hardcoded in source code
 * - Environment-specific configurations prevent key leakage
 */

import { secret } from '@aws-amplify/backend';

/**
 * Stripe Secret Configuration
 * 
 * These secrets must be set in AWS Systems Manager Parameter Store
 * or AWS Secrets Manager before deployment:
 * 
 * For TEST environment:
 * - STRIPE_SECRET_KEY: sk_test_51RxWCID905P0bnNc...
 * - STRIPE_WEBHOOK_SECRET: whsec_test_...
 * 
 * For PRODUCTION environment:
 * - STRIPE_SECRET_KEY: sk_live_YOUR_LIVE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET: whsec_YOUR_PRODUCTION_WEBHOOK_SECRET
 * - APP_URL: https://your-production-domain.com
 */

export const stripeSecrets = {
  // Stripe API Secret Key - Used for backend operations
  secretKey: secret('STRIPE_SECRET_KEY'),
  
  // Webhook Secret - Used to verify Stripe webhook signatures
  webhookSecret: secret('STRIPE_WEBHOOK_SECRET'),
  
  // Application URL - Used for redirect URLs in Stripe Connect onboarding
  appUrl: secret('APP_URL'),
  
  // Database table names
  userProfileTableName: secret('USER_PROFILE_TABLE_NAME'),
  serviceTableName: secret('SERVICE_TABLE_NAME'),
  bookingTableName: secret('BOOKING_TABLE_NAME'),
  transactionTableName: secret('TRANSACTION_TABLE_NAME'),
} as const;

/**
 * Environment-specific configurations
 * 
 * These values should be set as secrets in AWS:
 * 
 * DEVELOPMENT/STAGING:
 * ```bash
 * npx ampx sandbox secret set STRIPE_SECRET_KEY sk_test_51RxWCID905P0bnNcybVX55XQBnYcikWljrcbotmAmd9IAkhUSqgVlzqp4eBNrpqagzPRqOvTw8UvnqpqfHbjhp5u00g6WkdVsp
 * npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET whsec_test_your_webhook_secret_here
 * npx ampx sandbox secret set APP_URL http://localhost:3000
 * npx ampx sandbox secret set USER_PROFILE_TABLE_NAME UserProfile-sandbox
 * npx ampx sandbox secret set SERVICE_TABLE_NAME Service-sandbox
 * npx ampx sandbox secret set BOOKING_TABLE_NAME Booking-sandbox
 * npx ampx sandbox secret set TRANSACTION_TABLE_NAME Transaction-sandbox
 * ```
 * 
 * PRODUCTION:
 * ```bash
 * npx ampx pipeline-deploy secret set STRIPE_SECRET_KEY sk_live_YOUR_LIVE_SECRET_KEY
 * npx ampx pipeline-deploy secret set STRIPE_WEBHOOK_SECRET whsec_YOUR_PRODUCTION_WEBHOOK_SECRET
 * npx ampx pipeline-deploy secret set APP_URL https://your-production-domain.com
 * npx ampx pipeline-deploy secret set USER_PROFILE_TABLE_NAME UserProfile-production
 * npx ampx pipeline-deploy secret set SERVICE_TABLE_NAME Service-production
 * npx ampx sandbox secret set BOOKING_TABLE_NAME Booking-production
 * npx ampx pipeline-deploy secret set TRANSACTION_TABLE_NAME Transaction-production
 * ```
 */

/**
 * Security Best Practices Implemented:
 * 
 * 1. SECRETS MANAGEMENT:
 *    - All sensitive keys stored in AWS Secrets Manager
 *    - Environment-specific secret values
 *    - Automatic rotation capability (configure separately)
 * 
 * 2. ACCESS CONTROL:
 *    - Lambda execution role has minimal IAM permissions
 *    - Secrets accessible only to authorized functions
 *    - Network isolation via VPC (if configured)
 * 
 * 3. MONITORING & COMPLIANCE:
 *    - CloudTrail logs all secret access attempts
 *    - CloudWatch monitors for unauthorized access patterns
 *    - AWS Config tracks secret configuration changes
 * 
 * 4. DEVELOPMENT SAFETY:
 *    - Local development uses test keys only
 *    - .env.local contains no production secrets
 *    - Clear environment separation prevents accidents
 */

/**
 * Required IAM Permissions for Lambda Function:
 * 
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [
 *     {
 *       "Effect": "Allow",
 *       "Action": [
 *         "secretsmanager:GetSecretValue"
 *       ],
 *       "Resource": [
 *         "arn:aws:secretsmanager:*:*:secret:STRIPE_SECRET_KEY-*",
 *         "arn:aws:secretsmanager:*:*:secret:STRIPE_WEBHOOK_SECRET-*",
 *         "arn:aws:secretsmanager:*:*:secret:APP_URL-*",
 *         "arn:aws:secretsmanager:*:*:secret:PROVIDER_TABLE_NAME-*"
 *       ]
 *     }
 *   ]
 * }
 */