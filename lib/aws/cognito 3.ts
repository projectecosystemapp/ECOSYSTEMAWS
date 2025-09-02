import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

// Get user details from Cognito
export async function getCognitoUser(userId: string) {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
    });
    
    const response = await cognitoClient.send(command);
    
    // Parse user attributes
    const attributes: Record<string, string> = {};
    response.UserAttributes?.forEach(attr => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });
    
    return {
      userId: response.Username,
      email: attributes.email,
      name: attributes.name,
      role: attributes['custom:role'] as 'customer' | 'provider',
      emailVerified: attributes.email_verified === 'true',
      createdAt: response.UserCreateDate,
      status: response.UserStatus,
    };
  } catch (error) {
    console.error('Error getting Cognito user:', error);
    throw error;
  }
}

// Update user role in Cognito
export async function updateUserRole(userId: string, role: 'customer' | 'provider') {
  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      UserAttributes: [
        {
          Name: 'custom:role',
          Value: role,
        },
      ],
    });
    
    await cognitoClient.send(command);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// Update user attributes
export async function updateUserAttributes(userId: string, attributes: Record<string, string>) {
  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      UserAttributes: Object.entries(attributes).map(([name, value]) => ({
        Name: name,
        Value: value,
      })),
    });
    
    await cognitoClient.send(command);
    return true;
  } catch (error) {
    console.error('Error updating user attributes:', error);
    throw error;
  }
}