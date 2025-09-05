'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import outputs from '@/amplify_outputs.json';
import UnifiedNav from '@/components/navigation/UnifiedNav';

import '@aws-amplify/ui-react/styles.css';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Configure Amplify on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        Amplify.configure(outputs, {
          ssr: true,
        });
      } catch (error) {
        console.log('Amplify already configured');
      }
    }
  }, []);
  
  // Don't show navigation on auth pages or initial landing
  const hideNav = pathname.startsWith('/auth/') || pathname === '/';
  
  return (
    <Authenticator.Provider>
      {!hideNav && <UnifiedNav />}
      <main className={!hideNav ? 'min-h-[calc(100vh-4rem)]' : ''}>
        {children}
      </main>
    </Authenticator.Provider>
  );
}