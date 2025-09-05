/**
 * Test Data Generation and Management Utilities
 * 
 * Comprehensive utilities for generating realistic test data for AWS payment system:
 * - Credit card test data (various brands and scenarios)
 * - Bank account information for ACH testing
 * - Customer and provider profile generation
 * - Payment intent and transaction scenarios
 * - Fraud detection test cases
 * - Performance testing datasets
 * - Security testing edge cases
 * - Test data cleanup and management
 * 
 * Utilities support testing of the complete AWS native payment ecosystem
 * with cost optimization, security compliance, and performance validation.
 */

import { randomBytes, createHash } from 'crypto';

// Test data interfaces
export interface TestCustomer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: TestAddress;
  verificationStatus: 'verified' | 'pending' | 'failed';
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface TestProvider {
  providerId: string;
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  email: string;
  phone: string;
  businessType: 'individual' | 'llc' | 'corporation' | 'partnership';
  taxId: string;
  address: TestAddress;
  services: TestService[];
  bankAccounts: TestBankAccount[];
  verificationStatus: 'verified' | 'pending' | 'failed';
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface TestAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface TestCardData {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  funding: 'credit' | 'debit' | 'prepaid';
  country: string;
  billingDetails: {
    name: string;
    email: string;
    address: TestAddress;
  };
  testScenario: 'success' | 'decline_insufficient_funds' | 'decline_expired' | 'decline_fraud' | 'require_authentication';
}

export interface TestBankAccount {
  accountId: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  bankName: string;
  accountHolderName: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  verificationMethod: 'plaid' | 'micro_deposit' | 'manual';
  isDefault: boolean;
  testScenario: 'success' | 'invalid_routing' | 'invalid_account' | 'insufficient_funds';
}

export interface TestService {
  serviceId: string;
  name: string;
  description: string;
  category: string;
  price: number; // in cents
  duration: number; // in minutes
  location: 'customer_location' | 'provider_location' | 'remote';
  availability: {
    days: string[];
    hours: { start: string; end: string };
  };
}

export interface TestBooking {
  bookingId: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  scheduledDate: string;
  duration: number;
  amount: number; // in cents
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  location: TestAddress;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface TestTransaction {
  transactionId: string;
  paymentId: string;
  customerId: string;
  providerId?: string;
  bookingId?: string;
  amount: number; // in cents
  currency: string;
  platformFee: number; // in cents
  processingFee: number; // in cents
  netAmount: number; // in cents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: 'card' | 'ach' | 'wire';
  fraudScore: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface TestFraudScenario {
  name: string;
  description: string;
  customerId: string;
  amount: number;
  cardBin: string;
  emailDomain: string;
  ipAddress: string;
  deviceFingerprint: string;
  velocity: number; // transactions in past 24h
  expectedScore: number; // 0-1000
  expectedRecommendation: 'approve' | 'review' | 'decline';
  riskFactors: string[];
}

// Test data generation class
export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private generatedData: Map<string, any> = new Map();
  
  private constructor() {}
  
  public static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }
  
  // Card test data generation
  public generateTestCard(scenario: TestCardData['testScenario'] = 'success', brand: TestCardData['brand'] = 'visa'): TestCardData {
    const cardNumbers = {
      visa: {
        success: '4242424242424242',
        decline_insufficient_funds: '4000000000000002',
        decline_expired: '4000000000000069',
        decline_fraud: '4100000000000019',
        require_authentication: '4000002760003184'
      },
      mastercard: {
        success: '5555555555554444',
        decline_insufficient_funds: '5200000000000007',
        decline_expired: '5555555555554477',
        decline_fraud: '5555555555554495',
        require_authentication: '5200000000000049'
      },
      amex: {
        success: '378282246310005',
        decline_insufficient_funds: '371449635398456',
        decline_expired: '371449635398431',
        decline_fraud: '371449635398449',
        require_authentication: '371449635398472'
      },
      discover: {
        success: '6011111111111117',
        decline_insufficient_funds: '6011000000000004',
        decline_expired: '6011000000000012',
        decline_fraud: '6011000000000087',
        require_authentication: '6011000000000095'
      }
    };
    
    const cardData: TestCardData = {
      cardNumber: cardNumbers[brand][scenario],
      expiryMonth: scenario === 'decline_expired' ? 12 : 12,
      expiryYear: scenario === 'decline_expired' ? 2020 : 2025,
      cvc: brand === 'amex' ? '1234' : '123',
      brand,
      funding: 'credit',
      country: 'US',
      billingDetails: {
        name: 'Test Customer',
        email: 'test.customer@example.com',
        address: this.generateTestAddress()
      },
      testScenario: scenario
    };
    
    this.generatedData.set(`card_${Date.now()}`, cardData);
    return cardData;
  }
  
  // Bank account test data generation
  public generateTestBankAccount(scenario: TestBankAccount['testScenario'] = 'success'): TestBankAccount {
    const routingNumbers = {
      success: '110000000', // Valid test routing number
      invalid_routing: '000000000', // Invalid routing number
      invalid_account: '110000000', // Valid routing, will use invalid account
      insufficient_funds: '110000000' // Valid routing, will simulate insufficient funds
    };
    
    const accountNumbers = {
      success: this.generateAccountNumber(),
      invalid_routing: this.generateAccountNumber(),
      invalid_account: '0000000000', // Invalid account number
      insufficient_funds: this.generateAccountNumber()
    };
    
    const bankAccount: TestBankAccount = {
      accountId: `ba_test_${this.generateId()}`,
      routingNumber: routingNumbers[scenario],
      accountNumber: accountNumbers[scenario],
      accountType: Math.random() > 0.5 ? 'checking' : 'savings',
      bankName: this.generateBankName(),
      accountHolderName: 'Test Provider',
      verificationStatus: scenario === 'success' ? 'verified' : 'pending',
      verificationMethod: 'micro_deposit',
      isDefault: false,
      testScenario: scenario
    };
    
    this.generatedData.set(`bank_${Date.now()}`, bankAccount);
    return bankAccount;
  }
  
  // Customer profile generation
  public generateTestCustomer(riskLevel: TestCustomer['riskLevel'] = 'low'): TestCustomer {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    const customer: TestCustomer = {
      customerId: `cust_${this.generateId()}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: this.generatePhoneNumber(),
      dateOfBirth: this.generateDateOfBirth(),
      address: this.generateTestAddress(),
      verificationStatus: riskLevel === 'high' ? 'pending' : 'verified',
      riskLevel,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        accountAge: Math.floor(Math.random() * 365),
        totalTransactions: Math.floor(Math.random() * 100),
        averageTransactionAmount: 5000 + Math.floor(Math.random() * 50000)
      }
    };
    
    this.generatedData.set(`customer_${customer.customerId}`, customer);
    return customer;
  }
  
  // Provider profile generation
  public generateTestProvider(): TestProvider {
    const businessNames = [
      'CleanPro Services',
      'HandyFix Solutions',
      'GreenThumb Landscaping',
      'QuickMove Movers',
      'TechSavvy Repairs',
      'Sparkle Clean Co',
      'Fix-It-Fast LLC',
      'Premium Home Care'
    ];
    
    const firstName = 'Provider';
    const lastName = `Owner${Math.floor(Math.random() * 1000)}`;
    
    const provider: TestProvider = {
      providerId: `prov_${this.generateId()}`,
      businessName: businessNames[Math.floor(Math.random() * businessNames.length)],
      ownerFirstName: firstName,
      ownerLastName: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@provider.com`,
      phone: this.generatePhoneNumber(),
      businessType: 'llc',
      taxId: this.generateTaxId(),
      address: this.generateTestAddress(),
      services: [this.generateTestService()],
      bankAccounts: [this.generateTestBankAccount()],
      verificationStatus: 'verified',
      createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        businessAge: Math.floor(Math.random() * 1000),
        completedJobs: Math.floor(Math.random() * 500),
        averageRating: 4.0 + Math.random() * 1.0
      }
    };
    
    this.generatedData.set(`provider_${provider.providerId}`, provider);
    return provider;
  }
  
  // Service generation
  public generateTestService(): TestService {
    const services = [
      { name: 'House Cleaning', category: 'cleaning', basePrice: 8000, duration: 120 },
      { name: 'Handyman Services', category: 'repair', basePrice: 15000, duration: 180 },
      { name: 'Lawn Care', category: 'landscaping', basePrice: 6000, duration: 90 },
      { name: 'Moving Services', category: 'moving', basePrice: 20000, duration: 240 },
      { name: 'Tech Support', category: 'technology', basePrice: 12000, duration: 60 },
      { name: 'Pet Sitting', category: 'pet_care', basePrice: 5000, duration: 480 },
      { name: 'Tutoring', category: 'education', basePrice: 7500, duration: 60 }
    ];
    
    const service = services[Math.floor(Math.random() * services.length)];
    
    return {
      serviceId: `svc_${this.generateId()}`,
      name: service.name,
      description: `Professional ${service.name.toLowerCase()} service`,
      category: service.category,
      price: service.basePrice + Math.floor(Math.random() * 5000), // Add some variation
      duration: service.duration,
      location: 'customer_location',
      availability: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        hours: { start: '09:00', end: '17:00' }
      }
    };
  }
  
  // Booking generation
  public generateTestBooking(customerId?: string, providerId?: string, serviceId?: string): TestBooking {
    const booking: TestBooking = {
      bookingId: `book_${this.generateId()}`,
      customerId: customerId || `cust_${this.generateId()}`,
      providerId: providerId || `prov_${this.generateId()}`,
      serviceId: serviceId || `svc_${this.generateId()}`,
      scheduledDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 120,
      amount: 10000 + Math.floor(Math.random() * 40000), // $100 - $500
      status: 'confirmed',
      location: this.generateTestAddress(),
      notes: 'Generated test booking',
      metadata: {
        estimatedDuration: 120,
        specialRequests: []
      }
    };
    
    this.generatedData.set(`booking_${booking.bookingId}`, booking);
    return booking;
  }
  
  // Transaction generation
  public generateTestTransaction(customerId?: string, providerId?: string, bookingId?: string): TestTransaction {
    const amount = 5000 + Math.floor(Math.random() * 50000); // $50 - $500
    const platformFeeRate = 0.08; // 8%
    const platformFee = Math.round(amount * platformFeeRate);
    const processingFee = 5; // $0.05 AWS native processing
    const netAmount = amount - platformFee - processingFee;
    
    const transaction: TestTransaction = {
      transactionId: `txn_${this.generateId()}`,
      paymentId: `pay_${this.generateId()}`,
      customerId: customerId || `cust_${this.generateId()}`,
      providerId: providerId || `prov_${this.generateId()}`,
      bookingId: bookingId || `book_${this.generateId()}`,
      amount,
      currency: 'USD',
      platformFee,
      processingFee,
      netAmount,
      status: 'completed',
      paymentMethod: 'card',
      fraudScore: Math.random() * 200, // 0-200 scale
      createdAt: new Date().toISOString(),
      metadata: {
        costSavingsVsStripe: Math.round(amount * 0.029) + 30 - processingFee,
        processingTimeMs: 150 + Math.random() * 100
      }
    };
    
    this.generatedData.set(`transaction_${transaction.transactionId}`, transaction);
    return transaction;
  }
  
  // Fraud scenario generation
  public generateFraudScenarios(): TestFraudScenario[] {
    return [
      {
        name: 'Low Risk - Typical Customer',
        description: 'Normal customer with good history',
        customerId: `cust_${this.generateId()}`,
        amount: 15000, // $150
        cardBin: '424242',
        emailDomain: 'gmail.com',
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'known_device_123',
        velocity: 2, // 2 transactions in 24h
        expectedScore: 100,
        expectedRecommendation: 'approve',
        riskFactors: []
      },
      {
        name: 'Medium Risk - High Value Transaction',
        description: 'Large transaction from known customer',
        customerId: `cust_${this.generateId()}`,
        amount: 75000, // $750
        cardBin: '424242',
        emailDomain: 'yahoo.com',
        ipAddress: '203.0.113.1',
        deviceFingerprint: 'known_device_456',
        velocity: 5, // 5 transactions in 24h
        expectedScore: 450,
        expectedRecommendation: 'review',
        riskFactors: ['high_value', 'unusual_velocity']
      },
      {
        name: 'High Risk - Suspicious Activity',
        description: 'Multiple risk factors present',
        customerId: `cust_${this.generateId()}`,
        amount: 100000, // $1000
        cardBin: '555555', // High-risk BIN
        emailDomain: 'tempmail.org',
        ipAddress: '198.51.100.1', // High-risk location
        deviceFingerprint: 'new_device_unknown',
        velocity: 15, // 15 transactions in 24h
        expectedScore: 850,
        expectedRecommendation: 'decline',
        riskFactors: ['high_value', 'high_velocity', 'suspicious_email', 'high_risk_location', 'new_device']
      },
      {
        name: 'Critical Risk - Fraud Indicators',
        description: 'Obvious fraud attempt',
        customerId: `cust_${this.generateId()}`,
        amount: 200000, // $2000
        cardBin: '400000', // Known fraud BIN
        emailDomain: '10minutemail.com',
        ipAddress: '1.2.3.4', // Known bad IP
        deviceFingerprint: 'suspicious_device_789',
        velocity: 50, // 50 transactions in 24h
        expectedScore: 950,
        expectedRecommendation: 'decline',
        riskFactors: ['very_high_value', 'extreme_velocity', 'temporary_email', 'blacklisted_ip', 'suspicious_device']
      }
    ];
  }
  
  // Performance test data generation
  public generatePerformanceTestData(count: number, scenario: 'light' | 'moderate' | 'heavy' = 'moderate'): {
    customers: TestCustomer[];
    providers: TestProvider[];
    bookings: TestBooking[];
    transactions: TestTransaction[];
  } {
    const customers = Array(count).fill(null).map(() => this.generateTestCustomer());
    const providers = Array(Math.ceil(count / 5)).fill(null).map(() => this.generateTestProvider());
    const bookings = Array(count).fill(null).map((_, i) => 
      this.generateTestBooking(customers[i].customerId, providers[i % providers.length].providerId)
    );
    const transactions = bookings.map(booking => 
      this.generateTestTransaction(booking.customerId, booking.providerId, booking.bookingId)
    );
    
    return { customers, providers, bookings, transactions };
  }
  
  // Cost analysis test data
  public generateCostComparisonData(): Array<{
    transactionAmount: number;
    stripeCost: number;
    awsCost: number;
    savings: number;
    savingsPercentage: number;
  }> {
    const amounts = [1000, 2500, 5000, 10000, 25000, 50000, 100000]; // $10 to $1000
    
    return amounts.map(amount => {
      const stripeCost = Math.round(amount * 0.029) + 30; // 2.9% + $0.30
      const awsCost = 5; // $0.05 AWS native
      const savings = stripeCost - awsCost;
      const savingsPercentage = (savings / stripeCost) * 100;
      
      return {
        transactionAmount: amount,
        stripeCost,
        awsCost,
        savings,
        savingsPercentage
      };
    });
  }
  
  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  private generateAccountNumber(): string {
    return Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
  }
  
  private generatePhoneNumber(): string {
    const areaCode = 200 + Math.floor(Math.random() * 700);
    const exchange = 200 + Math.floor(Math.random() * 700);
    const number = 1000 + Math.floor(Math.random() * 9000);
    return `+1-${areaCode}-${exchange}-${number}`;
  }
  
  private generateDateOfBirth(): string {
    const year = 1970 + Math.floor(Math.random() * 35); // Ages 18-53
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  private generateTaxId(): string {
    return `${Math.floor(10000000 + Math.random() * 90000000)}`;
  }
  
  private generateBankName(): string {
    const banks = [
      'First National Bank',
      'Community Trust Bank',
      'Regional Savings Bank',
      'Metropolitan Credit Union',
      'State Bank & Trust',
      'United Community Bank',
      'Capital One Bank',
      'Wells Fargo Bank'
    ];
    return banks[Math.floor(Math.random() * banks.length)];
  }
  
  public generateTestAddress(): TestAddress {
    const streets = [
      '123 Main Street',
      '456 Oak Avenue',
      '789 Pine Road',
      '321 Elm Drive',
      '654 Maple Lane',
      '987 Cedar Court',
      '147 Birch Way',
      '258 Willow Street'
    ];
    
    const cities = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 
      'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'
    ];
    
    const states = [
      'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA'
    ];
    
    const cityIndex = Math.floor(Math.random() * cities.length);
    
    return {
      street: streets[Math.floor(Math.random() * streets.length)],
      city: cities[cityIndex],
      state: states[cityIndex],
      zipCode: (10000 + Math.floor(Math.random() * 90000)).toString(),
      country: 'US'
    };
  }
  
  // Data cleanup methods
  public clearGeneratedData(): void {
    this.generatedData.clear();
    console.log('✅ Test data cleared');
  }
  
  public getGeneratedDataSummary(): {
    totalItems: number;
    types: Record<string, number>;
    memoryUsage: number;
  } {
    const types: Record<string, number> = {};
    
    for (const [key] of this.generatedData) {
      const type = key.split('_')[0];
      types[type] = (types[type] || 0) + 1;
    }
    
    return {
      totalItems: this.generatedData.size,
      types,
      memoryUsage: JSON.stringify(Array.from(this.generatedData.values())).length
    };
  }
  
  public exportTestData(): Record<string, any> {
    return Object.fromEntries(this.generatedData);
  }
  
  public importTestData(data: Record<string, any>): void {
    this.generatedData.clear();
    for (const [key, value] of Object.entries(data)) {
      this.generatedData.set(key, value);
    }
  }
}

// Export singleton instance
export const testDataGenerator = TestDataGenerator.getInstance();

// Export convenience functions
export const generateTestCardData = (scenario?: TestCardData['testScenario'], brand?: TestCardData['brand']) =>
  testDataGenerator.generateTestCard(scenario, brand);

export const generateTestBankAccount = (scenario?: TestBankAccount['testScenario']) =>
  testDataGenerator.generateTestBankAccount(scenario);

export const generateTestPaymentIntent = () => ({
  amount: 10000 + Math.floor(Math.random() * 40000),
  currency: 'USD',
  customerId: `cust_${Date.now()}`,
  providerId: `prov_${Date.now()}`,
  bookingId: `book_${Date.now()}`,
  metadata: {
    service: 'Test Service',
    duration: '120 minutes'
  }
});

export const generateTestFraudScenarios = () =>
  testDataGenerator.generateFraudScenarios();

export const cleanupTestData = async (): Promise<void> => {
  testDataGenerator.clearGeneratedData();
  
  // Additional cleanup for external resources would go here
  // e.g., database cleanup, S3 cleanup, etc.
  
  return Promise.resolve();
};

// Export data validation utilities
export const validateTestData = {
  isValidCardNumber: (cardNumber: string): boolean => {
    return /^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''));
  },
  
  isValidRoutingNumber: (routingNumber: string): boolean => {
    return /^\d{9}$/.test(routingNumber) && routingNumber !== '000000000';
  },
  
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  isValidPhoneNumber: (phone: string): boolean => {
    return /^\+1-\d{3}-\d{3}-\d{4}$/.test(phone);
  },
  
  isValidAmount: (amount: number): boolean => {
    return amount > 0 && amount <= 10000000; // Up to $100,000
  }
};

// Export test scenario builders
export const buildTestScenarios = {
  successfulPayment: () => ({
    customer: testDataGenerator.generateTestCustomer('low'),
    provider: testDataGenerator.generateTestProvider(),
    card: testDataGenerator.generateTestCard('success', 'visa'),
    bankAccount: testDataGenerator.generateTestBankAccount('success'),
    booking: testDataGenerator.generateTestBooking(),
    expectedOutcome: 'success'
  }),
  
  fraudDeclinedPayment: () => ({
    customer: testDataGenerator.generateTestCustomer('high'),
    provider: testDataGenerator.generateTestProvider(),
    card: testDataGenerator.generateTestCard('decline_fraud', 'visa'),
    bankAccount: testDataGenerator.generateTestBankAccount('success'),
    booking: testDataGenerator.generateTestBooking(),
    expectedOutcome: 'fraud_decline'
  }),
  
  insufficientFundsDecline: () => ({
    customer: testDataGenerator.generateTestCustomer('medium'),
    provider: testDataGenerator.generateTestProvider(),
    card: testDataGenerator.generateTestCard('decline_insufficient_funds', 'mastercard'),
    bankAccount: testDataGenerator.generateTestBankAccount('insufficient_funds'),
    booking: testDataGenerator.generateTestBooking(),
    expectedOutcome: 'insufficient_funds'
  }),
  
  highVolumeLoad: (count: number) => ({
    ...testDataGenerator.generatePerformanceTestData(count, 'heavy'),
    expectedOutcome: 'performance_validation'
  })
};

console.log('✅ Test data generation utilities initialized');