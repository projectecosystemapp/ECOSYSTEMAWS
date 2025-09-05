import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('Post-confirmation trigger:', JSON.stringify(event));
  
  const { userPoolId, userName } = event;
  const userAttributes = event.request.userAttributes;
  
  try {
    // Get the user role from custom attribute (set during registration)
    const userRole = userAttributes['custom:role'] || 'CUSTOMER';
    
    // Add user to appropriate Cognito group
    const groupName = userRole === 'PROVIDER' ? 'Providers' : 'Customers';
    
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: groupName,
        UserPoolId: userPoolId,
        Username: userName,
      })
    );
    
    // Create UserProfile record in DynamoDB
    const userProfileTableName = process.env.USERPROFILE_TABLE_NAME;
    
    if (userProfileTableName) {
      await dynamoClient.send(
        new PutItemCommand({
          TableName: userProfileTableName,
          Item: {
            userId: { S: userAttributes.sub },
            email: { S: userAttributes.email },
            firstName: { S: userAttributes.given_name || '' },
            lastName: { S: userAttributes.family_name || '' },
            phone: { S: userAttributes.phone_number || '' },
            role: { S: userRole },
            createdAt: { S: new Date().toISOString() },
            updatedAt: { S: new Date().toISOString() },
          },
        })
      );
      
      // If provider, create initial Provider record
      if (userRole === 'PROVIDER') {
        const providerTableName = process.env.PROVIDER_TABLE_NAME;
        
        if (providerTableName) {
          await dynamoClient.send(
            new PutItemCommand({
              TableName: providerTableName,
              Item: {
                userId: { S: userAttributes.sub },
                businessName: { S: '' }, // To be filled during onboarding
                verified: { BOOL: false },
                commissionRate: { N: '0.08' }, // 8% default rate for early adopters
                stripeOnboardingComplete: { BOOL: false },
                totalEarnings: { N: '0' },
                availableBalance: { N: '0' },
                rating: { N: '0' },
                reviewCount: { N: '0' },
                completedBookings: { N: '0' },
                createdAt: { S: new Date().toISOString() },
                updatedAt: { S: new Date().toISOString() },
              },
            })
          );
        }
      }
    }
    
    console.log(`User ${userName} added to group ${groupName} and profile created`);
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    // Don't throw - let user complete signup even if group assignment fails
  }
  
  return event;
};