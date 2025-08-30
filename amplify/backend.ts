import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { stripeConnect } from './functions/stripe-connect/resource.js';

defineBackend({
  auth,
  data,
  stripeConnect,
});