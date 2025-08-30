'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function TestStripePage() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testStripeConnection = async () => {
    setStatus('testing');
    setMessage('');

    try {
      // Test if the publishable key is loaded
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey || publishableKey.includes('your_publishable_key_here')) {
        throw new Error('Stripe publishable key not configured');
      }

      if (!publishableKey.startsWith('pk_test_')) {
        throw new Error('Invalid Stripe publishable key format');
      }

      // Test API endpoint (we'll create this next)
      const response = await fetch('/api/test-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(`Stripe connection successful! Account ID: ${data.accountId}`);
      } else {
        throw new Error(data.error || 'Failed to connect to Stripe');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to test Stripe connection');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Stripe Integration Test</CardTitle>
          <CardDescription>
            Verify your Stripe configuration is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Publishable Key</span>
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') ? (
                <Badge className="bg-green-100 text-green-800">Configured</Badge>
              ) : (
                <Badge variant="destructive">Not Set</Badge>
              )}
            </div>
            <code className="block text-xs bg-gray-100 p-2 rounded truncate">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}...
            </code>
          </div>

          <Button 
            onClick={testStripeConnection} 
            className="w-full"
            disabled={status === 'testing'}
          >
            {status === 'testing' ? 'Testing Connection...' : 'Test Stripe Connection'}
          </Button>

          {status === 'success' && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Success!</p>
                <p className="text-xs text-green-600 mt-1">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-xs text-red-600 mt-1">{message}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              This page tests your Stripe configuration. Once verified, you can:
            </p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>• Process payments through Stripe</li>
              <li>• Set up Stripe Connect for providers</li>
              <li>• Handle 8% commission automatically</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}