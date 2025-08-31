'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, Building2, CreditCard, Shield, Sparkles, AlertCircle } from 'lucide-react';

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
    description: 'Connect your Stripe account for payments',
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
    title: 'Complete',
    description: 'Start offering your services',
    icon: Sparkles,
  },
];

export default function ProviderOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripeStatus, setStripeStatus] = useState(null);
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessDescription: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    categories: [],
    serviceRadius: 10,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error);
  }, []);

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Save business data
    console.log('Business data:', businessData);
    setCurrentStep(1);
  };

  // Check for Stripe onboarding return
  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');
    
    if (success === 'true') {
      checkStripeStatus();
    } else if (refresh === 'true') {
      setError('Stripe onboarding was interrupted. Please try again.');
    }
  }, [searchParams]);

  const checkStripeStatus = async () => {
    if (!user?.userId) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'CHECK_ACCOUNT_STATUS',
          providerId: user.userId,
        }),
      });

      const data = await response.json();
      if (data.chargesEnabled && data.payoutsEnabled) {
        setCurrentStep(2);
        setStripeStatus(data);
      } else {
        setError('Stripe onboarding is not complete. Please finish the setup process.');
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      setError('Error checking Stripe status');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    if (!user?.userId) {
      setError('You must be logged in to connect Stripe');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'CREATE_ACCOUNT',
          providerId: user.userId,
        }),
      });

      const data = await response.json();
      if (response.ok && data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error(data.error || 'Failed to create Stripe account');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect Stripe');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <form onSubmit={handleBusinessSubmit} className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium mb-2">
                Business Name *
              </label>
              <input
                id="businessName"
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={businessData.businessName}
                onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="businessDescription" className="block text-sm font-medium mb-2">
                Business Description *
              </label>
              <textarea
                id="businessDescription"
                required
                rows={4}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={businessData.businessDescription}
                onChange={(e) => setBusinessData({ ...businessData, businessDescription: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessPhone" className="block text-sm font-medium mb-2">
                  Business Phone
                </label>
                <input
                  id="businessPhone"
                  type="tel"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={businessData.businessPhone}
                  onChange={(e) => setBusinessData({ ...businessData, businessPhone: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="businessEmail" className="block text-sm font-medium mb-2">
                  Business Email
                </label>
                <input
                  id="businessEmail"
                  type="email"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={businessData.businessEmail}
                  onChange={(e) => setBusinessData({ ...businessData, businessEmail: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium mb-2">
                Website
              </label>
              <input
                id="website"
                type="url"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={businessData.website}
                onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="serviceRadius" className="block text-sm font-medium mb-2">
                Service Radius (miles)
              </label>
              <input
                id="serviceRadius"
                type="number"
                min="1"
                max="100"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={businessData.serviceRadius}
                onChange={(e) => setBusinessData({ ...businessData, serviceRadius: parseInt(e.target.value) })}
              />
            </div>

            <Button type="submit" className="w-full">
              Continue to Payment Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        );

      case 1:
        return (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Special Offer: 8% Commission Rate</h3>
              <p className="text-blue-700">
                As an early adopter, you'll receive our lowest commission rate of just 8% 
                (compared to the standard 10%). This rate is locked in for the lifetime of your account!
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Why Stripe?</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Secure payment processing with industry-leading fraud protection</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Automatic deposits to your bank account</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Real-time payment tracking and reporting</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span>Support for multiple payment methods</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleStripeConnect} 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect with Stripe'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              You'll be redirected to Stripe to complete the setup. This typically takes 5-10 minutes.
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Identity Verification</h3>
              <p className="text-muted-foreground">
                We need to verify your identity to ensure the safety and trust of our marketplace.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a government-issued ID (Driver's License, Passport, or State ID)
                </p>
                <Button variant="outline">Choose File</Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Upload proof of business (Business License, Registration, or Tax Document)
                </p>
                <Button variant="outline">Choose File</Button>
              </div>
            </div>

            <Button className="w-full" onClick={() => setCurrentStep(3)}>
              Submit for Verification
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <Sparkles className="h-20 w-20 text-yellow-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
              <p className="text-muted-foreground">
                Your provider account has been successfully set up.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-2">You're part of something special!</h3>
              <p className="text-green-700 mb-4">
                As one of our founding providers, you've locked in the 8% commission rate forever.
                Thank you for joining the Ecosystem Global Solutions family!
              </p>
              <Badge className="bg-green-600">Founding Provider - 8% Commission</Badge>
            </div>

            <div className="space-y-3">
              <Button onClick={() => router.push('/provider/dashboard')} className="w-full" size="lg">
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => router.push('/provider/services/new')} 
                variant="outline" 
                className="w-full"
              >
                Add Your First Service
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Become a Provider</h1>
          <p className="text-muted-foreground">
            Join thousands of providers offering services on our platform
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                    index <= currentStep
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-400'
                  )}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium text-center hidden sm:block">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-1/2 w-full h-0.5',
                    index < currentStep ? 'bg-primary' : 'bg-gray-200'
                  )}
                  style={{ width: 'calc(100% - 40px)', left: '70%' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
        </Card>
      </div>
    </div>
    </Suspense>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
