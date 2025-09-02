import { vi } from 'vitest';

// Mock the Amplify adapter for a consistent test environment
vi.mock('@aws-amplify/adapter-nextjs', () => ({
  createServerRunner: () => ({
    // Mock the core function to immediately execute the operation
    // with a predefined context, simulating an authenticated 'Provider' user.
    runWithAmplifyServerContext: vi.fn(async ({ operation }) => {
      const mockContextSpec = {
        tokens: {
          idToken: {
            payload: { 'cognito:groups': ['Providers'] }
          }
        }
      };
      return operation(mockContextSpec);
    }),
  }),
  // This client is also needed for server-side calls
  generateServerClientUsingCookies: vi.fn(),
}));

// Mock essential environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
