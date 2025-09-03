'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Building2, 
  CreditCard, 
  Shield, 
  Sparkles, 
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  DollarSign,
  FileText,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeConnectOperation } from '@/lib/amplify-client-wrapper';


const steps = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Tell us about your business',
    icon: Building2,
  },
  {
    id: 'stripe',
    title: 'Payment Setup',
    description: 'Connect your bank account for payouts',
    icon: CreditCard,
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Verify your identity and business',
    icon: Shield,
  },
  {
    id: 'complete',
    title: 'Ready to Earn',
    description: 'Start accepting bookings and payments',
    icon: Sparkles,
  },
];

export default function ProviderOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState('');
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    try {
      setCheckingStatus(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Use the new wrapper that supports feature flags
      const data = await stripeConnectOperation({
        action: 'CHECK_ACCOUNT_STATUS',
        providerId: nullableToString(user.userId),
      });
      setStripeStatus(data);
      setAccountId(data.accountId);

      // Determine current step based on status
      if (!data.hasAccount) {
        setCurrentStep(0);
      } else if (data.needsOnboarding) {
        setCurrentStep(1);
      } else if (data.chargesEnabled && data.payoutsEnabled) {
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      setError('Failed to check payment setup status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const startStripeOnboarding = async () => {
    try {
      setLoading(true);
      setError('');
      
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Use the new wrapper for creating Stripe account
      const data = await stripeConnectOperation({
        action: 'CREATE_ACCOUNT',
        providerId: nullableToString(user.userId),
      });

      if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error('Failed to create onboarding link');
      }
    } catch (err) {
      console.error('Error starting Stripe onboarding:', err);
      setError('Failed to start payment setup. Please try again.');
      setLoading(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user || !accountId) {
        setError('Account not found');
        return;
      }

      // Use the new wrapper for creating account link
      const data = await stripeConnectOperation({
        action: 'CREATE_ACCOUNT_LINK',
        providerId: nullableToString(user.userId),
        connectedAccountId: accountId,
      });
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening Stripe dashboard:', err);
      setError('Failed to open payment dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Provider Setup</h1>
        <p className="text-muted-foreground">
          Complete your profile to start accepting bookings and payments
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2
                    ${isComplete ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-primary text-white' : ''}
                    ${!isComplete && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {isComplete ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center hidden sm:block">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    absolute top-6 left-1/2 w-full h-0.5
                    ${isComplete ? 'bg-green-500' : 'bg-muted'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Setup Card */}
      {currentStep <= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Account Setup
            </CardTitle>
            <CardDescription>
              Connect your bank account to receive payouts from bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Display */}
            {stripeStatus?.hasAccount && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Payments</p>
                      <p className="text-sm text-muted-foreground">Accept customer payments</p>
                    </div>
                  </div>
                  <Badge variant={stripeStatus.chargesEnabled ? 'success' : 'secondary'}>
                    {stripeStatus.chargesEnabled ? 'Active' : 'Pending'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Account Details</p>
                      <p className="text-sm text-muted-foreground">Business and tax information</p>
                    </div>
                  </div>
                  <Badge variant={stripeStatus.detailsSubmitted ? 'success' : 'secondary'}>
                    {stripeStatus.detailsSubmitted ? 'Submitted' : 'Required'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Payouts</p>
                      <p className="text-sm text-muted-foreground">Receive earnings to your bank</p>
                    </div>
                  </div>
                  <Badge variant={stripeStatus.payoutsEnabled ? 'success' : 'secondary'}>
                    {stripeStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!stripeStatus?.hasAccount && (
                <div className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      We partner with Stripe to securely handle all payments. Your financial information 
                      is never stored on our servers.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={startStripeOnboarding} 
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Start Payment Setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {stripeStatus?.hasAccount && stripeStatus?.needsOnboarding && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your payment account needs additional information. Please complete the setup to start accepting payments.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button 
                      onClick={startStripeOnboarding} 
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Continue Setup
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={checkStripeStatus}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {currentStep === 3 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              You're All Set!
            </CardTitle>
            <CardDescription>
              Your payment account is active and ready to accept bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">$0.00</p>
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">Daily</p>
                      <p className="text-sm text-muted-foreground">Payout Schedule</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => router.push('/provider/dashboard')}
                className="flex-1"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={openStripeDashboard}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    View Stripe Dashboard
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}