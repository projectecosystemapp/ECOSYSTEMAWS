import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  
  // More specific list of protected routes
  const protectedRoutes = [
    '/provider', 
    '/customer/dashboard', 
    '/admin',
    '/bookings',
    '/messages',
    '/notifications',
    '/dashboard'
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: async (contextSpec) => {
        try {
          const session = await fetchAuthSession(contextSpec);
          // Explicit null check for strict boolean expressions
          return session?.tokens?.accessToken != null;
        } catch {
          return false;
        }
      },
    });

    if (!authenticated) {
      // Corrected redirect path
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};