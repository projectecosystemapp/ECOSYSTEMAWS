'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerification = async () => {
    if (!code) {
      toast({
        title: 'Verification code required',
        description: 'Please enter the verification code sent to your email',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      
      // Redirect to confirmed page which will handle role-based routing
      window.location.href = '/auth/confirmed';
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await resendSignUpCode({ username: email });
      toast({
        title: 'Code resent',
        description: 'A new verification code has been sent to your email',
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: 'Failed to resend code',
        description: error.message || 'An error occurred while resending the code',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-16">
      <h1 className="text-2xl font-bold mb-6">Verify your email</h1>
      
      <Alert className="mb-6">
        <AlertDescription>
          We've sent a verification code to <strong>{email}</strong>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isVerifying}
          maxLength={6}
        />
        
        <Button 
          onClick={handleVerification} 
          disabled={isVerifying || !code}
          className="w-full"
        >
          {isVerifying ? 'Verifying...' : 'Verify Email'}
        </Button>

        <Button 
          onClick={handleResendCode}
          variant="outline"
          className="w-full"
          disabled={isResending || isVerifying}
        >
          {isResending ? 'Resending...' : 'Resend Code'}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Didn't receive the code? Check your spam folder or click resend.
      </p>
    </div>
  );
}