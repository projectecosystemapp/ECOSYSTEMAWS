/**
 * Webhook Authorization Lambda
 * 
 * Custom authorizer for validating webhook signatures before processing
 * in AppSync. This provides security validation for webhooks that cannot
 * use standard Cognito authentication.
 * 
 * Implements signature validation for Stripe and other webhook providers.
 */

import { AppSyncAuthorizerHandler, AppSyncAuthorizerResult } from 'aws-lambda';
import crypto from 'crypto';
import { env } from '$amplify/env/webhook-authorizer';
import { correlationTracker } from '@/lib/resilience/correlation-tracker';
import { WebhookDeduplicationService } from '@/amplify/data/webhook-deduplication';

const webhookDedup = new WebhookDeduplicationService();

interface WebhookAuthorizerEvent {
  authorizationToken: string;
  requestContext: {
    apiId: string;
    accountId: string;
    requestId: string;
    queryString: string;
    operationName: string;
    variables: {
      body: string;
      signature: string;
    };
  };
}

export const handler: AppSyncAuthorizerHandler<WebhookAuthorizerEvent> = async (event) => {
  console.log('[WebhookAuthorizer] Received authorization request', {
    operationName: event.requestContext.operationName,
    requestId: event.requestContext.requestId
  });

  // Extract correlation context
  const context = correlationTracker.extractFromLambdaEvent(event);
  
  return correlationTracker.runWithCorrelation('webhook-authorization', async () => {
    try {
      const { body, signature } = event.requestContext.variables;
      
      if (!body || !signature) {
        console.error('[WebhookAuthorizer] Missing body or signature');
        return generateDenyPolicy('Missing required parameters');
      }

      // Determine webhook provider from signature format
      const provider = detectWebhookProvider(signature);
      
      // Validate signature based on provider
      let isValid = false;
      let eventId: string | undefined;
      let eventType: string | undefined;

      switch (provider) {
        case 'stripe':
          const stripeValidation = validateStripeWebhook(body, signature);
          isValid = stripeValidation.isValid;
          eventId = stripeValidation.eventId;
          eventType = stripeValidation.eventType;
          break;
          
        case 'github':
          isValid = validateGitHubWebhook(body, signature);
          break;
          
        case 'shopify':
          isValid = validateShopifyWebhook(body, signature);
          break;
          
        default:
          console.warn('[WebhookAuthorizer] Unknown webhook provider');
          isValid = false;
      }

      if (!isValid) {
        console.error('[WebhookAuthorizer] Invalid webhook signature', {
          provider,
          correlationId: correlationTracker.getCurrentCorrelationId()
        });
        return generateDenyPolicy('Invalid signature');
      }

      // Check for duplicate processing if we have an event ID
      if (eventId) {
        const isDuplicate = await webhookDedup.isProcessed(eventId);
        if (isDuplicate) {
          console.log('[WebhookAuthorizer] Duplicate webhook detected', {
            eventId,
            correlationId: correlationTracker.getCurrentCorrelationId()
          });
          // Still allow it through - the processing logic will handle it
        }
      }

      console.log('[WebhookAuthorizer] Webhook authorized successfully', {
        provider,
        eventId,
        eventType,
        correlationId: correlationTracker.getCurrentCorrelationId()
      });

      return generateAllowPolicy({
        provider,
        eventId,
        eventType,
        validatedAt: Date.now(),
        correlationId: correlationTracker.getCurrentCorrelationId()
      });
    } catch (error) {
      console.error('[WebhookAuthorizer] Authorization error', error);
      return generateDenyPolicy('Authorization failed');
    }
  });
};

/**
 * Detect webhook provider from signature format
 */
function detectWebhookProvider(signature: string): string {
  if (signature.includes('t=') && signature.includes('v1=')) {
    return 'stripe';
  } else if (signature.startsWith('sha256=')) {
    return 'github';
  } else if (signature.startsWith('sha256=') && signature.length === 64) {
    return 'shopify';
  }
  return 'unknown';
}

/**
 * Validate Stripe webhook signature
 */
function validateStripeWebhook(
  payload: string,
  signature: string
): { isValid: boolean; eventId?: string; eventType?: string } {
  try {
    const secret = env.STRIPE_WEBHOOK_SECRET;
    
    // Parse signature header
    const elements = signature.split(',');
    let timestamp = '';
    let signatures: string[] = [];

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      return { isValid: false };
    }

    // Verify timestamp is within tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const tolerance = 300;
    
    if (Math.abs(currentTime - parseInt(timestamp)) > tolerance) {
      console.warn('[WebhookAuthorizer] Stripe webhook timestamp outside tolerance', {
        timestamp,
        currentTime,
        difference: Math.abs(currentTime - parseInt(timestamp))
      });
      return { isValid: false };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Check if signature matches
    const isValid = signatures.includes(expectedSignature);

    if (isValid) {
      // Extract event ID and type from payload
      try {
        const event = JSON.parse(payload);
        return {
          isValid: true,
          eventId: event.id,
          eventType: event.type
        };
      } catch {
        return { isValid: true };
      }
    }

    return { isValid: false };
  } catch (error) {
    console.error('[WebhookAuthorizer] Error validating Stripe webhook', error);
    return { isValid: false };
  }
}

/**
 * Validate GitHub webhook signature
 */
function validateGitHubWebhook(payload: string, signature: string): boolean {
  try {
    const secret = env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return false;

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[WebhookAuthorizer] Error validating GitHub webhook', error);
    return false;
  }
}

/**
 * Validate Shopify webhook signature
 */
function validateShopifyWebhook(payload: string, signature: string): boolean {
  try {
    const secret = env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) return false;

    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    return hash === signature;
  } catch (error) {
    console.error('[WebhookAuthorizer] Error validating Shopify webhook', error);
    return false;
  }
}

/**
 * Generate allow policy
 */
function generateAllowPolicy(context: any): AppSyncAuthorizerResult {
  return {
    isAuthorized: true,
    resolverContext: context,
    deniedFields: [],
    ttlOverride: 300 // Cache for 5 minutes
  };
}

/**
 * Generate deny policy
 */
function generateDenyPolicy(reason: string): AppSyncAuthorizerResult {
  return {
    isAuthorized: false,
    resolverContext: {
      deniedReason: reason,
      timestamp: Date.now()
    },
    deniedFields: [],
    ttlOverride: 60 // Cache denials for 1 minute
  };
}