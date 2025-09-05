'use client';

import { getCurrentUser, AuthUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';

import { refactoredApi } from '@/lib/api/refactored';
import type { UserProfile } from '@/lib/types';

interface CustomerAuthGuardProps {
  children: ReactNode;
  requireCustomer?: boolean; // If true, requires user to have CUSTOMER role
  fallback?: ReactNode;
}

export default function CustomerAuthGuard({ 
  children, 
  requireCustomer = true,
  fallback 
}: CustomerAuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      const email = currentUser.signInDetails?.loginId;
      if (!email) {
        throw new Error('No email found for user');
      }

      // Get user profile
      const profile = await refactoredApi.userProfile.get(email);
      
      if (!profile) {
        // Create customer profile if it doesn't exist
        const newProfile: Partial<UserProfile> = {
          email,
          role: 'CUSTOMER',
          active: true
        };
        
        const createdProfile = await refactoredApi.userProfile.create(newProfile);
        setUserProfile(createdProfile);
      } else {
        setUserProfile(profile);
        
        // Check if user has customer role (if required)
        if (requireCustomer && profile.role !== 'CUSTOMER' && profile.role !== 'BOTH') {
          setError('Access denied. Customer account required.');
          return;
        }
      }
    } catch (authError: any) {
      console.error('Authentication error:', authError);
      
      if (authError.name === 'UserUnAuthenticatedError' || 
          authError.message?.includes('not authenticated')) {
        // Redirect to login
        router.push(`/auth/signin?redirect=${  encodeURIComponent(window.location.pathname)}`);
      } else {
        setError('Authentication error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full text-gray-600 py-2 px-4 rounded-md hover:text-gray-800 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback if provided and user is not authenticated
  if (!user || !userProfile) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized, show protected content
  return <>{children}</>;
}

// Higher-order component version
export function withCustomerAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { requireCustomer?: boolean } = {}
) {
  const ComponentWithAuth = (props: P) => (
    <CustomerAuthGuard requireCustomer={options.requireCustomer}>
      <WrappedComponent {...props} />
    </CustomerAuthGuard>
  );

  ComponentWithAuth.displayName = `withCustomerAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithAuth;
}