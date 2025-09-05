'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Loader2, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Eye,
  EyeOff,
  Shield,
  CreditCard,
  Info
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { awsPaymentClient, BankAccount, formatAmount } from '@/lib/aws-payment-client';

// Bank account validation schema
const bankAccountSchema = z.object({
  routingNumber: z.string()
    .min(9, 'Routing number must be 9 digits')
    .max(9, 'Routing number must be 9 digits')
    .refine((val) => /^\d{9}$/.test(val), 'Routing number must contain only digits'),
  accountNumber: z.string()
    .min(4, 'Account number must be at least 4 digits')
    .max(20, 'Account number must be at most 20 digits')
    .refine((val) => /^\d+$/.test(val), 'Account number must contain only digits'),
  accountType: z.enum(['checking', 'savings'], {
    required_error: 'Please select an account type',
  }),
  accountHolderName: z.string()
    .min(2, 'Account holder name is required')
    .max(100, 'Account holder name is too long'),
});

// Micro-deposit verification schema
const verificationSchema = z.object({
  deposit1: z.string()
    .min(1, 'First deposit amount is required')
    .refine((val) => {
      const cents = parseInt(val, 10);
      return cents >= 1 && cents <= 99;
    }, 'Deposit amount must be between $0.01 and $0.99'),
  deposit2: z.string()
    .min(1, 'Second deposit amount is required')
    .refine((val) => {
      const cents = parseInt(val, 10);
      return cents >= 1 && cents <= 99;
    }, 'Deposit amount must be between $0.01 and $0.99'),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;
type VerificationFormData = z.infer<typeof verificationSchema>;

interface BankAccountSetupProps {
  providerId: string;
  onSetupComplete?: (bankAccount: BankAccount) => void;
  onError?: (error: string) => void;
}

export function BankAccountSetup({
  providerId,
  onSetupComplete,
  onError,
}: BankAccountSetupProps) {
  const [currentStep, setCurrentStep] = useState<'setup' | 'verification' | 'complete'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const bankAccountForm = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
  });

  const verificationForm = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  });

  // Load existing bank accounts
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        setIsLoadingAccounts(true);
        const accounts = await awsPaymentClient.getProviderBankAccounts(providerId);
        setBankAccounts(accounts);
        
        // Check if any account needs verification
        const unverifiedAccount = accounts.find(acc => !acc.isVerified);
        if (unverifiedAccount) {
          setSelectedAccount(unverifiedAccount);
          setCurrentStep('verification');
        } else if (accounts.length === 0) {
          setCurrentStep('setup');
        } else {
          setCurrentStep('complete');
        }
      } catch (err) {
        console.error('Failed to load bank accounts:', err);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    loadBankAccounts();
  }, [providerId]);

  // Validate routing number and get bank name
  const validateRoutingNumber = (routingNumber: string) => {
    // Basic ABA routing number validation
    if (!/^\d{9}$/.test(routingNumber)) return false;

    const digits = routingNumber.split('').map(Number);
    const checksum = (
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      (digits[2] + digits[5] + digits[8])
    ) % 10;

    return checksum === 0;
  };

  // Get bank name from routing number (simplified lookup)
  const getBankName = (routingNumber: string): string => {
    const bankMap: Record<string, string> = {
      '021000021': 'Chase Bank',
      '026009593': 'Bank of America',
      '121000248': 'Wells Fargo',
      '111000025': 'Citibank',
      '054001204': 'US Bank',
      '081000210': 'PNC Bank',
      '053000196': 'Capital One',
      '122000247': 'Wells Fargo (West)',
      // Add more bank mappings as needed
    };

    return bankMap[routingNumber] || 'Unknown Bank';
  };

  const onBankAccountSubmit = async (data: BankAccountFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate routing number
      if (!validateRoutingNumber(data.routingNumber)) {
        setError('Invalid routing number. Please check and try again.');
        return;
      }

      const bankAccount = await awsPaymentClient.createBankAccount({
        providerId,
        routingNumber: data.routingNumber,
        accountNumber: data.accountNumber,
        accountType: data.accountType,
        accountHolderName: data.accountHolderName,
      });

      setSelectedAccount(bankAccount);
      setBankAccounts([...bankAccounts, bankAccount]);
      setCurrentStep('verification');

      // Micro-deposits will be sent automatically by the backend
      // Show user that verification process has started
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add bank account';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onVerificationSubmit = async (data: VerificationFormData) => {
    if (!selectedAccount) {
      setError('No bank account selected for verification');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await awsPaymentClient.verifyBankAccount({
        bankAccountId: selectedAccount.id,
        deposit1: parseInt(data.deposit1, 10),
        deposit2: parseInt(data.deposit2, 10),
      });

      if (result.success) {
        // Update the bank account status
        const updatedAccount = { ...selectedAccount, isVerified: true };
        setSelectedAccount(updatedAccount);
        setBankAccounts(prev => 
          prev.map(acc => 
            acc.id === selectedAccount.id 
              ? updatedAccount
              : acc
          )
        );
        setCurrentStep('complete');
        onSetupComplete?.(updatedAccount);
      } else {
        setError(result.error || 'Verification failed. Please check the deposit amounts.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addAnotherAccount = () => {
    bankAccountForm.reset();
    setError(null);
    setCurrentStep('setup');
  };

  if (isLoadingAccounts) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading bank account information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center ${currentStep === 'setup' ? 'text-blue-600' : 'text-green-600'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'setup' ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {currentStep === 'setup' ? '1' : <CheckCircle className="w-5 h-5" />}
          </div>
          <span className="ml-2 font-medium">Account Setup</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300 mx-4" />
        
        <div className={`flex items-center ${
          currentStep === 'verification' ? 'text-blue-600' : 
          currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'verification' ? 'bg-blue-100' : 
            currentStep === 'complete' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {currentStep === 'complete' ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="ml-2 font-medium">Verification</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300 mx-4" />
        
        <div className={`flex items-center ${currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'complete' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {currentStep === 'complete' ? <CheckCircle className="w-5 h-5" /> : '3'}
          </div>
          <span className="ml-2 font-medium">Complete</span>
        </div>
      </div>

      {/* Bank Account Setup Step */}
      {currentStep === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Add Bank Account
            </CardTitle>
            <CardDescription>
              Add your bank account to receive direct ACH payouts from your services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={bankAccountForm.handleSubmit(onBankAccountSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    placeholder="123456789"
                    maxLength={9}
                    {...bankAccountForm.register('routingNumber')}
                  />
                  <p className="text-xs text-gray-500">
                    9-digit number found on the bottom of your check
                  </p>
                  {bankAccountForm.formState.errors.routingNumber && (
                    <p className="text-sm text-red-600">
                      {bankAccountForm.formState.errors.routingNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <div className="relative">
                    <Input
                      id="accountNumber"
                      type={showAccountNumber ? 'text' : 'password'}
                      placeholder="Enter your account number"
                      {...bankAccountForm.register('accountNumber')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                    >
                      {showAccountNumber ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {bankAccountForm.formState.errors.accountNumber && (
                    <p className="text-sm text-red-600">
                      {bankAccountForm.formState.errors.accountNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select onValueChange={(value: 'checking' | 'savings') => 
                    bankAccountForm.setValue('accountType', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                  {bankAccountForm.formState.errors.accountType && (
                    <p className="text-sm text-red-600">
                      {bankAccountForm.formState.errors.accountType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="John Doe"
                    {...bankAccountForm.register('accountHolderName')}
                  />
                  <p className="text-xs text-gray-500">
                    Must match the name on your bank account exactly
                  </p>
                  {bankAccountForm.formState.errors.accountHolderName && (
                    <p className="text-sm text-red-600">
                      {bankAccountForm.formState.errors.accountHolderName.message}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-800">Secure Bank Connection</h4>
                    <p className="text-blue-600 mt-1">
                      Your bank information is encrypted and secured by AWS Payment Cryptography. 
                      We never store your full account number.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Bank Account...
                  </>
                ) : (
                  'Add Bank Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Verification Step */}
      {currentStep === 'verification' && selectedAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Verify Bank Account
            </CardTitle>
            <CardDescription>
              We've sent two small deposits to your account. Enter the amounts to verify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Account Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Bank Account</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Bank:</span>
                    <span>{selectedAccount.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account:</span>
                    <span>****{selectedAccount.last4}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="capitalize">{selectedAccount.accountType}</span>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Two small deposits (typically between $0.01 and $0.99) have been sent to your account. 
                  They should appear within 1-2 business days. Enter the exact amounts below.
                </AlertDescription>
              </Alert>

              <form onSubmit={verificationForm.handleSubmit(onVerificationSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit1">First Deposit Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $0.
                      </span>
                      <Input
                        id="deposit1"
                        placeholder="32"
                        maxLength={2}
                        className="pl-8"
                        {...verificationForm.register('deposit1')}
                      />
                    </div>
                    {verificationForm.formState.errors.deposit1 && (
                      <p className="text-sm text-red-600">
                        {verificationForm.formState.errors.deposit1.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deposit2">Second Deposit Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $0.
                      </span>
                      <Input
                        id="deposit2"
                        placeholder="87"
                        maxLength={2}
                        className="pl-8"
                        {...verificationForm.register('deposit2')}
                      />
                    </div>
                    {verificationForm.formState.errors.deposit2 && (
                      <p className="text-sm text-red-600">
                        {verificationForm.formState.errors.deposit2.message}
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Account'
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {currentStep === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Bank Account Setup Complete
            </CardTitle>
            <CardDescription>
              Your bank account is verified and ready to receive payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Verified Accounts List */}
              <div className="space-y-3">
                <h4 className="font-medium">Verified Bank Accounts</h4>
                {bankAccounts
                  .filter(account => account.isVerified)
                  .map((account) => (
                    <div key={account.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium">{account.bankName}</div>
                            <div className="text-sm text-gray-600">
                              {account.accountType} ****{account.last4}
                              {account.isDefault && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Payout Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Payout Schedule</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <p>• Payouts are processed daily for completed services</p>
                  <p>• Funds are held in escrow for 7 days after service completion</p>
                  <p>• ACH transfers typically take 1-2 business days to arrive</p>
                  <p>• Minimum payout amount: {formatAmount(2000)} (configurable)</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={addAnotherAccount} variant="outline" className="flex-1">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Account
                </Button>
                <Button onClick={() => onSetupComplete?.(selectedAccount!)} className="flex-1">
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}