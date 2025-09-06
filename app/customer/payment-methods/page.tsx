'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import {
  CreditCard,
  Building2,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Star,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  isDefault: boolean;
  verified: boolean;
  fingerprint: string;
  createdAt: string;
  
  // Card details
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  
  // Bank account details
  bankAccountLast4?: string;
  bankName?: string;
  accountType?: 'checking' | 'savings';
  
  billingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface AddPaymentMethodForm {
  type: 'card' | 'bank_account';
  
  // Card fields
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  
  // Bank account fields
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  
  // Billing address
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const CARD_BRANDS = {
  visa: '4',
  mastercard: '5',
  amex: '3',
  discover: '6',
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'CA', name: 'California' },
  { code: 'FL', name: 'Florida' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
  // Add more states as needed
];

export default function PaymentMethodsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<AddPaymentMethodForm>({
    type: 'card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking',
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();
      setUser(currentUser);

      await loadPaymentMethods(currentUser.userId);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load payment methods. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async (customerId: string) => {
    try {
      const result = await client.mutations.managePaymentMethod({
        action: 'list',
        customerId,
      });

      if (result.data?.success) {
        setPaymentMethods(result.data.paymentMethods || []);
      } else {
        throw new Error(result.data?.error || 'Failed to load payment methods');
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Don't show error for empty list
      if (!error?.message?.includes('not found')) {
        setError('Failed to load payment methods');
      }
    }
  };

  const validateCardNumber = (cardNumber: string): boolean => {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Check length
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    // Luhn algorithm
    let sum = 0;
    let alternate = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i));
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  };

  const getCardBrand = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5') || (cleaned.length >= 4 && cleaned.substring(0, 4) >= '2221' && cleaned.substring(0, 4) <= '2720')) return 'mastercard';
    if (cleaned.startsWith('34') || cleaned.startsWith('37')) return 'amex';
    if (cleaned.startsWith('6011') || cleaned.startsWith('65')) return 'discover';
    
    return 'unknown';
  };

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19); // Max 4 groups of 4 digits
  };

  const handleInputChange = (field: keyof AddPaymentMethodForm, value: string) => {
    if (field === 'cardNumber') {
      value = formatCardNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPaymentMethod = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Validate common fields
      if (!formData.name || !formData.line1 || !formData.city || !formData.state || !formData.postalCode) {
        throw new Error('Please fill in all billing address fields');
      }

      let validationError = '';

      if (formData.type === 'card') {
        // Validate card fields
        if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || !formData.cvc) {
          validationError = 'Please fill in all card details';
        } else if (!validateCardNumber(formData.cardNumber.replace(/\s/g, ''))) {
          validationError = 'Invalid card number';
        } else if (parseInt(formData.expiryMonth) < 1 || parseInt(formData.expiryMonth) > 12) {
          validationError = 'Invalid expiry month';
        } else if (parseInt(formData.expiryYear) < new Date().getFullYear()) {
          validationError = 'Card has expired';
        } else if (formData.cvc.length < 3 || formData.cvc.length > 4) {
          validationError = 'Invalid CVC code';
        }
      } else {
        // Validate bank account fields
        if (!formData.routingNumber || !formData.accountNumber) {
          validationError = 'Please fill in all bank account details';
        } else if (formData.routingNumber.length !== 9) {
          validationError = 'Routing number must be 9 digits';
        } else if (formData.accountNumber.length < 4 || formData.accountNumber.length > 17) {
          validationError = 'Invalid account number';
        }
      }

      if (validationError) {
        throw new Error(validationError);
      }

      const result = await client.mutations.managePaymentMethod({
        action: 'create',
        customerId: user.userId,
        type: formData.type,
        ...(formData.type === 'card' ? {
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvc: formData.cvc,
        } : {
          bankAccountNumber: formData.accountNumber,
          routingNumber: formData.routingNumber,
          accountType: formData.accountType,
        }),
        billingAddress: {
          name: formData.name,
          line1: formData.line1,
          line2: formData.line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
        },
      });

      if (result.data?.success) {
        setSuccess(`${formData.type === 'card' ? 'Card' : 'Bank account'} added successfully!`);
        setShowAddForm(false);
        resetForm();
        await loadPaymentMethods(user.userId);
      } else {
        throw new Error(result.data?.error || 'Failed to add payment method');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      setError(error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const result = await client.mutations.managePaymentMethod({
        action: 'set_default',
        customerId: user.userId,
        paymentMethodId,
      });

      if (result.data?.success) {
        setSuccess('Default payment method updated');
        await loadPaymentMethods(user.userId);
      } else {
        throw new Error(result.data?.error || 'Failed to update default payment method');
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      setError(error instanceof Error ? error.message : 'Failed to update default payment method');
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this payment method?')) {
        return;
      }

      const result = await client.mutations.managePaymentMethod({
        action: 'delete',
        customerId: user.userId,
        paymentMethodId,
      });

      if (result.data?.success) {
        setSuccess('Payment method removed successfully');
        await loadPaymentMethods(user.userId);
      } else {
        throw new Error(result.data?.error || 'Failed to delete payment method');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete payment method');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'card',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvc: '',
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking',
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    });
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return <CreditCard className="h-5 w-5" />;
    } else {
      return <Building2 className="h-5 w-5" />;
    }
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return (
        <div>
          <div className="font-medium capitalize">{method.cardBrand} •••• {method.cardLast4}</div>
          <div className="text-sm text-gray-600">Expires {method.cardExpMonth}/{method.cardExpYear}</div>
        </div>
      );
    } else {
      return (
        <div>
          <div className="font-medium">{method.bankName || 'Bank Account'}</div>
          <div className="text-sm text-gray-600">
            {method.accountType?.toUpperCase()} •••• {method.bankAccountLast4}
          </div>
        </div>
      );
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
        <p className="text-gray-600 mt-2">Manage your payment methods for faster checkout.</p>
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
            <CardTitle className="text-blue-900">Secure AWS Native Payments</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm">KMS Encryption</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">PCI Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm">98% Lower Fees</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Payment Methods */}
      {paymentMethods.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Payment Methods</CardTitle>
            <CardDescription>Saved payment methods for quick checkout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getPaymentMethodIcon(method)}
                    {getPaymentMethodDisplay(method)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {method.isDefault && (
                      <Badge variant="default">
                        <Star className="h-3 w-3 mr-1" />Default
                      </Badge>
                    )}
                    {method.verified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Verified
                      </Badge>
                    )}
                  </div>
                </div>

                {method.billingAddress && (
                  <div className="mt-2 text-sm text-gray-600">
                    {method.billingAddress.name} • {method.billingAddress.city}, {method.billingAddress.state} {method.billingAddress.postal_code}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-500">
                    Added {new Date(method.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Payment Method */}
      {!showAddForm ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Add Payment Method</h3>
              <p className="text-gray-600 mb-4">
                Add a credit card or bank account for quick and secure payments.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add Payment Method</CardTitle>
            <CardDescription>
              Your payment information is encrypted and stored securely using AWS KMS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Type Selection */}
            <div>
              <Label>Payment Method Type</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    formData.type === 'card' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleInputChange('type', 'card')}
                >
                  <CreditCard className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Credit/Debit Card</div>
                  <div className="text-sm text-gray-600">Instant payments</div>
                </button>
                <button
                  type="button"
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    formData.type === 'bank_account' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleInputChange('type', 'bank_account')}
                >
                  <Building2 className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Bank Account</div>
                  <div className="text-sm text-gray-600">Lower fees</div>
                </button>
              </div>
            </div>

            {/* Payment Details */}
            {formData.type === 'card' ? (
              <div className="space-y-4">
                <h4 className="font-medium">Card Details</h4>
                
                <div>
                  <Label htmlFor="cardNumber">Card Number *</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    maxLength={19}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiryMonth">Month *</Label>
                    <Select value={formData.expiryMonth} onValueChange={(value) => handleInputChange('expiryMonth', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                            {month.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="expiryYear">Year *</Label>
                    <Select value={formData.expiryYear} onValueChange={(value) => handleInputChange('expiryYear', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="cvc">CVC *</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={formData.cvc}
                      onChange={(e) => handleInputChange('cvc', e.target.value)}
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-medium">Bank Account Details</h4>
                
                <div>
                  <Label htmlFor="routingNumber">Routing Number *</Label>
                  <Input
                    id="routingNumber"
                    placeholder="123456789"
                    value={formData.routingNumber}
                    onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                    maxLength={9}
                  />
                </div>

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

                <div>
                  <Label htmlFor="accountType">Account Type *</Label>
                  <Select value={formData.accountType} onValueChange={(value: any) => handleInputChange('accountType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Billing Address */}
            <div className="space-y-4">
              <h4 className="font-medium">Billing Address</h4>
              
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="line1">Address Line 1 *</Label>
                <Input
                  id="line1"
                  placeholder="123 Main St"
                  value={formData.line1}
                  onChange={(e) => handleInputChange('line1', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="line2">Address Line 2</Label>
                <Input
                  id="line2"
                  placeholder="Apt, suite, etc. (optional)"
                  value={formData.line2}
                  onChange={(e) => handleInputChange('line2', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="postalCode">ZIP Code *</Label>
                  <Input
                    id="postalCode"
                    placeholder="12345"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <Lock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="text-sm text-gray-700">
                <div className="font-medium mb-1">Your payment information is secure</div>
                <p>We use AWS KMS encryption and never store your full payment details. All data is processed according to PCI DSS standards.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddPaymentMethod} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}