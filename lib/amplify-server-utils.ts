import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth/server';
import { NextRequest } from 'next/server';

import outputs from '@/amplify_outputs.json';


export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

// Type definition for authenticated user
interface AuthenticatedUser {
  userId: string;
  username: string;
  attributes: Record<string, string>;
  groups: string[];
}

// Helper function for authenticated users with explicit return type
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  return await runWithAmplifyServerContext({
    nextServerContext: { request: req },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        
        // Explicit null check for TypeScript strict mode
        if (session.tokens?.idToken == null) {
          return null;
        }

        const user = await getCurrentUser(contextSpec);
        const attributes = await fetchUserAttributes(contextSpec);
        
        // Type-safe extraction of groups
        const cognitoGroups = session.tokens.idToken.payload['cognito:groups'];
        const groups = Array.isArray(cognitoGroups) ? cognitoGroups as string[] : [];

        return {
          userId: user.userId,
          username: user.username,
          attributes,
          groups,
        };
      } catch (error) {
        console.error('Authentication error:', error);
        return null;
      }
    },
  });
}