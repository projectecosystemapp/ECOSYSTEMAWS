import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

// Create the Amplify client
export const client = generateClient<Schema>({
  authMode: 'userPool',
});

export default client;