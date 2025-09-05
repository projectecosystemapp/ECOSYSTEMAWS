/**
 * AWS Services Mock Configuration for AWS Native Payment System Tests
 * 
 * This file sets up comprehensive mocking for all AWS services used in the payment system:
 * - Payment Cryptography (Control Plane & Data Plane)
 * - DynamoDB
 * - SNS
 * - Fraud Detector
 * - Secrets Manager
 * - CloudWatch
 * 
 * Security Features:
 * - Mock encrypted data handling
 * - Fraud score simulation
 * - PCI DSS compliant testing patterns
 * 
 * Cost Optimization Features:
 * - Mock cost calculations
 * - Fee structure validation
 * - Performance metrics simulation
 */

import { jest } from '@jest/globals';

// Environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.PAYMENT_CRYPTOGRAPHY_KEY_ARN = 'arn:aws:payment-cryptography:us-east-1:123456789012:key/test-key-id';
process.env.TRANSACTION_TABLE = 'EcosystemAWS-TransactionTable-Test';
process.env.ESCROW_ACCOUNT_TABLE = 'EcosystemAWS-EscrowAccountTable-Test';
process.env.PAYMENT_NOTIFICATIONS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:payment-notifications-test';
process.env.MINIMUM_TRANSACTION_CENTS = '50';

// Mock Payment Cryptography Control Plane Client
jest.mock('@aws-sdk/client-payment-cryptography-control-plane', () => ({
  PaymentCryptographyControlPlaneClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      if (command.constructor.name === 'CreateKeyCommand') {
        return Promise.resolve({
          Key: {
            KeyArn: process.env.PAYMENT_CRYPTOGRAPHY_KEY_ARN,
            KeyAttributes: {
              KeyAlgorithm: 'RSA_2048',
              KeyClass: 'SYMMETRIC_KEY',
              KeyModes: ['Encrypt', 'Decrypt']
            },
            KeyCheckValue: 'ABC123',
            KeyState: 'ENABLED'
          }
        });
      }
      return Promise.resolve({});
    })
  })),
  CreateKeyCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'CreateKeyCommand' },
    input: params
  }))
}));

// Mock Payment Cryptography Data Plane Client
jest.mock('@aws-sdk/client-payment-cryptography-data-plane', () => ({
  PaymentCryptographyDataPlaneClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      if (command.constructor.name === 'EncryptDataCommand') {
        // Simulate encryption by base64 encoding the input
        const mockEncryptedData = Buffer.from(JSON.stringify({
          encrypted: true,
          originalData: command.input.PlainText,
          timestamp: new Date().toISOString()
        })).toString('base64');
        
        return Promise.resolve({
          CipherText: Buffer.from(mockEncryptedData, 'base64')
        });
      }
      
      if (command.constructor.name === 'DecryptDataCommand') {
        // Simulate decryption by base64 decoding
        try {
          const mockDecryptedData = JSON.parse(
            Buffer.from(command.input.CipherText).toString('utf-8')
          );
          return Promise.resolve({
            PlainText: mockDecryptedData.originalData || Buffer.from('{"cardNumber":"4242424242424242","expiryMonth":"12","expiryYear":"2025","cvc":"123"}')
          });
        } catch {
          return Promise.resolve({
            PlainText: Buffer.from('{"cardNumber":"4242424242424242","expiryMonth":"12","expiryYear":"2025","cvc":"123"}')
          });
        }
      }
      
      return Promise.resolve({});
    })
  })),
  EncryptDataCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'EncryptDataCommand' },
    input: params
  })),
  DecryptDataCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'DecryptDataCommand' },
    input: params
  }))
}));

// Mock DynamoDB Client
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      const commandName = command.constructor.name;
      
      if (commandName === 'PutItemCommand') {
        return Promise.resolve({
          Attributes: command.input.Item
        });
      }
      
      if (commandName === 'GetItemCommand') {
        // Return mock transaction data
        return Promise.resolve({
          Item: {
            id: { S: 'txn_test_123' },
            paymentId: { S: command.input.Key.paymentId?.S || 'pay_test_123' },
            customerId: { S: 'customer_test_123' },
            providerId: { S: 'provider_test_123' },
            amount: { N: '10000' }, // $100.00
            currency: { S: 'USD' },
            status: { S: 'COMPLETED' },
            platformFee: { N: '800' }, // $8.00 (8%)
            processingFee: { N: '0' }, // $0.00 (AWS native)
            netAmount: { N: '9200' }, // $92.00
            paymentMethod: { S: 'card' },
            fraudScore: { N: '150' },
            createdAt: { S: new Date().toISOString() },
            updatedAt: { S: new Date().toISOString() }
          }
        });
      }
      
      if (commandName === 'UpdateItemCommand') {
        return Promise.resolve({
          Attributes: {
            updatedAt: { S: new Date().toISOString() }
          }
        });
      }
      
      if (commandName === 'QueryCommand' || commandName === 'ScanCommand') {
        return Promise.resolve({
          Items: [
            {
              id: { S: 'item_test_123' },
              createdAt: { S: new Date().toISOString() }
            }
          ],
          Count: 1,
          ScannedCount: 1
        });
      }
      
      return Promise.resolve({});
    })
  })),
  PutItemCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'PutItemCommand' },
    input: params
  })),
  GetItemCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'GetItemCommand' },
    input: params
  })),
  UpdateItemCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'UpdateItemCommand' },
    input: params
  })),
  QueryCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'QueryCommand' },
    input: params
  })),
  ScanCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'ScanCommand' },
    input: params
  }))
}));

// Mock SNS Client
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      if (command.constructor.name === 'PublishCommand') {
        return Promise.resolve({
          MessageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }
      return Promise.resolve({});
    })
  })),
  PublishCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'PublishCommand' },
    input: params
  }))
}));

// Mock Fraud Detector Client
jest.mock('@aws-sdk/client-frauddetector', () => ({
  FraudDetectorClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      if (command.constructor.name === 'GetEventPredictionCommand') {
        const amount = parseFloat(command.input.eventVariables?.amount || '0');
        
        // Simulate fraud scoring based on transaction patterns
        let fraudScore = 100; // Base low-risk score
        
        // Higher amounts get higher fraud scores
        if (amount > 100000) fraudScore = 850; // Very high risk
        else if (amount > 50000) fraudScore = 650; // High risk
        else if (amount > 10000) fraudScore = 350; // Medium risk
        
        // Suspicious card patterns
        const cardBin = command.input.eventVariables?.card_bin || '';
        if (cardBin.startsWith('555555')) fraudScore += 200; // Known test pattern
        
        // Suspicious email patterns
        const emailDomain = command.input.eventVariables?.email_domain || '';
        if (emailDomain.includes('tempmail') || emailDomain.includes('10minute')) {
          fraudScore += 300;
        }
        
        return Promise.resolve({
          modelScores: [
            {
              modelId: 'ecosystem_fraud_model_v1',
              modelType: 'ONLINE_FRAUD_INSIGHTS',
              scores: {
                'fraud_score': fraudScore
              }
            }
          ],
          ruleResults: [
            {
              ruleId: 'high_amount_rule',
              outcomes: fraudScore > 500 ? ['review'] : ['approve']
            }
          ]
        });
      }
      return Promise.resolve({});
    })
  })),
  GetEventPredictionCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'GetEventPredictionCommand' },
    input: params
  }))
}));

// Mock Secrets Manager Client
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      if (command.constructor.name === 'GetSecretValueCommand') {
        return Promise.resolve({
          SecretString: JSON.stringify({
            paymentCryptographyKeyId: 'test-key-id',
            fraudDetectorEndpoint: 'https://frauddetector.us-east-1.amazonaws.com',
            platformCommissionRate: 0.08,
            minimumTransactionAmount: 0.50
          })
        });
      }
      return Promise.resolve({});
    })
  })),
  GetSecretValueCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'GetSecretValueCommand' },
    input: params
  }))
}));

// Mock CloudWatch Client
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      if (command.constructor.name === 'PutMetricDataCommand') {
        return Promise.resolve({
          ResponseMetadata: {
            RequestId: `req_${Date.now()}`
          }
        });
      }
      return Promise.resolve({});
    })
  })),
  PutMetricDataCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'PutMetricDataCommand' },
    input: params
  }))
}));

// Mock AWS Lambda Context
export const mockLambdaContext = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
  memoryLimitInMB: '512',
  awsRequestId: `test-request-${Date.now()}`,
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2023/01/01/[$LATEST]test-stream',
  getRemainingTimeInMillis: jest.fn(() => 30000),
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn()
};

// Mock AppSync Resolver Event
export const mockAppSyncEvent = {
  arguments: {},
  identity: {
    sub: 'user_test_123',
    username: 'testuser@example.com',
    claims: {
      'cognito:groups': ['user'],
      email: 'testuser@example.com',
      email_verified: true
    }
  },
  source: null,
  request: {
    headers: {
      'user-agent': 'aws-appsync-client/1.0',
      'x-forwarded-for': '127.0.0.1'
    },
    domainName: 'test-appsync-domain.amazonaws.com'
  },
  prev: null,
  info: {
    fieldName: 'test',
    parentTypeName: 'Query',
    variables: {},
    selectionSetList: ['id', 'amount', 'status']
  },
  stash: {}
};

// Mock test data generators
export const generateTestCardData = () => ({
  cardNumber: '4242424242424242', // Visa test card
  expiryMonth: '12',
  expiryYear: '2025',
  cvc: '123',
  billingDetails: {
    name: 'Test User',
    email: 'test@example.com',
    address: {
      line1: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US'
    }
  }
});

export const generateTestBankAccount = () => ({
  routingNumber: '110000000', // Valid test routing number
  accountNumber: '1234567890123456',
  accountType: 'checking' as const,
  accountHolderName: 'Test Provider',
  bankName: 'Test Bank'
});

export const generateTestPaymentIntent = () => ({
  amount: 10000, // $100.00
  currency: 'USD',
  customerId: 'customer_test_123',
  providerId: 'provider_test_123',
  bookingId: 'booking_test_123',
  metadata: {
    serviceName: 'Test Service',
    location: 'Test City, TS'
  }
});

export const generateTestFraudScenarios = () => [
  {
    name: 'Low Risk Transaction',
    amount: 5000, // $50.00
    cardBin: '424242',
    emailDomain: 'gmail.com',
    expectedScore: 100,
    expectedRecommendation: 'APPROVE'
  },
  {
    name: 'Medium Risk Transaction',
    amount: 15000, // $150.00
    cardBin: '424242',
    emailDomain: 'yahoo.com',
    expectedScore: 350,
    expectedRecommendation: 'APPROVE'
  },
  {
    name: 'High Risk Transaction',
    amount: 75000, // $750.00
    cardBin: '555555',
    emailDomain: 'tempmail.org',
    expectedScore: 950,
    expectedRecommendation: 'BLOCK'
  }
];

// Cost calculation validation helpers
export const validatePlatformFees = (amount: number) => {
  const platformFeeRate = 0.08; // 8%
  const expectedPlatformFee = Math.round(amount * platformFeeRate);
  const expectedProcessingFee = 0; // AWS native = $0 processing fees
  const expectedNetAmount = amount - expectedPlatformFee - expectedProcessingFee;
  
  return {
    expectedPlatformFee,
    expectedProcessingFee,
    expectedNetAmount,
    costSavingsVsStripe: amount * 0.029 + 30 // Stripe's 2.9% + $0.30
  };
};

// Security validation helpers
export const validateEncryption = (encryptedData: string) => {
  try {
    // Validate base64 format
    const decoded = Buffer.from(encryptedData, 'base64');
    return decoded.length > 0;
  } catch {
    return false;
  }
};

export const validatePCICompliance = (cardData: any) => {
  // Ensure no plain text card data in logs or responses
  const dataString = JSON.stringify(cardData);
  const hasPlainCardNumber = /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/.test(dataString);
  const hasPlainCVC = /cvc["']:\s*["']\d{3,4}["']/.test(dataString);
  
  return {
    isCompliant: !hasPlainCardNumber && !hasPlainCVC,
    violations: {
      plainCardNumber: hasPlainCardNumber,
      plainCVC: hasPlainCVC
    }
  };
};

// Performance testing helpers
export const mockPerformanceMetrics = {
  paymentProcessingTime: 150, // ms
  fraudDetectionTime: 50, // ms
  encryptionTime: 25, // ms
  databaseWriteTime: 30, // ms
  totalProcessingTime: 255 // ms
};

// Cleanup helpers for integration tests
export const cleanupTestData = async () => {
  // Mock cleanup - in real tests this would clean up test records
  console.log('Cleaning up test data...');
  return Promise.resolve();
};

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  await cleanupTestData();
});

console.log('AWS Payment System test mocks initialized successfully');