import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/resource';

// Get the Lambda function URL from environment
const STRIPE_LAMBDA_URL = process.env.STRIPE_CONNECT_LAMBDA_URL || process.env.NEXT_PUBLIC_STRIPE_LAMBDA_URL;

export async function POST(request: NextRequest) {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        // Get current user
        const user = await getCurrentUser(contextSpec);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Create client
        const client = generateClient<Schema>();

        const { action } = await request.json();

        // Get or create user profile
        const { data: profiles } = await client.models.UserProfile.list();
        
        // Filter profiles to find the user's profile
        let userProfile = profiles?.find(p => p.email === user.signInDetails?.loginId) || null;
        const userId = user.userId;
        const userEmail = user.signInDetails?.loginId || '';

        // If Lambda URL is not configured, return error
        if (!STRIPE_LAMBDA_URL) {
          console.error('Stripe Lambda URL not configured');
          return NextResponse.json(
            { error: 'Payment system not configured. Please contact support.' },
            { status: 503 }
          );
        }

        if (action === 'create' || action === 'CREATE_CONNECT_ACCOUNT') {
          // Check if user already has a Stripe account
          if (userProfile?.stripeAccountId) {
            // Account exists, create a new onboarding link via Lambda
            const lambdaResponse = await fetch(STRIPE_LAMBDA_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.AWS_API_KEY || '',
              },
              body: JSON.stringify({
                action: 'CREATE_ACCOUNT_LINK',
                providerId: userProfile.id,
                accountId: userProfile.stripeAccountId,
                refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
                returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding-complete`,
              }),
            });

            const result = await lambdaResponse.json();
            return NextResponse.json({ 
              accountLinkUrl: result.url,
              accountId: userProfile.stripeAccountId,
              existing: true 
            });
          }

          // Create new Express account via Lambda
          const lambdaResponse = await fetch(STRIPE_LAMBDA_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.AWS_API_KEY || '',
            },
            body: JSON.stringify({
              action: 'CREATE_CONNECT_ACCOUNT',
              providerId: userProfile?.id || userId,
              email: userEmail,
              refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
              returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding-complete`,
            }),
          });

          if (!lambdaResponse.ok) {
            throw new Error('Failed to create Stripe account');
          }

          const result = await lambdaResponse.json();

          // Save or update user profile with Stripe account ID
          if (userProfile) {
            const { data: updatedProfile } = await client.models.UserProfile.update({
              id: userProfile.id,
              stripeAccountId: result.accountId,
              stripeAccountStatus: 'PENDING',
              stripeOnboardingUrl: result.accountLinkUrl,
            });
            userProfile = updatedProfile || userProfile;
          } else {
            // Create new profile if it doesn't exist
            const { data: newProfile } = await client.models.UserProfile.create({
              email: userEmail,
              role: 'PROVIDER',
              stripeAccountId: result.accountId,
              stripeAccountStatus: 'PENDING',
              stripeOnboardingUrl: result.accountLinkUrl,
            });
            userProfile = newProfile || null;
          }

          return NextResponse.json({ 
            accountLinkUrl: result.accountLinkUrl,
            accountId: result.accountId,
            existing: false 
          });

        } else if (action === 'check_status' || action === 'CHECK_ACCOUNT_STATUS') {
          // Check account status
          if (!userProfile?.stripeAccountId) {
            return NextResponse.json({ 
              hasAccount: false,
              needsOnboarding: true 
            });
          }

          // Call Lambda to check Stripe account status
          const lambdaResponse = await fetch(STRIPE_LAMBDA_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.AWS_API_KEY || '',
            },
            body: JSON.stringify({
              action: 'CHECK_ACCOUNT_STATUS',
              providerId: userProfile.id,
            }),
          });

          if (!lambdaResponse.ok) {
            throw new Error('Failed to check account status');
          }

          const accountStatus = await lambdaResponse.json();

          // Update profile with latest Stripe status
          if (accountStatus.account) {
            const { data: updatedProfile } = await client.models.UserProfile.update({
              id: userProfile.id,
              stripeChargesEnabled: accountStatus.account.charges_enabled,
              stripePayoutsEnabled: accountStatus.account.payouts_enabled,
              stripeDetailsSubmitted: accountStatus.account.details_submitted,
              stripeAccountStatus: accountStatus.account.charges_enabled ? 'ACTIVE' : 'PENDING',
            });
          }

          return NextResponse.json({
            hasAccount: true,
            accountId: userProfile.stripeAccountId,
            chargesEnabled: accountStatus.account?.charges_enabled || false,
            payoutsEnabled: accountStatus.account?.payouts_enabled || false,
            detailsSubmitted: accountStatus.account?.details_submitted || false,
            requirements: accountStatus.account?.requirements,
            needsOnboarding: !accountStatus.account?.charges_enabled || !accountStatus.account?.details_submitted,
          });

        } else if (action === 'create_login_link' || action === 'CREATE_LOGIN_LINK') {
          // Create a login link for the Express dashboard
          if (!userProfile?.stripeAccountId) {
            return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 });
          }

          const lambdaResponse = await fetch(STRIPE_LAMBDA_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.AWS_API_KEY || '',
            },
            body: JSON.stringify({
              action: 'CREATE_LOGIN_LINK',
              providerId: userProfile.id,
            }),
          });

          if (!lambdaResponse.ok) {
            throw new Error('Failed to create login link');
          }

          const result = await lambdaResponse.json();
          return NextResponse.json({ 
            loginUrl: result.url 
          });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      },
    });
  } catch (error) {
    console.error('Stripe Connect API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}