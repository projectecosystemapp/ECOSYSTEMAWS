# Test Infrastructure Setup

## Authentication Testing Setup

To run E2E tests with real authentication, you need to configure AWS Cognito test credentials.

### 1. Create Test Environment File

Copy the example configuration:
```bash
cp tests/config/test.env.example tests/config/.env.test
```

### 2. Fill in AWS Cognito Credentials

Edit `tests/config/.env.test` with your test Cognito pool details:

- `VITE_TEST_USER_POOL_ID`: Your Cognito User Pool ID
- `VITE_TEST_USER_POOL_CLIENT_ID`: Your Cognito App Client ID  
- `AWS_ACCESS_KEY_ID`: AWS credentials with Cognito admin permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (e.g., us-east-1)

### 3. Required AWS Permissions

The AWS credentials need these Cognito permissions:
- `AdminCreateUser`
- `AdminSetUserPassword`
- `AdminAddUserToGroup`
- `AdminDeleteUser`
- `AdminInitiateAuth`

### 4. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/auth/real-booking.spec.ts

# Run with specific browser
npm run test:e2e -- --project=chromium
```

## Test Helpers

### TestAuthHelper

Creates real Cognito users for testing:

```typescript
import { getTestAuthHelper } from './helpers/auth.helper';

const authHelper = getTestAuthHelper();
const customer = await authHelper.createTestUser('CUSTOMER');
const provider = await authHelper.createTestUser('PROVIDER');
```

### TestDataSeeder

Creates test data with authenticated GraphQL client:

```typescript
import { TestDataSeeder } from './helpers/test-data.seeder';

const seeder = new TestDataSeeder(testUser);
await seeder.createProviderProfile(providerId, {...});
```

## Important Notes

- Test users are automatically cleaned up after tests
- Never commit `.env.test` or `.env.test.local` files
- Tests will skip if authentication is not configured
- Use the global test setup for consistent initialization