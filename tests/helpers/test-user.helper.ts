import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminDeleteUserCommand, 
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  AdminGetUserCommand,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'crypto';
import { testConfig } from '../config/test.config';

export interface TestUser {
  username: string;
  password: string;
  role: 'CUSTOMER' | 'PROVIDER';
  userId?: string;
  email: string;
}

export class TestUserHelper {
  private cognito: CognitoIdentityProviderClient;
  private createdUsers: string[] = [];
  private userPoolId: string;

  constructor() {
    this.cognito = new CognitoIdentityProviderClient({ 
      region: testConfig.staging.awsRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    });
    this.userPoolId = testConfig.staging.cognitoUserPoolId;
  }

  /**
   * Create a test user with automatic email verification
   */
  async createTestUser(role: 'CUSTOMER' | 'PROVIDER'): Promise<TestUser> {
    const randomId = randomBytes(8).toString('hex');
    const username = `${testConfig.testData.userPrefix}-${role.toLowerCase()}-${randomId}@test.ecosystem.com`;
    const password = `Test123!${randomBytes(4).toString('hex')}`;
    
    try {
      // Create user in Cognito
      const createResponse = await this.cognito.send(new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        MessageAction: 'SUPPRESS', // Don't send welcome email
        TemporaryPassword: password,
        UserAttributes: [
          { Name: 'email', Value: username },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: role }
        ],
      }));

      // Set permanent password
      await this.cognito.send(new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        Password: password,
        Permanent: true,
      }));

      // Track for cleanup
      this.createdUsers.push(username);
      
      return { 
        username, 
        password, 
        role,
        userId: createResponse.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value,
        email: username
      };
    } catch (error) {
      console.error(`Failed to create test user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Create multiple test users
   */
  async createTestUsers(count: number, role: 'CUSTOMER' | 'PROVIDER'): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser(role);
      users.push(user);
    }
    return users;
  }

  /**
   * Delete a specific test user
   */
  async deleteTestUser(username: string): Promise<void> {
    try {
      await this.cognito.send(new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      }));
      
      // Remove from tracking
      this.createdUsers = this.createdUsers.filter(u => u !== username);
    } catch (error: any) {
      // Ignore if user doesn't exist
      if (error.name !== 'UserNotFoundException') {
        console.error(`Failed to delete test user ${username}:`, error);
      }
    }
  }

  /**
   * Get user details from Cognito
   */
  async getUserDetails(username: string): Promise<any> {
    try {
      const response = await this.cognito.send(new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      }));
      
      const attributes: Record<string, string> = {};
      response.UserAttributes?.forEach(attr => {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      });
      
      return attributes;
    } catch (error) {
      console.error(`Failed to get user details for ${username}:`, error);
      return null;
    }
  }

  /**
   * Simulate email verification (for testing)
   */
  async confirmUserSignUp(username: string): Promise<void> {
    try {
      await this.cognito.send(new AdminConfirmSignUpCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      }));
    } catch (error) {
      console.error(`Failed to confirm sign up for ${username}:`, error);
      throw error;
    }
  }

  /**
   * Confirm a user by email and return their Cognito sub ID
   */
  async confirmUserByEmail(email: string): Promise<string> {
    try {
      // Confirm the sign-up
      await this.cognito.send(new AdminConfirmSignUpCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      }));
      
      // Get the user's sub
      const userResponse = await this.cognito.send(new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      }));
      
      const cognitoSub = userResponse.UserAttributes?.find(
        attr => attr.Name === 'sub'
      )?.Value;
      
      if (!cognitoSub) {
        throw new Error('Could not retrieve user ID after confirmation');
      }
      
      // Track for cleanup
      this.createdUsers.push(email);
      
      console.log(`✅ Confirmed user ${email} with ID: ${cognitoSub}`);
      return cognitoSub;
    } catch (error) {
      console.error(`Failed to confirm user ${email}:`, error);
      throw error;
    }
  }

  /**
   * Clean up all created test users
   */
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.createdUsers.length} test users...`);
    
    const deletePromises = this.createdUsers.map(async (username) => {
      try {
        await this.cognito.send(new AdminDeleteUserCommand({
          UserPoolId: this.userPoolId,
          Username: username,
        }));
        console.log(`Deleted test user: ${username}`);
      } catch (error: any) {
        if (error.name !== 'UserNotFoundException') {
          console.error(`Failed to delete test user ${username}:`, error);
        }
      }
    });
    
    await Promise.all(deletePromises);
    this.createdUsers = [];
  }

  /**
   * Clean up old test users (maintenance task)
   */
  async cleanupOldTestUsers(olderThanHours: number = 24): Promise<void> {
    try {
      const response = await this.cognito.send(new ListUsersCommand({
        UserPoolId: this.userPoolId,
        Filter: `email ^= "${testConfig.testData.userPrefix}"`,
      }));

      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      for (const user of response.Users || []) {
        const createDate = user.UserCreateDate?.getTime() || 0;
        if (createDate < cutoffTime && user.Username) {
          await this.deleteTestUser(user.Username);
          console.log(`Cleaned up old test user: ${user.Username}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old test users:', error);
    }
  }

  /**
   * Get the list of created users (for debugging)
   */
  getCreatedUsers(): string[] {
    return [...this.createdUsers];
  }
}