import { 
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  MessageActionType
} from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'crypto';

export interface TestUser {
  email: string;
  password: string;
  userId: string;
  role: 'CUSTOMER' | 'PROVIDER';
  cognitoUsername?: string;
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

export class TestAuthHelper {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private createdUsers: TestUser[] = [];
  
  constructor() {
    // Read from environment
    this.userPoolId = process.env.VITE_TEST_USER_POOL_ID || process.env.TEST_USER_POOL_ID || '';
    this.clientId = process.env.VITE_TEST_USER_POOL_CLIENT_ID || process.env.TEST_USER_POOL_CLIENT_ID || '';
    
    if (!this.userPoolId || !this.clientId) {
      console.warn('Missing Cognito test configuration. Tests requiring auth will be skipped.');
      console.warn('Please set VITE_TEST_USER_POOL_ID and VITE_TEST_USER_POOL_CLIENT_ID');
    }
    
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    });
  }

  async createTestUser(role: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER'): Promise<TestUser> {
    if (!this.userPoolId || !this.clientId) {
      throw new Error('Cognito not configured for testing');
    }

    // Generate unique test email
    const randomId = randomBytes(4).toString('hex');
    const email = `test-${role.toLowerCase()}-${randomId}@ecosystemtest.local`;
    const password = `Test123!${randomId}`; // Meets Cognito password requirements
    
    try {
      // Step 1: Create user with temporary password
      const createUserResponse = await this.cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: nullableToString(this.userPoolId),
          Username: email,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: `Test ${role}` },
          ],
          TemporaryPassword: password,
          MessageAction: MessageActionType.SUPPRESS, // Don't send welcome email
        })
      );
      
      const userId = createUserResponse.User?.Attributes?.find(
        attr => attr.Name === 'sub'
      )?.Value || '';
      
      // Step 2: Set permanent password
      await this.cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: nullableToString(this.userPoolId),
          Username: email,
          Password: password,
          Permanent: true,
        })
      );
      
      // Step 3: Add to appropriate group
      const groupName = role === 'PROVIDER' ? 'Providers' : 'Customers';
      await this.cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: nullableToString(this.userPoolId),
          Username: email,
          GroupName: groupName,
        })
      );
      
      // Step 4: Get auth tokens for the user
      const tokens = await this.getAuthTokens(email, password);
      
      const testUser: TestUser = {
        email,
        password,
        userId,
        role,
        cognitoUsername: email,
        idToken: nullableToString(tokens.idToken),
        accessToken: nullableToString(tokens.accessToken),
        refreshToken: nullableToString(tokens.refreshToken),
      };
      
      // Track for cleanup
      this.createdUsers.push(testUser);
      
      console.log(`✅ Created test user: ${email} (${role})`);
      return testUser;
      
    } catch (error) {
      console.error(`Failed to create test user:`, error);
      throw error;
    }
  }

  async getAuthTokens(email: string, password: string) {
    if (!this.userPoolId || !this.clientId) {
      throw new Error('Cognito not configured for testing');
    }

    // This method gets JWT tokens for API testing
    try {
      const authResponse = await this.cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: nullableToString(this.userPoolId),
          ClientId: nullableToString(this.clientId),
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        })
      );
      
      return {
        idToken: nullableToString(authResponse.AuthenticationResult?.IdToken),
        accessToken: nullableToString(authResponse.AuthenticationResult?.AccessToken),
        refreshToken: nullableToString(authResponse.AuthenticationResult?.RefreshToken),
      };
    } catch (error) {
      console.error(`Failed to get auth tokens:`, error);
      throw error;
    }
  }

  async cleanup() {
    if (!this.userPoolId) {
      console.log('⚠️  Cognito not configured, skipping cleanup');
      return;
    }

    console.log(`🧹 Cleaning up ${this.createdUsers.length} test users...`);
    
    for (const user of this.createdUsers) {
      try {
        await this.cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: nullableToString(this.userPoolId),
            Username: user.cognitoUsername || user.email,
          })
        );
        console.log(`  ✓ Deleted ${user.email}`);
      } catch (error: any) {
        if (error.name === 'UserNotFoundException') {
          console.log(`  ⚠️  User ${user.email} already deleted`);
        } else {
          console.error(`  ✗ Failed to delete ${user.email}:`, error.message);
        }
      }
    }
    
    this.createdUsers = [];
  }
  
  // Helper method for tests to sign in via UI
  getTestCredentials(index: number = 0): TestUser | undefined {
    return this.createdUsers[index];
  }

  // Get all created users
  getAllTestUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  // Check if auth is configured
  isConfigured(): boolean {
    return !!(this.userPoolId && this.clientId);
  }
}

// Singleton instance for test suite
let testAuthHelper: TestAuthHelper | null = null;

export function getTestAuthHelper(): TestAuthHelper {
  if (!testAuthHelper) {
    testAuthHelper = new TestAuthHelper();
  }
  return testAuthHelper;
}

// Clean up on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (testAuthHelper) {
      await testAuthHelper.cleanup();
    }
  });
}