import { 
  DynamoDBClient, 
  DeleteItemCommand, 
  GetItemCommand,
  QueryCommand,
  ScanCommand,
  PutItemCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { testConfig } from '../config/test.config';

interface CleanupRecord {
  table: string;
  key: Record<string, any>;
}

export class DatabaseHelper {
  private dynamodb: DynamoDBClient;
  private createdRecords: CleanupRecord[] = [];
  private tablePrefix: string;

  constructor() {
    this.dynamodb = new DynamoDBClient({ 
      region: nullableToString(testConfig.staging.awsRegion),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    });
    this.tablePrefix = process.env.AMPLIFY_ENV || 'staging';
  }

  /**
   * Get the full table name with environment prefix
   */
  private getTableName(baseName: string): string {
    return `${baseName}-${this.tablePrefix}`;
  }

  /**
   * Delete a single record from DynamoDB
   */
  async deleteRecord(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      await this.dynamodb.send(new DeleteItemCommand({
        TableName: this.getTableName(tableName),
        Key: marshall(key),
      }));
      console.log(`Deleted record from ${tableName}:`, key);
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        console.error(`Failed to delete from ${tableName}:`, error);
      }
    }
  }

  /**
   * Create a test record in DynamoDB
   */
  async createRecord(tableName: string, item: Record<string, any>): Promise<void> {
    try {
      const fullTableName = this.getTableName(tableName);
      await this.dynamodb.send(new PutItemCommand({
        TableName: fullTableName,
        Item: marshall(item),
      }));
      
      // Track for cleanup
      const key = this.extractKey(tableName, item);
      this.createdRecords.push({ table: tableName, key });
      
      console.log(`Created test record in ${tableName}`);
    } catch (error) {
      console.error(`Failed to create record in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Extract the primary key from an item based on table name
   */
  private extractKey(tableName: string, item: Record<string, any>): Record<string, any> {
    switch (tableName) {
      case 'User':
        return { owner: item.ownerId };
      case 'ProviderProfile':
        return { id: item.id };
      case 'Service':
        return { id: item.id };
      case 'Booking':
        return { id: item.id };
      default:
        return { id: item.id };
    }
  }

  /**
   * Get a User record from DynamoDB
   */
  async getUserRecord(cognitoSub: string): Promise<any> {
    try {
      const response = await this.dynamodb.send(new GetItemCommand({
        TableName: this.getTableName('User'),
        Key: marshall({ owner: cognitoSub })
      }));
      
      return response.Item ? unmarshall(response.Item) : null;
    } catch (error) {
      console.error(`Failed to get User record for ${cognitoSub}:`, error);
      return null;
    }
  }

  /**
   * Clean up all data for a specific user
   */
  async cleanupUserData(userId: string): Promise<void> {
    console.log(`Cleaning up data for user: ${userId}`);
    
    // Delete User record
    await this.deleteRecord('User', { owner: userId });
    
    // Delete ProviderProfile
    await this.deleteRelatedRecords('ProviderProfile', 'ownerId', userId);
    
    // Delete Services
    await this.deleteRelatedRecords('Service', 'providerId', userId);
    
    // Delete Bookings (as customer)
    await this.deleteRelatedRecords('Booking', 'customerId', userId);
    
    // Delete Bookings (as provider)
    await this.deleteRelatedRecords('Booking', 'providerId', userId);
    
    // Delete Reviews
    await this.deleteRelatedRecords('Review', 'reviewerId', userId);
    
    // Delete Messages
    await this.deleteRelatedRecords('Message', 'senderId', userId);
  }

  /**
   * Delete all records that match a specific attribute value
   */
  private async deleteRelatedRecords(
    tableName: string, 
    attributeName: string, 
    attributeValue: string
  ): Promise<void> {
    try {
      const fullTableName = this.getTableName(tableName);
      
      // Query for related records
      const scanResponse = await this.dynamodb.send(new ScanCommand({
        TableName: fullTableName,
        FilterExpression: `#attr = :value`,
        ExpressionAttributeNames: {
          '#attr': attributeName,
        },
        ExpressionAttributeValues: {
          ':value': { S: attributeValue },
        },
      }));

      // Delete each found record
      if (scanResponse.Items && scanResponse.Items.length > 0) {
        for (const item of scanResponse.Items) {
          const unmarshalledItem = unmarshall(item);
          const key = this.extractKey(tableName, unmarshalledItem);
          await this.deleteRecord(tableName, key);
        }
        console.log(`Deleted ${scanResponse.Items.length} records from ${tableName}`);
      }
    } catch (error) {
      console.error(`Failed to delete related records from ${tableName}:`, error);
    }
  }

  /**
   * Create test booking data
   */
  async createTestBooking(customerId: string, providerId: string, serviceId: string): Promise<string> {
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const booking = {
      id: bookingId,
      serviceId,
      providerId,
      customerId,
      customerEmail: `customer-${customerId}@test.com`,
      providerEmail: `provider-${providerId}@test.com`,
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
      status: 'PENDING',
      paymentStatus: 'PENDING',
      amount: 100.00,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.createRecord('Booking', booking);
    return bookingId;
  }

  /**
   * Create test service data
   */
  async createTestService(providerId: string): Promise<string> {
    const serviceId = `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const service = {
      id: serviceId,
      providerId,
      providerEmail: `provider-${providerId}@test.com`,
      title: 'Test Service',
      description: 'This is a test service for E2E testing',
      category: 'SERVICE',
      price: 100.00,
      currency: 'USD',
      active: true,
      instantBooking: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.createRecord('Service', service);
    return serviceId;
  }

  /**
   * Clean up all tracked records
   */
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.createdRecords.length} database records...`);
    
    // Delete in reverse order to handle dependencies
    const reversedRecords = [...this.createdRecords].reverse();
    
    for (const record of reversedRecords) {
      await this.deleteRecord(record.table, record.key);
    }
    
    this.createdRecords = [];
  }

  /**
   * Verify a record exists
   */
  async recordExists(tableName: string, key: Record<string, any>): Promise<boolean> {
    try {
      const response = await this.dynamodb.send(new QueryCommand({
        TableName: this.getTableName(tableName),
        KeyConditionExpression: Object.keys(key).map(k => `#${k} = :${k}`).join(' AND '),
        ExpressionAttributeNames: Object.keys(key).reduce((acc, k) => ({
          ...acc,
          [`#${k}`]: k,
        }), {}),
        ExpressionAttributeValues: marshall(
          Object.entries(key).reduce((acc, [k, v]) => ({
            ...acc,
            [`:${k}`]: v,
          }), {})
        ),
      }));
      
      return (response.Items?.length || 0) > 0;
    } catch (error) {
      console.error(`Failed to check if record exists in ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Get the list of created records (for debugging)
   */
  getCreatedRecords(): CleanupRecord[] {
    return [...this.createdRecords];
  }
}