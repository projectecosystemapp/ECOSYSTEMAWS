import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../data/resource';
import { env } from '$amplify/env/post-confirmation-trigger';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: nullableToString(env.AMPLIFY_DATA_GRAPHQL_ENDPOINT),
        region: nullableToString(env.AWS_REGION),
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: nullableToString(env.AWS_ACCESS_KEY_ID),
            secretAccessKey: nullableToString(env.AWS_SECRET_ACCESS_KEY),
            sessionToken: nullableToString(env.AWS_SESSION_TOKEN),
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  }
);

const client = generateClient<Schema>({
  authMode: 'iam',
});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { userAttributes, request } = event;
  const { clientMetadata } = request;
  
  // Extract user information
  const ownerId = userAttributes.sub;
  const email = userAttributes.email;
  const accountType = clientMetadata?.role || 'CUSTOMER'; // Default to CUSTOMER if not specified

  try {
    // Create User record in DynamoDB
    await client.models.User.create({
      ownerId,
      email,
      accountType: accountType as 'CUSTOMER' | 'PROVIDER',
      createdAt: new Date().toISOString(),
    });

    console.log(`User record created for ${email} with role ${accountType}`);
  } catch (error) {
    console.error('Error creating User record:', error);
    // Don't throw - let user complete sign-up even if DB write fails
    // You may want to implement a retry mechanism or dead letter queue
  }

  return event;
};