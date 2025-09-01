/**
 * AppSync Custom Authorization Configuration
 * 
 * Configures Lambda-based custom authorization for webhook endpoints
 * that require signature validation but cannot use standard Cognito auth.
 * 
 * This enables secure webhook processing with signature validation
 * while maintaining the benefits of AppSync's GraphQL interface.
 */

import { webhookAuthorizer } from '../functions/webhook-authorizer/resource';
import type { DefineDataProps } from '@aws-amplify/backend';

export const customAuthorizationConfig: Partial<DefineDataProps> = {
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
    lambdaAuthorizationMode: {
      function: webhookAuthorizer,
      ttl: 300, // Cache authorization results for 5 minutes
    },
  },
};

/**
 * Helper function to validate webhook authorization token format
 * Expected format: "Provider:Signature" (e.g., "Stripe:t=123,v1=abc...")
 */
export function formatWebhookAuthToken(provider: string, signature: string): string {
  return `${provider}:${signature}`;
}

/**
 * Helper to extract provider and signature from auth token
 */
export function parseWebhookAuthToken(authToken: string): { provider: string; signature: string } {
  const [provider, ...signatureParts] = authToken.split(':');
  return {
    provider,
    signature: signatureParts.join(':'), // Handle signatures that contain colons
  };
}