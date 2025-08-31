import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const dynamodb = new DynamoDBClient({});
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE_NAME || 'UserProfile';
const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME || 'Booking';
const TRANSACTION_TABLE = process.env.TRANSACTION_TABLE_NAME || 'Transaction';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Security logging - log request metadata without sensitive data
  console.log('Stripe Connect request received:', {
    httpMethod: event.httpMethod,
    path: event.path,
    sourceIP: event.requestContext.identity.sourceIp,
    userAgent: event.requestContext.identity.userAgent,
    requestId: event.requestContext.requestId,
    hasBody: !!event.body,
    timestamp: new Date().toISOString(),
  });
  
  // Security headers - restrict CORS in production
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProduction 
    ? [process.env.APP_URL, 'https://*.amplifyapp.com']
    : ['*'];
    
  const headers = {
    'Access-Control-Allow-Origin': isProduction ? process.env.APP_URL || '*' : '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }
  
  try {
    // Input validation and sanitization
    if (!event.body) {
      console.warn('Empty request body received');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body required' }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON format' }),
      };
    }

    const { action, providerId, ...params } = body;
    
    // Validate required fields
    if (!action || typeof action !== 'string') {
      console.error('Missing or invalid action field');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid action field required' }),
      };
    }

    // Validate providerId for user-specific actions
    const userSpecificActions = ['CREATE_ACCOUNT', 'CREATE_ACCOUNT_LINK', 'CHECK_ACCOUNT_STATUS', 'CREATE_PAYOUT'];
    if (userSpecificActions.includes(action) && (!providerId || typeof providerId !== 'string')) {
      console.error('Missing or invalid providerId for action:', action);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid providerId required for this action' }),
      };
    }

    // Rate limiting check (basic implementation)
    const sourceIP = event.requestContext.identity.sourceIp;
    console.log('Processing request from IP:', sourceIP, 'Action:', action);
    
    switch (action) {
      case 'CREATE_ACCOUNT':
        return await createConnectAccount(providerId, headers);
        
      case 'CREATE_ACCOUNT_LINK':
        return await createAccountLink(providerId, params.accountId, headers);
        
      case 'CHECK_ACCOUNT_STATUS':
        return await checkAccountStatus(providerId, headers);
        
      case 'CREATE_PAYMENT_INTENT':
        return await createPaymentIntent(params, headers);
        
      case 'PROCESS_REFUND':
        return await processRefund(params, headers);
        
      case 'CREATE_PAYOUT':
        return await createPayout(providerId, params.amount, headers);
        
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

async function createConnectAccount(providerId: string, headers: any) {
  try {
    // Create Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        providerId,
      },
    });
    
    // Save Stripe account ID to DynamoDB
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: USER_PROFILE_TABLE,
        Key: {
          id: { S: providerId },
        },
        UpdateExpression: `
          SET stripeAccountId = :accountId, 
              stripeOnboardingUrl = :onboardingUrl,
              stripeAccountStatus = :status,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ':accountId': { S: account.id },
          ':onboardingUrl': { S: '' }, // Will be updated with the account link URL
          ':status': { S: 'PENDING' },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })
    );
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL}/provider/onboarding?step=stripe&refresh=true`,
      return_url: `${process.env.APP_URL}/provider/onboarding?step=stripe&success=true`,
      type: 'account_onboarding',
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        accountId: account.id,
        onboardingUrl: accountLink.url,
      }),
    };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw error;
  }
}

async function createAccountLink(providerId: string, accountId: string, headers: any) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL}/provider/onboarding?step=stripe&refresh=true`,
      return_url: `${process.env.APP_URL}/provider/onboarding?step=stripe&success=true`,
      type: 'account_onboarding',
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url: accountLink.url,
      }),
    };
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

async function checkAccountStatus(providerId: string, headers: any) {
  try {
    // Get Stripe account ID from DynamoDB
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: USER_PROFILE_TABLE,
        Key: {
          id: { S: providerId },
        },
      })
    );
    
    if (!result.Item?.stripeAccountId?.S) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Stripe account not found' }),
      };
    }
    
    const account = await stripe.accounts.retrieve(result.Item.stripeAccountId.S);
    
    // Update onboarding status if complete
    const accountStatus = account.charges_enabled && account.payouts_enabled ? 'ACTIVE' : 'PENDING';
    
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: USER_PROFILE_TABLE,
        Key: {
          id: { S: providerId },
        },
        UpdateExpression: `
          SET stripeOnboardingComplete = :complete, 
              stripeAccountStatus = :status,
              stripeChargesEnabled = :chargesEnabled,
              stripePayoutsEnabled = :payoutsEnabled,
              stripeDetailsSubmitted = :detailsSubmitted,
              stripeRequirements = :requirements,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ':complete': { BOOL: account.charges_enabled && account.payouts_enabled },
          ':status': { S: accountStatus },
          ':chargesEnabled': { BOOL: account.charges_enabled || false },
          ':payoutsEnabled': { BOOL: account.payouts_enabled || false },
          ':detailsSubmitted': { BOOL: account.details_submitted || false },
          ':requirements': { S: JSON.stringify(account.requirements || {}) },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })
    );
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
      }),
    };
  } catch (error) {
    console.error('Error checking account status:', error);
    throw error;
  }
}

async function createPaymentIntent(params: any, headers: any) {
  try {
    const { amount, bookingId, customerId, providerId, providerStripeAccountId, serviceTitle } = params;
    
    // Calculate platform fee (8-10%)
    const platformFeeRate = 0.08; // 8% for now, can be dynamic
    const platformFee = Math.round(amount * platformFeeRate);
    const providerAmount = amount - platformFee;
    
    // Create payment intent with Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      application_fee_amount: platformFee * 100,
      transfer_data: {
        destination: providerStripeAccountId,
      },
      metadata: {
        bookingId,
        customerId,
        providerId,
        serviceTitle,
        platformFee: platformFee.toString(),
        providerAmount: providerAmount.toString(),
      },
      description: `Booking for ${serviceTitle}`,
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        platformFee,
        providerAmount,
      }),
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

async function processRefund(params: any, headers: any) {
  try {
    const { paymentIntentId, amount, reason } = params;
    
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? amount * 100 : undefined, // Partial refund if amount specified
      reason: reason || 'requested_by_customer',
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      }),
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

async function createPayout(providerId: string, amount: number, headers: any) {
  try {
    // Get provider's Stripe account
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: USER_PROFILE_TABLE,
        Key: {
          id: { S: providerId },
        },
      })
    );
    
    if (!result.Item?.stripeAccountId?.S) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Stripe account not found' }),
      };
    }
    
    // Create payout
    const payout = await stripe.payouts.create(
      {
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        description: 'Provider earnings payout',
        metadata: {
          providerId,
        },
      },
      {
        stripeAccount: result.Item.stripeAccountId.S,
      }
    );
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        payoutId: payout.id,
        amount: payout.amount / 100,
        arrivalDate: payout.arrival_date,
        status: payout.status,
      }),
    };
  } catch (error) {
    console.error('Error creating payout:', error);
    throw error;
  }
}