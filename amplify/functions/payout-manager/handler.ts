import { APIGatewayProxyHandler, ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient, ScanCommand, UpdateItemCommand, QueryCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { nullableToString, nullableToNumber } from '../../../lib/type-utils';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { v4 as uuidv4 } from 'uuid';

const sns = new SNSClient({});
const eventBridge = new EventBridgeClient({});

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
          providerId: nullableToString(provider.id),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Processed ${results.length} provider payouts`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        processedCount: nullableToString(results.length),
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
          available: nullableToString(earnings.totalEarnings),
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
    // Get provider's ACH account details
    const providerResult = await dynamodb.send(
      new QueryCommand({
        TableName: USER_PROFILE_TABLE,
        KeyConditionExpression: 'id = :providerId',
        ExpressionAttributeValues: {
          ':providerId': { S: providerId },
        },
      })
    );

    if (!providerResult.Items?.[0]?.achAccountId?.S) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'ACH account not found or not verified' }),
      };
    }

    const achAccountId = providerResult.Items[0].achAccountId?.S || '';

    // Create instant ACH transfer (AWS native)
    const achTransfer = await createInstantACHTransfer({
      providerId,
      achAccountId,
      amount,
      currency: 'USD',
      type: 'instant',
      description: `Instant ACH transfer for provider ${providerId}`,
    });

    // Update booking statuses to released
    await releaseEscrowFunds(providerId, amount);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transferId: nullableToString(achTransfer.transferId),
        amount: amount,
        status: nullableToString(achTransfer.status),
        estimatedArrival: nullableToString(achTransfer.estimatedArrival),
        fee: achTransfer.fee,
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
        totalPayouts: nullableToString(payouts.length),
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
      FilterExpression: 'achAccountVerified = :complete AND achAccountStatus = :status',
      ExpressionAttributeValues: {
        ':complete': { BOOL: true },
        ':status': { S: 'VERIFIED' },
      },
    })
  );

  return result.Items?.map(item => ({
    id: item.id?.S || '',
    achAccountId: item.achAccountId?.S || '',
    email: item.email?.S || '',
  })).filter(provider => provider.id && provider.achAccountId) || [];
}

/**
 * Process payout for a specific provider
 */
async function processProviderPayout(provider: { id: string; achAccountId: string; email?: string }) {
  try {
    // Calculate earnings (reuse existing function)
    const earningsResult = await calculateProviderEarnings(provider.id, {});
    const earnings = JSON.parse(earningsResult.body);

    // Skip if no earnings
    if (earnings.totalEarnings <= 0) {
      return {
        providerId: nullableToString(provider.id),
        success: true,
        message: 'No earnings to payout',
        amount: 0,
      };
    }

    // Create standard ACH transfer (next business day)
    const achTransfer = await createStandardACHTransfer({
      providerId: provider.id,
      achAccountId: provider.achAccountId,
      amount: earnings.totalEarnings,
      currency: 'USD',
      type: 'scheduled',
      description: `Scheduled ACH transfer for provider ${provider.id}`,
      bookingCount: earnings.bookingCount,
    });

    // Release escrow funds
    await releaseEscrowFunds(provider.id, earnings.totalEarnings);

    return {
      providerId: nullableToString(provider.id),
      success: true,
      transferId: nullableToString(achTransfer.transferId),
      amount: nullableToString(earnings.totalEarnings),
      bookingCount: nullableToString(earnings.bookingCount),
      estimatedArrival: nullableToString(achTransfer.estimatedArrival),
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

/**
 * Create instant ACH transfer (AWS native)
 */
async function createInstantACHTransfer(params: {
  providerId: string;
  achAccountId: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
}): Promise<{
  transferId: string;
  status: string;
  estimatedArrival: string;
  fee: string;
}> {
  const transferId = uuidv4();
  const now = new Date();
  const estimatedArrival = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes for instant

  // Store transfer record in DynamoDB
  await dynamodb.send(new PutItemCommand({
    TableName: 'ACHTransfers',
    Item: {
      transferId: { S: transferId },
      providerId: { S: params.providerId },
      achAccountId: { S: params.achAccountId },
      amount: { N: params.amount.toString() },
      currency: { S: params.currency },
      type: { S: params.type },
      description: { S: params.description },
      status: { S: 'PROCESSING' },
      createdAt: { S: now.toISOString() },
      estimatedArrival: { S: estimatedArrival.toISOString() },
      fee: { N: '1.50' }, // Instant transfer fee
    },
  }));

  // Trigger ACH transfer via EventBridge
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      Source: 'ecosystemaws.payments',
      DetailType: 'ACH Transfer Initiated',
      Detail: JSON.stringify({
        transferId,
        providerId: params.providerId,
        achAccountId: params.achAccountId,
        amount: params.amount,
        type: params.type,
        instant: true,
      }),
    }],
  }));

  return {
    transferId,
    status: 'PROCESSING',
    estimatedArrival: estimatedArrival.toISOString(),
    fee: '$1.50 instant transfer fee',
  };
}

/**
 * Create standard ACH transfer (next business day)
 */
async function createStandardACHTransfer(params: {
  providerId: string;
  achAccountId: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
  bookingCount: number;
}): Promise<{
  transferId: string;
  status: string;
  estimatedArrival: string;
}> {
  const transferId = uuidv4();
  const now = new Date();
  const estimatedArrival = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next business day

  // Store transfer record in DynamoDB
  await dynamodb.send(new PutItemCommand({
    TableName: 'ACHTransfers',
    Item: {
      transferId: { S: transferId },
      providerId: { S: params.providerId },
      achAccountId: { S: params.achAccountId },
      amount: { N: params.amount.toString() },
      currency: { S: params.currency },
      type: { S: params.type },
      description: { S: params.description },
      status: { S: 'PENDING' },
      createdAt: { S: now.toISOString() },
      estimatedArrival: { S: estimatedArrival.toISOString() },
      bookingCount: { N: params.bookingCount.toString() },
      fee: { N: '0.25' }, // Standard ACH fee
    },
  }));

  // Trigger ACH transfer via EventBridge
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      Source: 'ecosystemaws.payments',
      DetailType: 'ACH Transfer Scheduled',
      Detail: JSON.stringify({
        transferId,
        providerId: params.providerId,
        achAccountId: params.achAccountId,
        amount: params.amount,
        bookingCount: params.bookingCount,
        instant: false,
      }),
    }],
  }));

  return {
    transferId,
    status: 'PENDING',
    estimatedArrival: estimatedArrival.toISOString(),
  };
}