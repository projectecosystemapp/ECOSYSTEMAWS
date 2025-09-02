import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import config from '@/amplify_outputs.json';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';


// Create Amplify Data client
const client = generateServerClientUsingCookies({
  config,
  cookies,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse the request body
    const body = await request.json();
    const { action, ...params } = body;

    // 3. Call Lambda through GraphQL custom query (THE AMPLIFY WAY!)
    const response = await client.queries.stripeConnect({
      action,
      providerId: user.userId,
      ...params,
    });

    // 4. Check for errors
    if (response.errors) {
      console.error('Stripe Connect errors:', response.errors);
      return NextResponse.json(
        { error: 'Operation failed', details: response.errors },
        { status: 400 }
      );
    }

    // 5. Return the result
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Stripe Connect API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}