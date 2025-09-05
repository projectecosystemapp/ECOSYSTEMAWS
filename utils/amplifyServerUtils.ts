import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth/server';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import outputs from '@/amplify_outputs.json'; // Use aliased path
import { NextRequest } from 'next/server';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

// This is the core of our server-side Amplify configuration
export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

/**
 * A server-side helper to get authenticated user details from a NextRequest.
 * Use this in your API routes to protect endpoints and get user context.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  return await runWithAmplifyServerContext({
    nextServerContext: { request: req },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        // Abort if the user is not authenticated
        if (!session.tokens?.idToken) {
          return null;
        }

        const user = await getCurrentUser(contextSpec);
        const attributes = await fetchUserAttributes(contextSpec);

        return {
          userId: nullableToString(user.userId),
          username: nullableToString(user.username),
          attributes,
          // Safely access Cognito groups from the ID token payload
          groups: session.tokens.idToken.payload['cognito:groups'] || [],
        };
      } catch (error) {
        console.error('Authentication error in getAuthenticatedUser:', error);
        return null;
      }
    },
  });
}

// Helper to create server client with cookies (must be called within server context)
export function createServerClient() {
  return generateServerClientUsingCookies({
    config: outputs,
  });
}
