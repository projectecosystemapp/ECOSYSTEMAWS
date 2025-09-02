import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = 'EcosystemMarketplace';

// Provider operations
export async function createProvider(provider: {
  id: string;
  name: string;
  slug: string;
  email: string;
  role: 'provider';
}) {
  return await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `PROVIDER#${provider.id}`,
      sk: 'METADATA',
      entityType: 'Provider',
      gsi1pk: provider.slug,
      gsi1sk: 'PROVIDER',
      gsi2pk: 'PROVIDER',
      gsi2sk: 'draft',
      ...provider,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));
}

export async function getProviderBySlug(slug: string) {
  const result = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'gsi1pk = :slug AND gsi1sk = :type',
    ExpressionAttributeValues: {
      ':slug': slug,
      ':type': 'PROVIDER',
    },
  }));
  
  return result.Items?.[0];
}

// Service operations
export async function createService(service: {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  category: string;
}) {
  return await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `PROVIDER#${service.providerId}`,
      sk: `SERVICE#${service.id}`,
      entityType: 'Service',
      gsi2pk: 'SERVICE',
      gsi2sk: service.category,
      ...service,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));
}

export async function getServicesByProvider(providerId: string) {
  const result = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PROVIDER#${providerId}`,
      ':sk': 'SERVICE#',
    },
  }));
  
  return result.Items || [];
}

// Booking operations
export async function createBooking(booking: {
  id: string;
  providerId: string;
  serviceId: string;
  customerId?: string;
  customerEmail: string;
  startAt: string;
  endAt: string;
  amount: number;
  platformFee: number;
  guestSurcharge?: number;
}) {
  return await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `BOOKING#${booking.id}`,
      sk: 'METADATA',
      entityType: 'Booking',
      gsi2pk: `PROVIDER#${booking.providerId}`,
      gsi2sk: booking.startAt,
      gsi3pk: booking.customerId ? `CUSTOMER#${booking.customerId}` : `EMAIL#${booking.customerEmail}`,
      gsi3sk: booking.startAt,
      ...booking,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));
}

export async function updateBookingStatus(bookingId: string, status: string, updates: Record<string, any> = {}) {
  return await client.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `BOOKING#${bookingId}`, sk: 'METADATA' },
    UpdateExpression: 'SET #status = :status, updatedAt = :now' + 
      Object.keys(updates).map(key => `, ${key} = :${key}`).join(''),
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':now': new Date().toISOString(),
      ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [`:${k}`, v])),
    },
  }));
}