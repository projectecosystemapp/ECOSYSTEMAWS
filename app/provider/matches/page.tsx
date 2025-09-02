'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { ProviderMatches } from '@/components/iso/provider-matches';

export default function ProviderMatchesPage() {
  const [providerId, setProviderId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setProviderId(user.userId);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!providerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Please log in to view matches.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Service Request Matches</h1>
          <p className="text-muted-foreground">
            AI-powered matches based on your services and expertise
          </p>
        </div>
        
        <ProviderMatches providerId={providerId} />
      </div>
    </div>
  );
}