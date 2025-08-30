import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const dynamodb = new DynamoDBClient({});
const PROVIDER_TABLE = process.env.PROVIDER_TABLE_NAME || 'Provider';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Stripe Connect handler:', JSON.stringify(event));
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { action, providerId, ...params } = body;
    
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
        TableName: PROVIDER_TABLE,
        Key: {
          userId: { S: providerId },
        },
        UpdateExpression: 'SET stripeAccountId = :accountId, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':accountId': { S: account.id },
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
        TableName: PROVIDER_TABLE,
        Key: {
          userId: { S: providerId },
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
    if (account.charges_enabled && account.payouts_enabled) {
      await dynamodb.send(
        new UpdateItemCommand({
          TableName: PROVIDER_TABLE,
          Key: {
            userId: { S: providerId },
          },
          UpdateExpression: 'SET stripeOnboardingComplete = :complete, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':complete': { BOOL: true },
            ':updatedAt': { S: new Date().toISOString() },
          },
        })
      );
    }
    
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
        TableName: PROVIDER_TABLE,
        Key: {
          userId: { S: providerId },
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