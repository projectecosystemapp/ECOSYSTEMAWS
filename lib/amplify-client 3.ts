import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs, { ssr: true });

// Generate the data client
export const client = generateClient<Schema>();

// Auth helpers
export const auth = {
  getCurrentUser,
  signIn,
  signOut,
  signUp,
};

export type { Schema };