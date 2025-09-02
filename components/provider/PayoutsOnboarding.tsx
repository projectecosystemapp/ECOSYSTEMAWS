'use client';

import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  CreditCard,
  Shield,
  Loader2,
  RefreshCcw,
  ChevronRight,
  User,
  Building,
  FileText,
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';


interface StripeAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  capabilities?: {
    card_payments?: string;
    transfers?: string;
  };
}

interface OnboardingRequirement {
  id: string;
  label: string;
  description: string;
  status: 'complete' | 'pending' | 'required' | 'verification';
  icon: React.ReactNode;
}

export function PayoutsOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Check account status on mount
  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      setCheckingStatus(true);
      setError(null);

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECK_ACCOUNT_STATUS' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check account status');
      }

      if (data.status) {
        setAccountStatus(data.status);
        calculateProgress(data.status);
      }
    } catch (err) {
      console.error('Error checking account status:', err);
      // If no account exists, that's expected for new providers
      setAccountStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  };

  const calculateProgress = (status: StripeAccountStatus) => {
    let completed = 0;
    const total = 4;

    if (status.accountId) completed++;
    if (status.detailsSubmitted) completed++;
    if (status.chargesEnabled) completed++;
    if (status.payoutsEnabled) completed++;

    setProgress((completed / total) * 100);
  };

  const createStripeAccount = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_ACCOUNT' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Stripe account');
      }

      // After creating account, get the onboarding link
      await getOnboardingLink(data.accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingLink = async (accountId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'CREATE_ACCOUNT_LINK',
          accountId: accountId || accountStatus?.accountId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get onboarding link');
      }

      if (data.url) {
        // Open Stripe onboarding in new window
        window.open(data.url, '_blank');
        setOnboardingUrl(data.url);
        
        // Start polling for status updates
        setTimeout(() => {
          checkAccountStatus();
        }, 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get onboarding link');
    } finally {
      setLoading(false);
    }
  };

  const getRequirements = (): OnboardingRequirement[] => {
    const requirements: OnboardingRequirement[] = [
      {
        id: 'account',
        label: 'Account Created',
        description: 'Stripe Connect account has been created',
        status: accountStatus?.accountId ? 'complete' : 'required',
        icon: <User className="h-4 w-4" />
      },
      {
        id: 'business',
        label: 'Business Information',
        description: 'Company details and tax information',
        status: accountStatus?.detailsSubmitted ? 'complete' : 
                accountStatus?.accountId ? 'pending' : 'required',
        icon: <Building className="h-4 w-4" />
      },
      {
        id: 'identity',
        label: 'Identity Verification',
        description: 'Personal identification and verification',
        status: accountStatus?.requirements?.pendingVerification?.length ? 'verification' :
                accountStatus?.detailsSubmitted ? 'complete' : 'pending',
        icon: <FileText className="h-4 w-4" />
      },
      {
        id: 'payments',
        label: 'Payment Activation',
        description: 'Ability to accept payments and receive payouts',
        status: accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled ? 'complete' :
                accountStatus?.detailsSubmitted ? 'verification' : 'pending',
        icon: <CreditCard className="h-4 w-4" />
      }
    ];

    return requirements;
  };

  const getStatusBadge = () => {
    if (!accountStatus) {
      return <Badge variant="secondary">Not Started</Badge>;
    }
    if (accountStatus.chargesEnabled && accountStatus.payoutsEnabled) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (accountStatus.requirements?.currentlyDue?.length) {
      return <Badge variant="destructive">Action Required</Badge>;
    }
    if (accountStatus.detailsSubmitted) {
      return <Badge className="bg-yellow-500">Under Review</Badge>;
    }
    return <Badge variant="outline">In Progress</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'verification':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'required':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (checkingStatus) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking payment setup status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isComplete = accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Payment Setup</CardTitle>
              <CardDescription className="mt-2">
                Set up your payment account to start receiving earnings from your services
              </CardDescription>
            </div>
            <div className="text-right">
              {getStatusBadge()}
              {accountStatus?.accountId && (
                <p className="text-xs text-gray-500 mt-2">
                  ID: {accountStatus.accountId}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Security Notice */}
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span>Secure payment processing powered by Stripe</span>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Requirements Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Requirements</CardTitle>
          <CardDescription>
            Complete all requirements to start accepting payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getRequirements().map((req, index) => (
              <div key={req.id}>
                <div className="flex items-start space-x-3">
                  {getStatusIcon(req.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {req.icon}
                      <span className="font-medium">{req.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                    
                    {/* Show specific requirements if any */}
                    {req.id === 'identity' && accountStatus?.requirements?.currentlyDue?.length ? (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                        <p className="font-medium text-yellow-800">Action needed:</p>
                        <ul className="mt-1 space-y-1">
                          {accountStatus.requirements.currentlyDue.map((item) => (
                            <li key={item} className="text-yellow-700">• {item.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
                {index < getRequirements().length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          {!accountStatus?.accountId ? (
            // No account yet - show create button
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Ready to get started?</h3>
                <p className="text-sm text-gray-600">
                  Create your payment account to start accepting payments and receiving payouts
                </p>
              </div>
              <Button
                onClick={createStripeAccount}
                disabled={loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Create Payment Account
                  </>
                )}
              </Button>
            </div>
          ) : !isComplete ? (
            // Account exists but not complete - show continue button
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Continue Setup</h3>
                <p className="text-sm text-gray-600">
                  {accountStatus.detailsSubmitted 
                    ? 'Your information is under review. You may need to provide additional details.'
                    : 'Complete your account setup to start accepting payments'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => getOnboardingLink()}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Continue Setup
                    </>
                  )}
                </Button>
                <Button
                  onClick={checkAccountStatus}
                  variant="outline"
                  size="lg"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : (
            // Account is complete
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">You're all set!</h3>
                <p className="text-sm text-gray-600">
                  Your payment account is active. You can now accept payments and receive payouts.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => router.push('/provider/earnings')}
                  size="lg"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Earnings
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={() => getOnboardingLink()}
                  variant="outline"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>1. Create your Stripe Connect account</p>
            <p>2. Provide business and identity information</p>
            <p>3. Complete identity verification</p>
            <p>4. Start accepting payments from customers</p>
            <p>5. Receive automatic payouts to your bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• Platform fee: 8% of each transaction</p>
            <p>• Stripe processing: 2.9% + 30¢</p>
            <p>• No monthly fees or hidden charges</p>
            <p>• Daily automatic payouts available</p>
            <p>• Full transaction history and reporting</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}