import { handler } from '@/amplify/functions/fraud-detector/handler';
import { FraudDetectorClient } from '@aws-sdk/client-frauddetector';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import type { AppSyncResolverEvent, Context } from 'aws-lambda';

// Mock AWS clients
const fraudMock = mockClient(FraudDetectorClient);
const dynamoMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);

describe('Fraud Detector Lambda', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'fraud-detector',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:fraud-detector',
    memoryLimitInMB: '512',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/fraud-detector',
    logStreamName: '2024/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn()
  };

  const mockIdentity = {
    sub: 'user-123',
    username: 'testuser'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fraudMock.reset();
    dynamoMock.reset();
    snsMock.reset();

    // Setup environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.FRAUD_DETECTOR_NAME = 'payment_fraud_detector';
    process.env.FRAUD_EVENTS_TABLE = 'FraudEventsTable';
    process.env.SECURITY_ALERTS_TOPIC = 'arn:aws:sns:us-east-1:123456789012:security-alerts';
  });

  describe('evaluate_transaction action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'evaluate_transaction',
        transactionId: 'txn_123456789',
        customerId: 'customer-123',
        amount: 10000, // $100.00
        currency: 'USD',
        paymentMethod: 'card',
        cardBin: '424242',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        deviceFingerprint: 'device_abc123',
        sessionId: 'sess_xyz789',
        merchantCategory: 'marketplace_services',
        billingAddress: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
          zipCode: '94102'
        }
      },
      identity: mockIdentity,
      source: {},
      request: {
        headers: {},
        domainName: null
      },
      prev: null,
      info: {
        fieldName: 'evaluateTransaction',
        parentTypeName: 'Query',
        variables: {},
        selectionSetList: [],
        selectionSetGraphQL: ''
      },
      stash: {}
    };

    it('should evaluate low-risk transaction and approve', async () => {
      // Mock AWS Fraud Detector response for low-risk transaction
      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: {
            modelId: 'payment_fraud_model',
            modelType: 'ONLINE_FRAUD_INSIGHTS',
            modelVersionNumber: '1.0'
          },
          scores: {
            payment_fraud: 150  // Low risk score (0-1000 scale)
          }
        }],
        ruleResults: [{
          ruleId: 'low_amount_rule',
          outcomes: ['approve']
        }],
        externalModelOutputs: []
      });

      dynamoMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.fraudScore).toBe(150);
      expect(result.riskLevel).toBe('LOW');
      expect(result.recommendation).toBe('APPROVE');
      expect(result.reasonCodes).toContain('low_risk');
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.correlationId).toMatch(/^corr_/);
    });

    it('should detect high-risk transaction and block', async () => {
      const highRiskEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          amount: 100000, // $1000.00 - high amount
          ipAddress: '1.1.1.1' // Suspicious IP
        }
      };

      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: {
            modelId: 'payment_fraud_model',
            modelType: 'ONLINE_FRAUD_INSIGHTS',
            modelVersionNumber: '1.0'
          },
          scores: {
            payment_fraud: 950  // High risk score
          }
        }],
        ruleResults: [{
          ruleId: 'high_amount_rule',
          outcomes: ['block']
        }, {
          ruleId: 'suspicious_ip_rule',
          outcomes: ['investigate']
        }],
        externalModelOutputs: []
      });

      dynamoMock.onAnyCommand().resolves({});
      snsMock.onAnyCommand().resolves({});

      const result = await handler(highRiskEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.fraudScore).toBe(950);
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.recommendation).toBe('BLOCK');
      expect(result.reasonCodes).toContain('high_amount');
      expect(result.automatedActions).toContain('block_transaction');
    });

    it('should flag medium-risk transaction for review', async () => {
      const mediumRiskEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          amount: 25000, // $250.00 - medium amount
        }
      };

      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: {
            modelId: 'payment_fraud_model',
            modelType: 'ONLINE_FRAUD_INSIGHTS',
            modelVersionNumber: '1.0'
          },
          scores: {
            payment_fraud: 650  // Medium risk score
          }
        }],
        ruleResults: [{
          ruleId: 'medium_amount_rule',
          outcomes: ['review']
        }],
        externalModelOutputs: []
      });

      dynamoMock.onAnyCommand().resolves({});
      snsMock.onAnyCommand().resolves({});

      const result = await handler(mediumRiskEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.fraudScore).toBe(650);
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.recommendation).toBe('REVIEW');
      expect(result.automatedActions).toContain('flag_for_review');
    });

    it('should perform velocity checks', async () => {
      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: { modelId: 'payment_fraud_model', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' },
          scores: { payment_fraud: 200 }
        }],
        ruleResults: [],
        externalModelOutputs: []
      });

      // Mock velocity check - multiple transactions from same customer
      dynamoMock.onAnyCommand().resolves({
        Items: [
          { customerId: { S: 'customer-123' }, amount: { N: '5000' }, timestamp: { S: new Date(Date.now() - 30000).toISOString() } },
          { customerId: { S: 'customer-123' }, amount: { N: '7500' }, timestamp: { S: new Date(Date.now() - 60000).toISOString() } }
        ]
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.velocityChecks).toBeDefined();
      expect(result.velocityChecks?.flags).toBeDefined();
      expect(result.velocityChecks?.totalAmount).toBeGreaterThan(0);
      expect(result.velocityChecks?.transactionCount).toBeGreaterThan(0);
    });

    it('should analyze device fingerprints', async () => {
      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: { modelId: 'payment_fraud_model', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' },
          scores: { payment_fraud: 100 }
        }],
        ruleResults: [],
        externalModelOutputs: []
      });

      dynamoMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.deviceAnalysis).toBeDefined();
      expect(result.deviceAnalysis?.deviceFingerprint).toBe('device_abc123');
      expect(result.deviceAnalysis?.riskFactors).toBeDefined();
      expect(result.deviceAnalysis?.fraudScore).toBeGreaterThanOrEqual(0);
    });

    it('should perform geographic risk analysis', async () => {
      const internationalEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          billingAddress: {
            country: 'NG', // Nigeria - higher risk country
            state: 'Lagos',
            city: 'Lagos',
            zipCode: '100001'
          },
          ipAddress: '197.149.90.1' // Nigerian IP
        }
      };

      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: { modelId: 'payment_fraud_model', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' },
          scores: { payment_fraud: 400 }
        }],
        ruleResults: [],
        externalModelOutputs: []
      });

      dynamoMock.onAnyCommand().resolves({});

      const result = await handler(internationalEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.geographicAnalysis).toBeDefined();
      expect(result.geographicAnalysis?.country).toBe('NG');
      expect(result.geographicAnalysis?.riskLevel).toBeDefined();
      expect(result.geographicAnalysis?.fraudScore).toBeGreaterThan(0);
    });
  });

  describe('get_fraud_history action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'get_fraud_history',
        customerId: 'customer-123',
        limit: 10
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'getFraudHistory', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should retrieve customer fraud history', async () => {
      dynamoMock.onAnyCommand().resolves({
        Items: [
          {
            customerId: { S: 'customer-123' },
            transactionId: { S: 'txn_111' },
            fraudScore: { N: '200' },
            riskLevel: { S: 'LOW' },
            recommendation: { S: 'APPROVE' },
            timestamp: { S: '2024-01-01T10:00:00Z' }
          },
          {
            customerId: { S: 'customer-123' },
            transactionId: { S: 'txn_222' },
            fraudScore: { N: '650' },
            riskLevel: { S: 'MEDIUM' },
            recommendation: { S: 'REVIEW' },
            timestamp: { S: '2024-01-01T09:00:00Z' }
          }
        ]
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.fraudHistory).toBeDefined();
      expect(result.fraudHistory?.length).toBe(2);
      expect(result.fraudHistory?.[0].transactionId).toBe('txn_111');
      expect(result.fraudHistory?.[0].fraudScore).toBe(200);
    });
  });

  describe('update_fraud_rules action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'update_fraud_rules',
        ruleUpdates: [
          {
            ruleId: 'high_amount_rule',
            threshold: 50000,
            action: 'block'
          },
          {
            ruleId: 'velocity_rule',
            threshold: 5,
            timeWindow: 3600,
            action: 'review'
          }
        ]
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'updateFraudRules', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should update fraud detection rules', async () => {
      fraudMock.onAnyCommand().resolves({});
      dynamoMock.onAnyCommand().resolves({});
      snsMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.updatedRules).toBeDefined();
      expect(result.updatedRules?.length).toBe(2);
      expect(result.message).toContain('updated successfully');
    });
  });

  describe('Performance Tests', () => {
    it('should complete fraud evaluation within acceptable time', async () => {
      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: { modelId: 'payment_fraud_model', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' },
          scores: { payment_fraud: 150 }
        }],
        ruleResults: [],
        externalModelOutputs: []
      });
      dynamoMock.onAnyCommand().resolves({});

      const mockEvent: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'evaluate_transaction',
          transactionId: 'txn_perf_test',
          customerId: 'customer-perf',
          amount: 10000,
          currency: 'USD'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'evaluateTransaction', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const startTime = Date.now();
      const result = await handler(mockEvent, mockContext);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle high-volume fraud evaluation', async () => {
      fraudMock.onAnyCommand().resolves({
        modelScores: [{
          modelVersion: { modelId: 'payment_fraud_model', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' },
          scores: { payment_fraud: 150 }
        }],
        ruleResults: [],
        externalModelOutputs: []
      });
      dynamoMock.onAnyCommand().resolves({});

      const promises = Array.from({ length: 100 }, (_, i) => {
        const event: AppSyncResolverEvent<any> = {
          arguments: {
            action: 'evaluate_transaction',
            transactionId: `txn_load_${i}`,
            customerId: `customer-${i}`,
            amount: 10000,
            currency: 'USD'
          },
          identity: mockIdentity,
          source: {},
          request: { headers: {}, domainName: null },
          prev: null,
          info: { fieldName: 'evaluateTransaction', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
          stash: {}
        };
        return handler(event, mockContext);
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(100);
      expect(duration).toBeLessThan(10000); // Should handle 100 requests within 10 seconds
    });
  });

  describe('Security Tests', () => {
    it('should validate input data thoroughly', async () => {
      const maliciousEvent: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'evaluate_transaction',
          transactionId: '<script>alert("xss")</script>',
          customerId: '../../etc/passwd',
          amount: -1000, // Negative amount
          currency: 'INVALID'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'evaluateTransaction', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const result = await handler(maliciousEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    it('should require authentication for sensitive operations', async () => {
      const unauthenticatedEvent = {
        arguments: {
          action: 'update_fraud_rules',
          ruleUpdates: []
        },
        identity: null,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'updateFraudRules', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const result = await handler(unauthenticatedEvent as any, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication required');
    });

    it('should sanitize sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      fraudMock.onAnyCommand().resolves({
        modelScores: [{ modelVersion: { modelId: 'test', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' }, scores: { payment_fraud: 150 } }],
        ruleResults: [],
        externalModelOutputs: []
      });
      dynamoMock.onAnyCommand().resolves({});

      const eventWithSensitiveData: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'evaluate_transaction',
          transactionId: 'txn_123',
          customerId: 'customer-123',
          email: 'sensitive@email.com',
          ipAddress: '192.168.1.1',
          cardBin: '424242'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'evaluateTransaction', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      await handler(eventWithSensitiveData, mockContext);

      const logCalls = consoleSpy.mock.calls;
      const logMessages = logCalls.map(call => JSON.stringify(call));

      // Ensure sensitive data is not logged in plain text
      logMessages.forEach(message => {
        expect(message).not.toContain('sensitive@email.com');
        expect(message).not.toContain('192.168.1.1');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Fraud Score Accuracy', () => {
    const testCases = [
      { amount: 1000, expectedRisk: 'LOW', expectedScore: { min: 0, max: 300 } },
      { amount: 25000, expectedRisk: 'MEDIUM', expectedScore: { min: 400, max: 700 } },
      { amount: 100000, expectedRisk: 'HIGH', expectedScore: { min: 700, max: 900 } },
      { amount: 500000, expectedRisk: 'CRITICAL', expectedScore: { min: 900, max: 1000 } }
    ];

    testCases.forEach(({ amount, expectedRisk, expectedScore }) => {
      it(`should correctly assess risk for $${amount/100} transaction`, async () => {
        fraudMock.onAnyCommand().resolves({
          modelScores: [{
            modelVersion: { modelId: 'payment_fraud_model', modelType: 'ONLINE_FRAUD_INSIGHTS', modelVersionNumber: '1.0' },
            scores: { payment_fraud: (expectedScore.min + expectedScore.max) / 2 }
          }],
          ruleResults: [],
          externalModelOutputs: []
        });
        dynamoMock.onAnyCommand().resolves({});

        const event: AppSyncResolverEvent<any> = {
          arguments: {
            action: 'evaluate_transaction',
            transactionId: `txn_${amount}`,
            customerId: 'customer-test',
            amount,
            currency: 'USD'
          },
          identity: mockIdentity,
          source: {},
          request: { headers: {}, domainName: null },
          prev: null,
          info: { fieldName: 'evaluateTransaction', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
          stash: {}
        };

        const result = await handler(event, mockContext);

        expect(result.success).toBe(true);
        expect(result.riskLevel).toBe(expectedRisk);
        expect(result.fraudScore).toBeGreaterThanOrEqual(expectedScore.min);
        expect(result.fraudScore).toBeLessThanOrEqual(expectedScore.max);
      });
    });
  });
});

// Test utilities for integration tests
export const createMockFraudEvent = (overrides = {}) => ({
  arguments: {
    action: 'evaluate_transaction',
    transactionId: 'txn_test',
    customerId: 'customer-test',
    amount: 10000,
    currency: 'USD',
    paymentMethod: 'card',
    email: 'test@example.com',
    ipAddress: '192.168.1.1',
    ...overrides
  },
  identity: { sub: 'user-123', username: 'testuser' },
  source: {},
  request: { headers: {}, domainName: null },
  prev: null,
  info: { fieldName: 'evaluateTransaction', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
  stash: {}
});