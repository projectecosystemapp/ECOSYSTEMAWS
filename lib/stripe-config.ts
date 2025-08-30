// Stripe Lambda Configuration
export const getStripeLambdaUrl = () => {
  // In development, use local endpoint or mock
  if (process.env.NODE_ENV === 'development') {
    return process.env.STRIPE_CONNECT_LAMBDA_URL || null;
  }
  
  // In production, construct the Lambda function URL
  // This will be set after deployment or use API Gateway endpoint
  return process.env.STRIPE_CONNECT_LAMBDA_URL || process.env.NEXT_PUBLIC_STRIPE_LAMBDA_URL;
};

export const isLambdaAvailable = () => {
  return !!getStripeLambdaUrl();
};

// Stripe configuration
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  apiVersion: '2025-08-27.basil' as const,
};

// Platform configuration
export const platformConfig = {
  commissionRate: 0.08, // 8% for early adopters
  standardCommissionRate: 0.10, // 10% standard rate
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
};