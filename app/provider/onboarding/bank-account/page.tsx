'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import {
  Building,
  CreditCard,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Lock,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

interface BankAccount {
  id: string;
  routingNumber: string;
  accountNumberLast4: string;
  accountType: 'checking' | 'savings' | 'business_checking';
  bankName: string;
  accountHolderName: string;
  verified: boolean;
  verificationStatus: 'pending' | 'micro_deposits_sent' | 'verified' | 'failed';
  isDefault: boolean;
  createdAt: string;
  estimatedVerificationTime?: string;
}

interface MicroDepositVerification {
  amount1: string;
  amount2: string;
}

const BANK_ROUTING_NUMBERS = {
  'Chase Bank': '021000021',
  'Bank of America': '121000248',
  'Wells Fargo': '121042882',
  'Citi Bank': '021000089',
  'US Bank': '091000022',
  'PNC Bank': '043000096',
  'Capital One': '051405515',
  'TD Bank': '031201360',
  'SunTrust Bank': '061000104',
  'BB&T': '053000196',
};

export default function BankAccountSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedAccountForVerification, setSelectedAccountForVerification] = useState<string | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking' as 'checking' | 'savings' | 'business_checking',
    accountHolderName: '',
    bankName: '',
  });

  // Micro deposit verification state
  const [microDepositData, setMicroDepositData] = useState<MicroDepositVerification>({
    amount1: '',
    amount2: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Load existing bank accounts
      await loadBankAccounts(currentUser.userId);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load account information. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadBankAccounts = async (providerId: string) => {
    try {
      const result = await client.mutations.manageBankAccount({
        action: 'list',
        providerId,
      });

      if (result.data?.success) {
        setBankAccounts(result.data.accounts || []);
      } else {
        throw new Error(result.data?.error || 'Failed to load bank accounts');
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      setError('Failed to load bank accounts');
    }
  };

  const validateRoutingNumber = (routingNumber: string): boolean => {
    // Basic routing number validation (9 digits, checksum)
    if (!/^\d{9}$/.test(routingNumber)) return false;
    
    const digits = routingNumber.split('').map(Number);
    const checksum = (
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      (digits[2] + digits[5] + digits[8])
    ) % 10;
    
    return checksum === 0;
  };

  const getBankNameFromRouting = (routingNumber: string): string => {
    const bank = Object.entries(BANK_ROUTING_NUMBERS).find(([_, routing]) => routing === routingNumber);
    return bank ? bank[0] : '';
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-populate bank name from routing number
    if (field === 'routingNumber' && value.length === 9) {
      const bankName = getBankNameFromRouting(value);
      if (bankName) {
        setFormData(prev => ({ ...prev, bankName }));
      }
    }
  };

  const handleAddBankAccount = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Validate form data
      if (!formData.routingNumber || !formData.accountNumber || !formData.accountHolderName) {
        throw new Error('Please fill in all required fields');
      }

      if (!validateRoutingNumber(formData.routingNumber)) {
        throw new Error('Invalid routing number. Please check and try again.');
      }

      if (formData.accountNumber.length < 4 || formData.accountNumber.length > 17) {
        throw new Error('Account number must be between 4 and 17 digits');
      }

      const result = await client.mutations.manageBankAccount({
        action: 'add',
        providerId: user.userId,
        routingNumber: formData.routingNumber,
        accountNumber: formData.accountNumber,
        accountType: formData.accountType,
        accountHolderName: formData.accountHolderName,
        bankName: formData.bankName,
      });

      if (result.data?.success) {
        setSuccess('Bank account added successfully! Micro deposits will be sent within 1-2 business days.');
        setShowAddForm(false);
        setFormData({
          routingNumber: '',
          accountNumber: '',
          accountType: 'checking',
          accountHolderName: '',
          bankName: '',
        });
        await loadBankAccounts(user.userId);
      } else {
        throw new Error(result.data?.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      setError(error instanceof Error ? error.message : 'Failed to add bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyMicroDeposits = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (!microDepositData.amount1 || !microDepositData.amount2) {
        throw new Error('Please enter both micro deposit amounts');
      }

      const result = await client.mutations.manageBankAccount({
        action: 'verify',
        providerId: user.userId,
        accountId: selectedAccountForVerification!,
        microDepositAmounts: {
          amount1: parseFloat(microDepositData.amount1),
          amount2: parseFloat(microDepositData.amount2),
        },
      });

      if (result.data?.success) {
        setSuccess('Bank account verified successfully! You can now receive payouts.');
        setShowVerificationModal(false);
        setSelectedAccountForVerification(null);
        setMicroDepositData({ amount1: '', amount2: '' });
        await loadBankAccounts(user.userId);
      } else {
        throw new Error(result.data?.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying micro deposits:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      const result = await client.mutations.manageBankAccount({
        action: 'set_default',
        providerId: user.userId,
        accountId,
      });

      if (result.data?.success) {
        setSuccess('Default payout account updated');
        await loadBankAccounts(user.userId);
      } else {
        throw new Error(result.data?.error || 'Failed to update default account');
      }
    } catch (error) {
      console.error('Error setting default account:', error);
      setError(error instanceof Error ? error.message : 'Failed to update default account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
        return;
      }

      const result = await client.mutations.manageBankAccount({
        action: 'delete',
        providerId: user.userId,
        accountId,
      });

      if (result.data?.success) {
        setSuccess('Bank account removed successfully');
        await loadBankAccounts(user.userId);
      } else {
        throw new Error(result.data?.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
    }
  };

  const getVerificationStatusBadge = (status: string, verified: boolean) => {
    if (verified) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'micro_deposits_sent':
        return <Badge variant="outline"><DollarSign className="h-3 w-3 mr-1" />Awaiting Verification</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const completionPercentage = () => {
    const verifiedAccounts = bankAccounts.filter(acc => acc.verified).length;
    if (bankAccounts.length === 0) return 0;
    return verifiedAccounts > 0 ? 100 : 50;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bank Account Setup</h1>
        <p className="text-gray-600 mt-2">Set up your bank account to receive payouts from completed bookings.</p>
        
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Setup Progress</span>
            <span className="text-sm font-medium">{completionPercentage()}%</span>
          </div>
          <Progress value={completionPercentage()} className="h-2" />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* AWS Native Payment Info */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">AWS Native Payments - 98% Cost Savings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Security Features:</h4>
              <ul className="text-sm space-y-1">
                <li>• Bank-grade KMS encryption</li>
                <li>• PCI DSS Level 1 compliant</li>
                <li>• Real-time fraud detection</li>
                <li>• NACHA ACH compliance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Cost Savings:</h4>
              <ul className="text-sm space-y-1">
                <li>• 98% lower fees vs traditional processors</li>
                <li>• Direct ACH transfers (no middleman)</li>
                <li>• No monthly fees or setup costs</li>
                <li>• Real-time cost monitoring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Bank Accounts */}
      {bankAccounts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Bank Accounts</CardTitle>
            <CardDescription>Manage your payout accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankAccounts.map((account) => (
              <div key={account.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{account.bankName || 'Bank Account'}</div>
                      <div className="text-sm text-gray-600">
                        {account.accountType.replace('_', ' ').toUpperCase()} •••• {account.accountNumberLast4}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {account.isDefault && <Badge variant="outline">Default</Badge>}
                    {getVerificationStatusBadge(account.verificationStatus, account.verified)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Account Holder: {account.accountHolderName}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!account.verified && account.verificationStatus === 'micro_deposits_sent' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForVerification(account.id);
                          setShowVerificationModal(true);
                        }}
                      >
                        Verify
                      </Button>
                    )}
                    {account.verified && !account.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefaultAccount(account.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!account.verified && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <div className="text-sm text-yellow-800">
                      {account.verificationStatus === 'pending' && (
                        <>Verification in progress. Micro deposits will be sent within 1-2 business days.</>
                      )}
                      {account.verificationStatus === 'micro_deposits_sent' && (
                        <>Micro deposits sent! Check your account and verify the amounts to complete setup.</>
                      )}
                      {account.estimatedVerificationTime && (
                        <div className="mt-1 text-xs">
                          Estimated verification: {account.estimatedVerificationTime}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Bank Account Form */}
      {!showAddForm ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {bankAccounts.length === 0 ? 'Add Your First Bank Account' : 'Add Another Bank Account'}
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your business bank account to receive payouts from completed bookings.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add Bank Account</CardTitle>
            <CardDescription>
              Enter your bank account details. This information is encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Routing Number */}
            <div>
              <Label htmlFor="routingNumber">Routing Number *</Label>
              <Input
                id="routingNumber"
                placeholder="123456789"
                value={formData.routingNumber}
                onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                maxLength={9}
              />
              <p className="text-xs text-gray-600 mt-1">
                9-digit number found on your checks or bank statements
              </p>
            </div>

            {/* Account Number */}
            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <div className="relative">
                <Input
                  id="accountNumber"
                  type={showAccountNumber ? 'text' : 'password'}
                  placeholder="Account number"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  maxLength={17}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                >
                  {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Account Type */}
            <div>
              <Label htmlFor="accountType">Account Type *</Label>
              <Select value={formData.accountType} onValueChange={(value: any) => handleInputChange('accountType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Personal Checking</SelectItem>
                  <SelectItem value="savings">Personal Savings</SelectItem>
                  <SelectItem value="business_checking">Business Checking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Holder Name */}
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                placeholder="Full name on account"
                value={formData.accountHolderName}
                onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
              />
            </div>

            {/* Bank Name */}
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Your bank name"
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
              />
              <p className="text-xs text-gray-600 mt-1">
                Auto-populated for major banks
              </p>
            </div>

            {/* Security Notice */}
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
              <Lock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="text-sm text-gray-700">
                <div className="font-medium mb-1">Your information is secure</div>
                <p>Bank details are encrypted using AWS KMS and never stored in plain text. We use bank-level security to protect your data.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddBankAccount} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Micro Deposit Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Verify Micro Deposits</h3>
            <p className="text-gray-600 text-sm mb-4">
              Check your bank account for two small deposits (usually under $1.00) and enter the amounts below.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount1">First Deposit Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="amount1"
                    placeholder="0.00"
                    value={microDepositData.amount1}
                    onChange={(e) => setMicroDepositData(prev => ({ ...prev, amount1: e.target.value }))}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="amount2">Second Deposit Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="amount2"
                    placeholder="0.00"
                    value={microDepositData.amount2}
                    onChange={(e) => setMicroDepositData(prev => ({ ...prev, amount2: e.target.value }))}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedAccountForVerification(null);
                  setMicroDepositData({ amount1: '', amount2: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleVerifyMicroDeposits} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {bankAccounts.some(acc => acc.verified) && (
        <div className="mt-6 text-center">
          <Button onClick={() => router.push('/provider/onboarding')} size="lg">
            Continue Setup
          </Button>
        </div>
      )}
    </div>
  );
}