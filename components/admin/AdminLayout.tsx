'use client';

import { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import AdminNav from './AdminNav';
import { userProfileApi } from '@/lib/api';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        // Get user profile to check role
        const profiles = await userProfileApi.list();
        const currentUserProfile = profiles?.find(
          profile => profile.email === user.signInDetails?.loginId
        );

        if (!currentUserProfile || currentUserProfile.role !== 'ADMIN') {
          // Redirect non-admin users
          router.push('/dashboard');
          return;
        }

        setUserProfile(currentUserProfile);
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/dashboard');
      }
    };

    checkAdminAccess();
  }, [user, router]);

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authorized (user will be redirected)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {title && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}