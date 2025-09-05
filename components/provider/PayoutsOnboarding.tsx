'use client';

import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
  RefreshCcw,
  ChevronRight,
  User,
  Building,
  FileText,
  DollarSign,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { BankAccountSetup } from '@/components/provider/BankAccountSetup';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { awsPaymentClient, BankAccount, formatAmount } from '@/lib/aws-payment-client';

interface OnboardingRequirement {
  id: string;
  label: string;
  description: string;
  status: 'complete' | 'pending' | 'required' | 'verification';
  icon: React.ReactNode;
}

interface PayoutsOnboardingProps {
  providerId: string;
}

export function PayoutsOnboarding({ providerId }: PayoutsOnboardingProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'setup' | 'verification' | 'complete'>('setup');

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, [providerId]);

  const checkOnboardingStatus = async () => {
    try {
      setCheckingStatus(true);
      setError(null);

      const accounts = await awsPaymentClient.getProviderBankAccounts(providerId);
      setBankAccounts(accounts);

      // Determine current step and progress
      if (accounts.length === 0) {
        setCurrentStep('setup');
        setProgress(0);
      } else {
        const verifiedAccounts = accounts.filter(acc => acc.isVerified);
        if (verifiedAccounts.length === 0) {
          setCurrentStep('verification');
          setProgress(50);
        } else {
          setCurrentStep('complete');
          setProgress(100);
        }
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check onboarding status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const getRequirements = (): OnboardingRequirement[] => {
    const verifiedAccount = bankAccounts.find(acc => acc.isVerified);
    const unverifiedAccount = bankAccounts.find(acc => !acc.isVerified);

    return [
      {
        id: 'identity',
        label: 'Identity Verification',
        description: 'Verify your identity for secure payments',
        status: 'complete', // AWS Cognito handles this
        icon: <User className="h-5 w-5" />
      },
      {
        id: 'business',
        label: 'Business Information',
        description: 'Provide your business or personal details',
        status: 'complete', // Handled during provider signup
        icon: <Building className="h-5 w-5" />
      },
      {
        id: 'banking',
        label: 'Bank Account Setup',
        description: 'Add your bank account for receiving payments',
        status: verifiedAccount ? 'complete' : unverifiedAccount ? 'verification' : 'required',
        icon: <CreditCard className="h-5 w-5" />
      },
      {
        id: 'verification',
        label: 'Account Verification',
        description: 'Verify your bank account with micro-deposits',
        status: verifiedAccount ? 'complete' : unverifiedAccount ? 'pending' : 'required',
        icon: <Shield className="h-5 w-5" />
      }
    ];
  };

  const getStatusIcon = (status: OnboardingRequirement['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'verification':
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'required':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: OnboardingRequirement['status']) => {
    const variants = {
      complete: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      verification: 'bg-blue-100 text-blue-800',
      required: 'bg-red-100 text-red-800'
    };

    const labels = {
      complete: 'Complete',
      pending: 'Pending',
      verification: 'Verification',
      required: 'Required'
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const handleSetupComplete = (bankAccount: BankAccount) => {
    setBankAccounts(prev => [...prev.filter(acc => acc.id !== bankAccount.id), bankAccount]);
    setCurrentStep('complete');
    setProgress(100);
  };

  const handleContinueToEarnings = () => {
    router.push('/provider/dashboard');
  };

  if (checkingStatus) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Checking onboarding status...</span>
        </div>
      </div>
    );
  }

  const requirements = getRequirements();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AWS Native Payment Setup</h1>
        <p className="text-gray-600 mb-4">
          Set up your AWS native payment processing to receive payouts with 98% lower fees
        </p>
        <div className="max-w-md mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-2">{progress}% Complete</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Cost Savings Highlight */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-700 mb-2">98% Cost Reduction</div>
            <div className="text-sm text-green-600 mb-4">
              Compared to traditional payment processors like Stripe
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-lg font-semibold text-green-700">$0.25</div>
                <div className="text-xs text-green-600">ACH Transfer Fee</div>
                <div className="text-xs text-gray-500">vs $0.25 + 0.25% with Stripe</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-lg font-semibold text-green-700">~$0.05</div>
                <div className="text-xs text-green-600">Processing Fee</div>
                <div className="text-xs text-gray-500">vs 2.9% + $0.30 with Stripe</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-lg font-semibold text-green-700">7 Days</div>
                <div className="text-xs text-green-600">Escrow Hold Period</div>
                <div className="text-xs text-gray-500">Configurable, instant release option</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Setup Requirements
          </CardTitle>
          <CardDescription>
            Complete these steps to start receiving payments through AWS native processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requirements.map((req, index) => (
              <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                    {req.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{req.label}</div>
                    <div className="text-sm text-gray-600">{req.description}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(req.status)}
                  {getStatusIcon(req.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Setup Area */}
      {currentStep !== 'complete' ? (
        <Card>
          <CardHeader>
            <CardTitle>Bank Account Setup</CardTitle>
            <CardDescription>
              Add your bank account to receive direct ACH transfers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BankAccountSetup
              providerId={providerId}
              onSetupComplete={handleSetupComplete}
              onError={setError}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Setup Complete!</h2>
              <p className="text-green-600 mb-6">
                Your AWS native payment processing is ready. You can now receive payouts with the lowest fees in the industry.
              </p>
              
              <div className="bg-white rounded-lg p-4 border border-green-200 mb-6">
                <h3 className="font-semibold mb-2">What's Next?</h3>
                <div className="text-sm text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                    <span>Start accepting bookings and earning money</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                    <span>Funds are held in escrow until service completion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                    <span>Automatic daily payouts to your bank account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                    <span>Real-time earnings tracking in your dashboard</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleContinueToEarnings} size="lg" className="w-full md:w-auto">
                Continue to Earnings Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">AWS Payment Cryptography</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PCI DSS Level 1 Compliant</li>
                <li>• Hardware Security Module (HSM) backed</li>
                <li>• End-to-end encryption</li>
                <li>• FIPS 140-2 Level 3 validated</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Fraud Protection</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time fraud detection</li>
                <li>• Machine learning risk scoring</li>
                <li>• Advanced transaction monitoring</li>
                <li>• Instant fraud alerts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AWS Services Information */}
      <Card>
        <CardHeader>
          <CardTitle>AWS Native Payment Stack</CardTitle>
          <CardDescription>
            Your payments are powered by enterprise-grade AWS services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <Shield className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold">Payment Cryptography</h3>
              <p className="text-sm text-gray-600">Secure card tokenization and processing</p>
            </div>
            <div className="p-4 border rounded-lg">
              <AlertCircle className="h-8 w-8 text-orange-600 mb-2" />
              <h3 className="font-semibold">Fraud Detector</h3>
              <p className="text-sm text-gray-600">AI-powered fraud prevention</p>
            </div>
            <div className="p-4 border rounded-lg">
              <CreditCard className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold">ACH Processing</h3>
              <p className="text-sm text-gray-600">Direct bank account transfers</p>
            </div>
            <div className="p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold">Escrow Management</h3>
              <p className="text-sm text-gray-600">Automated fund holding and release</p>
            </div>
            <div className="p-4 border rounded-lg">
              <RefreshCcw className="h-8 w-8 text-teal-600 mb-2" />
              <h3 className="font-semibold">Event Bridge</h3>
              <p className="text-sm text-gray-600">Real-time payment orchestration</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Building className="h-8 w-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold">DynamoDB</h3>
              <p className="text-sm text-gray-600">High-performance transaction storage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}