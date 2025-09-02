'use client';

import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


export default function OnboardingComplete() {
  const router = useRouter();

  useEffect(() => {
    // After returning from Stripe, check the account status
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_status' }),
      });

      const data = await response.json();

      // Give user feedback and redirect
      setTimeout(() => {
        if (data.chargesEnabled && data.payoutsEnabled) {
          // Fully onboarded - go to dashboard
          router.push('/provider/dashboard');
        } else {
          // Still needs more info - back to onboarding
          router.push('/provider/onboarding');
        }
      }, 3000);
    } catch (error) {
      console.error('Error checking account status:', error);
      // Redirect to onboarding page on error
      setTimeout(() => {
        router.push('/provider/onboarding');
      }, 3000);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
          <CardDescription>
            We're verifying your payment account status...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Please wait while we check your account status. You'll be redirected automatically.
          </p>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => router.push('/provider/onboarding')}
              variant="outline"
            >
              Return to Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}