// AppSync-native Stripe Connect implementation
// Replaces deprecated Lambda URL architecture

import { getCurrentUser } from 'aws-amplify/auth/server';
import { generateClient } from 'aws-amplify/data';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { type Schema } from '@/amplify/data/resource';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';
import {
  type ApiResponse,
  sanitizeString,
  validateAndSanitizeInput,
} from '@/lib/api-types';

// Request validation schemas
const ConnectAccountActionSchema = z.enum([
  'create',
  'CREATE_CONNECT_ACCOUNT',
  'check_status',
  'CHECK_ACCOUNT_STATUS', 
  'create_login_link',
  'CREATE_LOGIN_LINK'
]);

const ConnectAccountRequestSchema = z.object({
  action: ConnectAccountActionSchema,
});

type ConnectAccountRequest = z.infer<typeof ConnectAccountRequestSchema>;

// AppSync-native implementation - no more Lambda URLs

// SECURITY FIX: CWE-287, CWE-863
// Risk: Inadequate authentication and authorization controls
// Mitigation: Strict validation, correlation tracking, sanitized inputs
// Validated: Multi-layer security with comprehensive audit logging

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  const correlationId = `connect-account-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  try {
    console.info(`[${correlationId}] Processing Stripe Connect account request`);
    
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        // 1. Authenticate user
        const user = await getCurrentUser(contextSpec);
        if (!user) {
          console.warn(`[${correlationId}] Unauthorized access attempt`);
          return NextResponse.json(
            { error: 'Authentication required' }, 
            { status: 401 }
          );
        }
        
        console.info(`[${correlationId}] Authenticated user: ${user.userId}`);
        
        // 2. Validate request body
        let validatedRequest: ConnectAccountRequest;
        try {
          const rawBody = await request.json();
          validatedRequest = validateAndSanitizeInput(rawBody, ConnectAccountRequestSchema);
        } catch (validationError) {
          console.warn(`[${correlationId}] Request validation failed:`, validationError);
          return NextResponse.json(
            { 
              error: 'Invalid request format',
              details: validationError instanceof Error ? validationError.message : 'Validation failed'
            },
            { status: 400 }
          );
        }

        const { action } = validatedRequest;
        
        // 3. Create GraphQL client
        const client = generateClient<Schema>({
          authMode: 'userPool',
        });

        // 4. Get user profile with proper error handling
        let userProfile: any = null;
        try {
          const { data: profiles } = await client.models.UserProfile.list({
            filter: {
              email: { eq: user.signInDetails?.loginId || '' }
            }
          });
          userProfile = profiles?.[0] || null;
        } catch (profileError) {
          console.error(`[${correlationId}] Failed to fetch user profile:`, profileError);
          return NextResponse.json(
            { error: 'Failed to retrieve user profile' },
            { status: 500 }
          );
        }
        
        const userId = user.userId;
        const userEmail = sanitizeString(user.signInDetails?.loginId || '');

        // Use AppSync stripeConnect mutation instead of Lambda URLs

        // 6. Process actions with enhanced security and logging
        if (action === 'create' || action === 'CREATE_CONNECT_ACCOUNT') {
          console.info(`[${correlationId}] Processing account creation/link for user ${userId}`);
          
          // Check if user already has a Stripe account
          if (userProfile?.stripeAccountId) {
            console.info(`[${correlationId}] Existing Stripe account found: ${userProfile.stripeAccountId}`);
            
            // Use AppSync stripeConnect mutation
            try {
              const { data, errors } = await client.queries.stripeConnect({
                action: 'CREATE_ACCOUNT_LINK',
                providerId: sanitizeString(userProfile.id),
                connectedAccountId: sanitizeString(userProfile.stripeAccountId),
                metadata: {
                  refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
                  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding-complete`,
                  correlationId,
                }
              });

              if (errors) {
                throw new Error(errors[0].message);
              }

              const result = data as any;
              
              console.info(`[${correlationId}] Account link created for existing account`);
              
              return NextResponse.json({
                success: true,
                data: {
                  accountLinkUrl: result.url,
                  accountId: userProfile.stripeAccountId,
                  existing: true
                }
              });
            } catch (lambdaError) {
              console.error(`[${correlationId}] Failed to create account link:`, lambdaError);
              return NextResponse.json(
                { error: 'Failed to create account onboarding link' },
                { status: 500 }
              );
            }
          }

          console.info(`[${correlationId}] Creating new Stripe Express account`);
          
          // Use AppSync stripeConnect mutation
          try {
            const { data, errors } = await client.queries.stripeConnect({
              action: 'CREATE_CONNECT_ACCOUNT',
              providerId: sanitizeString(userProfile?.id || userId),
              metadata: {
                email: userEmail,
                refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding?refresh=true`,
                returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/onboarding-complete`,
                correlationId,
              }
            });

            if (errors) {
              throw new Error(errors[0].message);
            }

            const result = data as any;
            
            console.info(`[${correlationId}] New Stripe account created: ${result.accountId}`);

            // Save or update user profile with Stripe account ID
            try {
              if (userProfile) {
                const { data: updatedProfile } = await client.models.UserProfile.update({
                  id: userProfile.id,
                  stripeAccountId: sanitizeString(result.accountId),
                  // Remove deprecated fields that don't exist in schema
                  // stripeAccountStatus: 'PENDING',
                  // stripeOnboardingUrl: result.accountLinkUrl,
                });
                userProfile = updatedProfile || userProfile;
                console.info(`[${correlationId}] Updated existing user profile`);
              } else {
                // Create new profile if it doesn't exist
                const { data: newProfile } = await client.models.UserProfile.create({
                  email: userEmail,
                  userType: 'PROVIDER', // Use userType instead of role
                  stripeAccountId: sanitizeString(result.accountId),
                  profileOwner: userId, // Set ownership
                });
                userProfile = newProfile || null;
                console.info(`[${correlationId}] Created new user profile`);
              }
            } catch (profileUpdateError) {
              console.error(`[${correlationId}] Failed to update user profile:`, profileUpdateError);
              // Continue despite profile update failure
            }

            return NextResponse.json({
              success: true,
              data: {
                accountLinkUrl: result.accountLinkUrl,
                accountId: result.accountId,
                existing: false
              }
            });
          } catch (lambdaError) {
            console.error(`[${correlationId}] Failed to create new Stripe account:`, lambdaError);
            return NextResponse.json(
              { error: 'Failed to create Stripe account' },
              { status: 500 }
            );
          }

        } else if (action === 'check_status' || action === 'CHECK_ACCOUNT_STATUS') {
          console.info(`[${correlationId}] Checking account status for user ${userId}`);
          // Check account status
          if (!userProfile?.stripeAccountId) {
            console.info(`[${correlationId}] No Stripe account found for user`);
            return NextResponse.json({
              success: true,
              data: {
                hasAccount: false,
                needsOnboarding: true
              }
            });
          }

          // Use AppSync stripeConnect query
          let accountStatus: any;
          try {
            const { data, errors } = await client.queries.stripeConnect({
              action: 'CHECK_ACCOUNT_STATUS',
              providerId: sanitizeString(userProfile.id),
            });

            if (errors) {
              throw new Error(errors[0].message);
            }

            accountStatus = data as any;
            console.info(`[${correlationId}] Account status retrieved`);
          } catch (statusError) {
            console.error(`[${correlationId}] Failed to check account status:`, statusError);
            return NextResponse.json(
              { error: 'Failed to retrieve account status' },
              { status: 500 }
            );
          }

          // Note: Skip profile update since those fields don't exist in current schema
          // This is part of the migration to AppSync-only architecture
          
          return NextResponse.json({
            success: true,
            data: {
              hasAccount: true,
              accountId: userProfile.stripeAccountId,
              chargesEnabled: accountStatus.account?.charges_enabled || false,
              payoutsEnabled: accountStatus.account?.payouts_enabled || false,
              detailsSubmitted: accountStatus.account?.details_submitted || false,
              requirements: accountStatus.account?.requirements || {},
              needsOnboarding: !accountStatus.account?.charges_enabled || !accountStatus.account?.details_submitted,
            }
          });

        } else if (action === 'create_login_link' || action === 'CREATE_LOGIN_LINK') {
          console.info(`[${correlationId}] Creating login link for user ${userId}`);
          // Create a login link for the Express dashboard
          if (!userProfile?.stripeAccountId) {
            console.warn(`[${correlationId}] No Stripe account found for login link creation`);
            return NextResponse.json(
              { error: 'No Stripe account found. Please complete onboarding first.' }, 
              { status: 400 }
            );
          }

          try {
            const { data, errors } = await client.queries.stripeConnect({
              action: 'CREATE_LOGIN_LINK',
              providerId: sanitizeString(userProfile.id),
            });

            if (errors) {
              throw new Error(errors[0].message);
            }

            const result = data as any;
            
            console.info(`[${correlationId}] Login link created successfully`);
            
            return NextResponse.json({
              success: true,
              data: {
                loginUrl: result.url
              }
            });
          } catch (loginError) {
            console.error(`[${correlationId}] Failed to create login link:`, loginError);
            return NextResponse.json(
              { error: 'Failed to create login link' },
              { status: 500 }
            );
          }
        }

        console.warn(`[${correlationId}] Invalid action requested: ${action}`);
        return NextResponse.json(
          { 
            error: 'Invalid action', 
            validActions: ['create', 'CREATE_CONNECT_ACCOUNT', 'check_status', 'CHECK_ACCOUNT_STATUS', 'create_login_link', 'CREATE_LOGIN_LINK']
          }, 
          { status: 400 }
        );
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${correlationId}] Stripe Connect API error after ${duration}ms:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        correlationId,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// SECURITY FIX: CWE-16
// Risk: Overly permissive CORS headers
// Mitigation: Restrict CORS to specific origins in production
// Validated: CORS headers follow security best practices

export async function OPTIONS(_request: NextRequest): Promise<NextResponse> {
  // TODO: In production, replace '*' with specific allowed origins
  const allowedOrigin = process.env.NODE_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000')
    : '*';
    
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-correlation-id',
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    },
  });
}