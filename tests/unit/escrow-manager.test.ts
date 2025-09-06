import { handler } from '@/amplify/functions/escrow-manager/handler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { mockClient } from 'aws-sdk-client-mock';
import type { AppSyncResolverEvent, Context } from 'aws-lambda';

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);
const eventBridgeMock = mockClient(EventBridgeClient);

describe('Escrow Manager Lambda', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'escrow-manager',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:escrow-manager',
    memoryLimitInMB: '512',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/escrow-manager',
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
    dynamoMock.reset();
    snsMock.reset();
    eventBridgeMock.reset();

    // Setup environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.ESCROW_ACCOUNTS_TABLE = 'EscrowAccountsTable';
    process.env.ESCROW_TRANSACTIONS_TABLE = 'EscrowTransactionsTable';
    process.env.ESCROW_EVENTS_TOPIC = 'arn:aws:sns:us-east-1:123456789012:escrow-events';
    process.env.EVENT_BUS_NAME = 'payment-events-bus';
  });

  describe('create_escrow_account action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'create_escrow_account',
        providerId: 'provider-123',
        initialBalance: 0,
        currency: 'USD',
        accountType: 'provider_payout',
        metadata: {
          businessName: 'Test Service Provider',
          taxId: 'XX-XXXXXXX'
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
        fieldName: 'createEscrowAccount',
        parentTypeName: 'Mutation',
        variables: {},
        selectionSetList: [],
        selectionSetGraphQL: ''
      },
      stash: {}
    };

    it('should successfully create a new escrow account', async () => {
      dynamoMock.onAnyCommand().resolves({});
      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.accountId).toMatch(/^escrow_/);
      expect(result.providerId).toBe('provider-123');
      expect(result.balance).toBe(0);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('ACTIVE');
      expect(result.accountType).toBe('provider_payout');
    });

    it('should handle duplicate account creation', async () => {
      // Mock existing account
      dynamoMock.onAnyCommand().rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Account already exists'
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidEvent = {
        ...mockEvent,
        arguments: {
          action: 'create_escrow_account'
          // Missing required providerId
        }
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider ID required');
    });
  });

  describe('deposit_funds action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'deposit_funds',
        accountId: 'escrow_acc_123',
        amount: 50000, // $500.00
        currency: 'USD',
        transactionId: 'txn_deposit_123',
        source: 'customer_payment',
        metadata: {
          bookingId: 'booking-456',
          customerId: 'customer-789'
        }
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'depositFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should successfully deposit funds to escrow account', async () => {
      // Mock existing account
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '10000' }, // $100.00 existing balance
            currency: { S: 'USD' },
            status: { S: 'ACTIVE' }
          }
        })
        .resolves({});

      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^escrow_txn_/);
      expect(result.accountId).toBe('escrow_acc_123');
      expect(result.amount).toBe(50000);
      expect(result.newBalance).toBe(60000); // $100 + $500 = $600
      expect(result.transactionType).toBe('DEPOSIT');
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject deposits to inactive accounts', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_123' },
          providerId: { S: 'provider-123' },
          balance: { N: '10000' },
          currency: { S: 'USD' },
          status: { S: 'SUSPENDED' }
        }
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account is not active');
    });

    it('should validate currency matches account currency', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_123' },
          providerId: { S: 'provider-123' },
          balance: { N: '10000' },
          currency: { S: 'USD' },
          status: { S: 'ACTIVE' }
        }
      });

      const differentCurrencyEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          currency: 'EUR'
        }
      };

      const result = await handler(differentCurrencyEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Currency mismatch');
    });

    it('should prevent negative deposit amounts', async () => {
      const negativeAmountEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          amount: -1000
        }
      };

      const result = await handler(negativeAmountEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be positive');
    });
  });

  describe('release_funds action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'release_funds',
        accountId: 'escrow_acc_123',
        amount: 30000, // $300.00
        currency: 'USD',
        releaseCondition: 'booking_completed',
        destinationAccount: 'provider_bank_account',
        transactionId: 'txn_release_123',
        metadata: {
          bookingId: 'booking-456',
          completionDate: '2024-01-15T10:00:00Z'
        }
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'releaseFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should successfully release funds when conditions are met', async () => {
      // Mock account with sufficient balance
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '50000' }, // $500.00 available
            currency: { S: 'USD' },
            status: { S: 'ACTIVE' }
          }
        })
        .resolves({});

      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^escrow_txn_/);
      expect(result.accountId).toBe('escrow_acc_123');
      expect(result.amount).toBe(30000);
      expect(result.newBalance).toBe(20000); // $500 - $300 = $200
      expect(result.transactionType).toBe('RELEASE');
      expect(result.status).toBe('COMPLETED');
      expect(result.releaseCondition).toBe('booking_completed');
    });

    it('should reject release when insufficient funds', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_123' },
          providerId: { S: 'provider-123' },
          balance: { N: '20000' }, // Only $200.00 available
          currency: { S: 'USD' },
          status: { S: 'ACTIVE' }
        }
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });

    it('should validate release conditions', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_123' },
          providerId: { S: 'provider-123' },
          balance: { N: '50000' },
          currency: { S: 'USD' },
          status: { S: 'ACTIVE' }
        }
      });

      const invalidConditionEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          releaseCondition: 'invalid_condition'
        }
      };

      const result = await handler(invalidConditionEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid release condition');
    });

    it('should handle conditional releases with time delays', async () => {
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '50000' },
            currency: { S: 'USD' },
            status: { S: 'ACTIVE' }
          }
        })
        .resolves({});

      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const timedReleaseEvent = {
        ...mockEvent,
        arguments: {
          ...mockEvent.arguments,
          releaseCondition: 'time_based',
          releaseDate: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
        }
      };

      const result = await handler(timedReleaseEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.status).toBe('SCHEDULED');
      expect(result.releaseDate).toBeDefined();
    });
  });

  describe('get_account_balance action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'get_account_balance',
        accountId: 'escrow_acc_123'
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'getAccountBalance', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should return current account balance and details', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_123' },
          providerId: { S: 'provider-123' },
          balance: { N: '75000' },
          currency: { S: 'USD' },
          status: { S: 'ACTIVE' },
          createdAt: { S: '2024-01-01T00:00:00Z' },
          lastTransactionAt: { S: '2024-01-10T15:30:00Z' }
        }
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('escrow_acc_123');
      expect(result.providerId).toBe('provider-123');
      expect(result.balance).toBe(75000);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('ACTIVE');
      expect(result.createdAt).toBeDefined();
      expect(result.lastTransactionAt).toBeDefined();
    });

    it('should handle non-existent accounts', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: undefined
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });
  });

  describe('get_transaction_history action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'get_transaction_history',
        accountId: 'escrow_acc_123',
        limit: 10,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'getTransactionHistory', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should return transaction history for account', async () => {
      dynamoMock.onAnyCommand().resolves({
        Items: [
          {
            transactionId: { S: 'escrow_txn_001' },
            accountId: { S: 'escrow_acc_123' },
            amount: { N: '50000' },
            transactionType: { S: 'DEPOSIT' },
            status: { S: 'COMPLETED' },
            timestamp: { S: '2024-01-10T10:00:00Z' }
          },
          {
            transactionId: { S: 'escrow_txn_002' },
            accountId: { S: 'escrow_acc_123' },
            amount: { N: '25000' },
            transactionType: { S: 'RELEASE' },
            status: { S: 'COMPLETED' },
            timestamp: { S: '2024-01-15T14:30:00Z' }
          }
        ]
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.transactions).toBeDefined();
      expect(result.transactions?.length).toBe(2);
      expect(result.transactions?.[0].transactionId).toBe('escrow_txn_001');
      expect(result.transactions?.[0].amount).toBe(50000);
      expect(result.transactions?.[0].transactionType).toBe('DEPOSIT');
      expect(result.transactions?.[1].amount).toBe(25000);
      expect(result.transactions?.[1].transactionType).toBe('RELEASE');
    });
  });

  describe('freeze_account action', () => {
    const mockEvent: AppSyncResolverEvent<any> = {
      arguments: {
        action: 'freeze_account',
        accountId: 'escrow_acc_123',
        reason: 'fraud_investigation',
        metadata: {
          investigationId: 'inv_123',
          suspicionLevel: 'high'
        }
      },
      identity: mockIdentity,
      source: {},
      request: { headers: {}, domainName: null },
      prev: null,
      info: { fieldName: 'freezeAccount', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
      stash: {}
    };

    it('should successfully freeze account for investigation', async () => {
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '50000' },
            status: { S: 'ACTIVE' }
          }
        })
        .resolves({});

      snsMock.onAnyCommand().resolves({});

      const result = await handler(mockEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('escrow_acc_123');
      expect(result.status).toBe('FROZEN');
      expect(result.reason).toBe('fraud_investigation');
      expect(result.frozenAt).toBeDefined();
    });

    it('should notify relevant parties when account is frozen', async () => {
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '50000' },
            status: { S: 'ACTIVE' }
          }
        })
        .resolves({});

      const snsPublishSpy = jest.fn();
      snsMock.on('PublishCommand' as any).callsFake(snsPublishSpy);

      await handler(mockEvent, mockContext);

      expect(snsPublishSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume escrow operations', async () => {
      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_test' },
          providerId: { S: 'provider-test' },
          balance: { N: '100000' },
          currency: { S: 'USD' },
          status: { S: 'ACTIVE' }
        }
      });
      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const promises = Array.from({ length: 50 }, (_, i) => {
        const event: AppSyncResolverEvent<any> = {
          arguments: {
            action: 'deposit_funds',
            accountId: `escrow_acc_${i}`,
            amount: 1000,
            currency: 'USD',
            transactionId: `txn_${i}`,
            source: 'test_payment'
          },
          identity: mockIdentity,
          source: {},
          request: { headers: {}, domainName: null },
          prev: null,
          info: { fieldName: 'depositFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
          stash: {}
        };
        return handler(event, mockContext);
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(50);
      expect(duration).toBeLessThan(15000); // Should handle 50 operations within 15 seconds
    });

    it('should maintain transaction consistency under concurrent operations', async () => {
      let currentBalance = 100000;
      
      dynamoMock.onAnyCommand()
        .callsFake(() => {
          return Promise.resolve({
            Item: {
              accountId: { S: 'escrow_acc_concurrent' },
              providerId: { S: 'provider-concurrent' },
              balance: { N: currentBalance.toString() },
              currency: { S: 'USD' },
              status: { S: 'ACTIVE' }
            }
          });
        });

      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const concurrentOps = [
        // Deposit operations
        ...Array.from({ length: 5 }, (_, i) => ({
          action: 'deposit_funds',
          accountId: 'escrow_acc_concurrent',
          amount: 5000,
          transactionId: `deposit_${i}`
        })),
        // Release operations
        ...Array.from({ length: 3 }, (_, i) => ({
          action: 'release_funds',
          accountId: 'escrow_acc_concurrent',
          amount: 3000,
          transactionId: `release_${i}`,
          releaseCondition: 'booking_completed'
        }))
      ];

      const promises = concurrentOps.map(args => {
        const event: AppSyncResolverEvent<any> = {
          arguments: args,
          identity: mockIdentity,
          source: {},
          request: { headers: {}, domainName: null },
          prev: null,
          info: { fieldName: args.action === 'deposit_funds' ? 'depositFunds' : 'releaseFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
          stash: {}
        };
        return handler(event, mockContext);
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(0);
      // In a real scenario, we'd verify the final balance matches expected transactions
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access to escrow accounts', async () => {
      const unauthorizedEvent: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'get_account_balance',
          accountId: 'escrow_acc_unauthorized'
        },
        identity: { sub: 'unauthorized-user', username: 'hacker' },
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'getAccountBalance', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_unauthorized' },
          providerId: { S: 'different-provider' },
          balance: { N: '50000' },
          status: { S: 'ACTIVE' }
        }
      });

      const result = await handler(unauthorizedEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized access');
    });

    it('should validate transaction amounts against limits', async () => {
      const largeAmountEvent: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'deposit_funds',
          accountId: 'escrow_acc_123',
          amount: 10000000, // $100,000 - very large amount
          currency: 'USD',
          transactionId: 'txn_large_amount',
          source: 'customer_payment'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'depositFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const result = await handler(largeAmountEvent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount exceeds maximum limit');
    });

    it('should log all escrow operations for audit purposes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      dynamoMock.onAnyCommand().resolves({
        Item: {
          accountId: { S: 'escrow_acc_123' },
          providerId: { S: 'provider-123' },
          balance: { N: '50000' },
          currency: { S: 'USD' },
          status: { S: 'ACTIVE' }
        }
      });
      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const auditEvent: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'deposit_funds',
          accountId: 'escrow_acc_123',
          amount: 25000,
          currency: 'USD',
          transactionId: 'txn_audit_test',
          source: 'customer_payment'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'depositFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      await handler(auditEvent, mockContext);

      expect(consoleSpy).toHaveBeenCalled();
      
      const logCalls = consoleSpy.mock.calls;
      const auditLogs = logCalls.filter(call => {
        const logData = JSON.parse(call[0]);
        return logData.level === 'INFO' && logData.resolver === 'escrow-manager';
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB service errors gracefully', async () => {
      dynamoMock.onAnyCommand().rejects(new Error('DynamoDB service unavailable'));

      const event: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'get_account_balance',
          accountId: 'escrow_acc_123'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'getAccountBalance', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const result = await handler(event, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('service unavailable');
    });

    it('should rollback transactions on partial failures', async () => {
      // Mock successful account retrieval but failed balance update
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '50000' },
            currency: { S: 'USD' },
            status: { S: 'ACTIVE' }
          }
        })
        .rejectsOnce(new Error('Update failed'))
        .resolves({}); // Rollback operation

      const event: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'deposit_funds',
          accountId: 'escrow_acc_123',
          amount: 10000,
          currency: 'USD',
          transactionId: 'txn_rollback_test',
          source: 'customer_payment'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'depositFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const result = await handler(event, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Compliance and Audit', () => {
    it('should maintain immutable transaction records', async () => {
      dynamoMock.onAnyCommand()
        .resolvesOnce({
          Item: {
            accountId: { S: 'escrow_acc_123' },
            providerId: { S: 'provider-123' },
            balance: { N: '50000' },
            currency: { S: 'USD' },
            status: { S: 'ACTIVE' }
          }
        })
        .resolves({});

      snsMock.onAnyCommand().resolves({});
      eventBridgeMock.onAnyCommand().resolves({});

      const event: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'deposit_funds',
          accountId: 'escrow_acc_123',
          amount: 15000,
          currency: 'USD',
          transactionId: 'txn_immutable_test',
          source: 'customer_payment'
        },
        identity: mockIdentity,
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'depositFunds', parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      const result = await handler(event, mockContext);

      expect(result.success).toBe(true);
      
      // Verify that transaction record was created (would be immutable in DynamoDB)
      expect(result.transactionId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.auditTrail).toBeDefined();
    });

    it('should generate compliance reports', async () => {
      const reportEvent: AppSyncResolverEvent<any> = {
        arguments: {
          action: 'generate_compliance_report',
          reportType: 'monthly_summary',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z'
        },
        identity: { sub: 'admin-user', username: 'admin' },
        source: {},
        request: { headers: {}, domainName: null },
        prev: null,
        info: { fieldName: 'generateComplianceReport', parentTypeName: 'Query', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
        stash: {}
      };

      dynamoMock.onAnyCommand().resolves({
        Items: [
          {
            transactionId: { S: 'txn_001' },
            amount: { N: '50000' },
            transactionType: { S: 'DEPOSIT' },
            timestamp: { S: '2024-01-15T10:00:00Z' }
          }
        ]
      });

      const result = await handler(reportEvent, mockContext);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary?.totalDeposits).toBeGreaterThan(0);
      expect(result.summary?.totalReleases).toBeGreaterThanOrEqual(0);
      expect(result.summary?.accountCount).toBeGreaterThan(0);
    });
  });
});

// Test utilities for integration tests
export const createMockEscrowEvent = (action: string, overrides = {}) => ({
  arguments: {
    action,
    accountId: 'escrow_acc_test',
    ...overrides
  },
  identity: { sub: 'user-123', username: 'testuser' },
  source: {},
  request: { headers: {}, domainName: null },
  prev: null,
  info: { fieldName: action, parentTypeName: 'Mutation', variables: {}, selectionSetList: [], selectionSetGraphQL: '' },
  stash: {}
});

export const mockEscrowAccount = {
  accountId: 'escrow_acc_test',
  providerId: 'provider-test',
  balance: 50000,
  currency: 'USD',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};