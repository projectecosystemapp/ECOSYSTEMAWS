'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

export default function ConfirmedPage() {
  const router = useRouter();

  useEffect(() => {
    const routeUser = async () => {
      try {
        const { userId } = await getCurrentUser();
        
        // Fetch user record to determine account type
        const { data: users } = await client.models.User.list({
          filter: { ownerId: { eq: userId } }
        });
        
        const user = users?.[0];
        
        if (user?.accountType === 'PROVIDER') {
          router.push('/provider/dashboard');
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Routing error:', error);
        router.push('/auth/sign-in');
      }
    };

    routeUser();
  }, [router]);

  return (
    <div className="container max-w-md mx-auto py-16 text-center">
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 w-8 mx-auto rounded-full bg-primary/20" />
        </div>
        <h2 className="text-xl">Confirming your account...</h2>
        <p className="text-sm text-muted-foreground">
          Please wait while we set up your account
        </p>
      </div>
    </div>
  );
}