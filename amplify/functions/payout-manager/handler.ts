import { APIGatewayProxyHandler, ScheduledEvent } from 'aws-lambda';
import Stripe from 'stripe';
import { DynamoDBClient, ScanCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const dynamodb = new DynamoDBClient({});
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE_NAME || 'UserProfile';
const BOOKING_TABLE = process.env.BOOKING_TABLE_NAME || 'Booking';
const TRANSACTION_TABLE = process.env.TRANSACTION_TABLE_NAME || 'Transaction';

/**
 * Payout Manager Lambda Function
 * 
 * Handles:
 * 1. Scheduled automatic payouts to providers
 * 2. Manual payout requests
 * 3. Payout status tracking and updates
 * 4. Provider earnings calculations
 * 
 * Can be triggered by:
 * - EventBridge schedule (daily/weekly)
 * - API Gateway for manual payouts
 * - Direct invocation for specific provider payouts
 */
export const handler = async (event: APIGatewayProxyHandler | ScheduledEvent | any) => {
  console.log('Payout Manager invoked:', {
    source: event.source || 'api',
    requestId: event.requestId || event.requestContext?.requestId,
    timestamp: new Date().toISOString(),
  });

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    // Handle scheduled event (automatic payouts)
    if (event.source === 'aws.events') {
      console.log('Processing scheduled payouts');
      return await processScheduledPayouts();
    }

    // Handle API Gateway requests
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { action, providerId, ...params } = body;

    switch (action) {
      case 'CALCULATE_EARNINGS':
        return await calculateProviderEarnings(providerId, headers);
        
      case 'SCHEDULE_PAYOUT':
        return await schedulePayout(providerId, params.amount, headers);
        
      case 'INSTANT_PAYOUT':
        return await processInstantPayout(providerId, params.amount, headers);
        
      case 'GET_PAYOUT_HISTORY':
        return await getPayoutHistory(providerId, headers);
        
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('Payout Manager error:', error);
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

/**
 * Process scheduled payouts for all eligible providers
 */
async function processScheduledPayouts() {
  console.log('Starting scheduled payout process');

  try {
    // Get all providers with completed earnings
    const providers = await getProvidersWithPendingEarnings();
    
    const results = [];
    for (const provider of providers) {
      try {
        const result = await processProviderPayout(provider);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process payout for provider ${provider.id}:`, error);
        results.push({
          providerId: provider.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Processed ${results.length} provider payouts`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        processedCount: results.length,
        successCount: results.filter(r => r.success).length,
        results,
      }),
    };
  } catch (error) {
    console.error('Scheduled payout process failed:', error);
    throw error;
  }
}

/**
 * Calculate provider earnings from completed bookings
 */
async function calculateProviderEarnings(providerId: string, headers: any) {
  try {
    // Get completed bookings for this provider where payment hasn't been released
    const bookingsResult = await dynamodb.send(
      new QueryCommand({
        TableName: BOOKING_TABLE,
        IndexName: 'byProviderId', // Assuming GSI exists
        KeyConditionExpression: 'providerId = :providerId',
        FilterExpression: '#status = :status AND paymentStatus = :paymentStatus',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':providerId': { S: providerId },
          ':status': { S: 'COMPLETED' },
          ':paymentStatus': { S: 'ESCROW_HELD' },
        },
      })
    );

    let totalEarnings = 0;
    let bookingCount = 0;
    const eligibleBookings = [];

    if (bookingsResult.Items) {
      for (const item of bookingsResult.Items) {
        const providerEarnings = parseFloat(item.providerEarnings?.N || '0');
        totalEarnings += providerEarnings;
        bookingCount++;
        eligibleBookings.push({
          bookingId: item.id?.S || '',
          amount: providerEarnings,
          completedAt: item.completedAt?.S || '',
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        providerId,
        totalEarnings,
        bookingCount,
        eligibleBookings,
        currency: 'USD',
      }),
    };
  } catch (error) {
    console.error('Error calculating provider earnings:', error);
    throw error;
  }
}

/**
 * Schedule a payout for later processing
 */
async function schedulePayout(providerId: string, amount: number, headers: any) {
  try {
    // Validate provider has sufficient earnings
    const earningsResult = await calculateProviderEarnings(providerId, headers);
    const earnings = JSON.parse(earningsResult.body);

    if (amount > earnings.totalEarnings) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient earnings',
          available: earnings.totalEarnings,
          requested: amount,
        }),
      };
    }

    // Update provider record with scheduled payout
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: USER_PROFILE_TABLE,
        Key: {
          id: { S: providerId },
        },
        UpdateExpression: 'SET scheduledPayoutAmount = :amount, scheduledPayoutDate = :date',
        ExpressionAttributeValues: {
          ':amount': { N: amount.toString() },
          ':date': { S: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, // Tomorrow
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Payout scheduled successfully',
        amount,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error scheduling payout:', error);
    throw error;
  }
}

/**
 * Process an instant payout
 */
async function processInstantPayout(providerId: string, amount: number, headers: any) {
  try {
    // Get provider's Stripe account
    const providerResult = await dynamodb.send(
      new QueryCommand({
        TableName: USER_PROFILE_TABLE,
        KeyConditionExpression: 'id = :providerId',
        ExpressionAttributeValues: {
          ':providerId': { S: providerId },
        },
      })
    );

    if (!providerResult.Items?.[0]?.stripeAccountId?.S) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Stripe account not found' }),
      };
    }

    const stripeAccountId = providerResult.Items[0].stripeAccountId?.S || '';

    // Create instant payout (higher fee)
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        method: 'instant',
        description: `Instant payout for provider ${providerId}`,
        metadata: {
          providerId,
          type: 'instant',
        },
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    // Update booking statuses to released
    await releaseEscrowFunds(providerId, amount);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        payoutId: payout.id,
        amount: amount,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        fee: 'Instant payout fee applied',
      }),
    };
  } catch (error) {
    console.error('Error processing instant payout:', error);
    throw error;
  }
}

/**
 * Get payout history for a provider
 */
async function getPayoutHistory(providerId: string, headers: any) {
  try {
    // Query transaction table for payouts
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TRANSACTION_TABLE,
        IndexName: 'byProviderId', // Assuming GSI exists
        KeyConditionExpression: 'providerId = :providerId',
        FilterExpression: '#type = :type',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':providerId': { S: providerId },
          ':type': { S: 'PAYOUT' },
        },
      })
    );

    const payouts = result.Items?.map(item => ({
      transactionId: item.id?.S || '',
      amount: parseFloat(item.amount?.N || '0'),
      status: item.status?.S || 'PENDING',
      createdAt: item.createdAt?.S || '',
      processedAt: item.processedAt?.S || '',
      description: item.description?.S || '',
    })) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        providerId,
        payouts,
        totalPayouts: payouts.length,
      }),
    };
  } catch (error) {
    console.error('Error getting payout history:', error);
    throw error;
  }
}

/**
 * Get providers with pending earnings eligible for payout
 */
async function getProvidersWithPendingEarnings() {
  // This would typically use a GSI to efficiently query providers with completed bookings
  // For now, we'll scan all providers and check their earnings
  const result = await dynamodb.send(
    new ScanCommand({
      TableName: USER_PROFILE_TABLE,
      FilterExpression: 'stripeOnboardingComplete = :complete AND stripeAccountStatus = :status',
      ExpressionAttributeValues: {
        ':complete': { BOOL: true },
        ':status': { S: 'ACTIVE' },
      },
    })
  );

  return result.Items?.map(item => ({
    id: item.id?.S || '',
    stripeAccountId: item.stripeAccountId?.S || '',
    email: item.email?.S || '',
  })).filter(provider => provider.id && provider.stripeAccountId) || [];
}

/**
 * Process payout for a specific provider
 */
async function processProviderPayout(provider: { id: string; stripeAccountId: string; email?: string }) {
  try {
    // Calculate earnings (reuse existing function)
    const earningsResult = await calculateProviderEarnings(provider.id, {});
    const earnings = JSON.parse(earningsResult.body);

    // Skip if no earnings
    if (earnings.totalEarnings <= 0) {
      return {
        providerId: provider.id,
        success: true,
        message: 'No earnings to payout',
        amount: 0,
      };
    }

    // Create standard payout (next business day)
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(earnings.totalEarnings * 100), // Convert to cents
        currency: 'usd',
        description: `Scheduled payout for provider ${provider.id}`,
        metadata: {
          providerId: provider.id,
          type: 'scheduled',
          bookingCount: earnings.bookingCount.toString(),
        },
      },
      {
        stripeAccount: provider.stripeAccountId,
      }
    );

    // Release escrow funds
    await releaseEscrowFunds(provider.id, earnings.totalEarnings);

    return {
      providerId: provider.id,
      success: true,
      payoutId: payout.id,
      amount: earnings.totalEarnings,
      bookingCount: earnings.bookingCount,
    };
  } catch (error) {
    console.error(`Payout processing failed for provider ${provider.id}:`, error);
    throw error;
  }
}

/**
 * Release escrow funds and update booking statuses
 */
async function releaseEscrowFunds(providerId: string, totalAmount: number) {
  // Get all bookings with escrow held
  const bookingsResult = await dynamodb.send(
    new QueryCommand({
      TableName: BOOKING_TABLE,
      IndexName: 'byProviderId',
      KeyConditionExpression: 'providerId = :providerId',
      FilterExpression: 'paymentStatus = :paymentStatus',
      ExpressionAttributeValues: {
        ':providerId': { S: providerId },
        ':paymentStatus': { S: 'ESCROW_HELD' },
      },
    })
  );

  // Update all eligible bookings to RELEASED
  if (bookingsResult.Items) {
    for (const booking of bookingsResult.Items) {
      await dynamodb.send(
        new UpdateItemCommand({
          TableName: BOOKING_TABLE,
          Key: {
            id: { S: booking.id?.S || '' },
          },
          UpdateExpression: 'SET paymentStatus = :status, escrowReleaseDate = :releaseDate',
          ExpressionAttributeValues: {
            ':status': { S: 'RELEASED' },
            ':releaseDate': { S: new Date().toISOString() },
          },
        })
      );
    }
  }

  console.log(`Released escrow for ${bookingsResult.Items?.length || 0} bookings, total: $${totalAmount}`);
}