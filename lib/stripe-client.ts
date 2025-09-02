// EXAMPLE: How to call Stripe functions from your React components
// This uses the Amplify Data client, NOT direct Lambda URLs!

import { generateClient } from 'aws-amplify/data';

import type { Schema } from '@/amplify/data/resource';

// Create the client
const client = generateClient<Schema>();

// Example: Create a Stripe Connect account
export async function createStripeAccount(providerId: string) {
  try {
    const response = await client.queries.stripeConnect({
      action: 'CREATE_ACCOUNT',
      providerId: providerId,
    });

    if (response.errors) {
      console.error('Errors:', response.errors);
      throw new Error('Failed to create account');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    throw error;
  }
}

// Example: Create a payment intent
export async function createPayment(params: {
  amount: number;
  connectedAccountId: string;
  customerId: string;
  serviceId: string;
  bookingId: string;
}) {
  try {
    const response = await client.queries.stripeConnect({
      action: 'CREATE_PAYMENT_INTENT',
      ...params,
    });

    if (response.errors) {
      console.error('Errors:', response.errors);
      throw new Error('Failed to create payment');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

// Example: Process a refund
export async function processRefund(paymentIntentId: string, amount?: number) {
  try {
    const response = await client.queries.stripeConnect({
      action: 'PROCESS_REFUND',
      paymentIntentId,
      amount,
    });

    if (response.errors) {
      console.error('Errors:', response.errors);
      throw new Error('Failed to process refund');
    }

    return response.data;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

// Use in a React component:
/*
import { createStripeAccount } from '@/lib/stripe-client';

function ProviderOnboarding() {
  const handleOnboarding = async () => {
    try {
      const result = await createStripeAccount(userId);
      window.location.href = result.onboardingUrl;
    } catch (error) {
      console.error('Onboarding failed:', error);
    }
  };

  return <button onClick={handleOnboarding}>Start Onboarding</button>;
}
*/