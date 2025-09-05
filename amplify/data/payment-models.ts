import { a } from '@aws-amplify/backend';

/**
 * Cost-Optimized Payment Data Models
 * 
 * Implements DynamoDB best practices for AWS-native payment processing:
 * - On-demand billing for unpredictable payment volumes
 * - TTL for temporary data to reduce storage costs
 * - Sparse indexes to minimize index costs
 * - Single-table design patterns where appropriate
 * - ARM64 optimized read/write patterns
 */

// Payment Transaction Model with Cost Optimization
export const PaymentTransaction = a.model({
  // Primary Key
  id: a.id(),
  
  // Transaction Details
  customerId: a.string().required(),
  providerId: a.string().required(),
  bookingId: a.string().required(),
  
  // Payment Information
  amountCents: a.integer().required(),
  currency: a.string(),
  paymentMethod: a.enum(['card', 'ach']),
  
  // AWS Payment Cryptography Details
  paymentCryptoKeyId: a.string(),
  tokenizedCardData: a.string(), // Encrypted card token
  transactionHash: a.string(), // For verification
  
  // Status and Processing
  status: a.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  processingStartedAt: a.datetime(),
  completedAt: a.datetime(),
  failureReason: a.string(),
  
  // Cost Tracking
  processingCostCents: a.integer(), // AWS processing cost
  stripeSavedCostCents: a.integer(), // What Stripe would have cost
  savingsPercentage: a.float(),
  
  // Fraud Detection
  fraudScore: a.float(),
  fraudDetectorResult: a.json(),
  riskLevel: a.enum(['low', 'medium', 'high']),
  
  // Compliance and Audit
  auditTrail: a.json(),
  complianceChecks: a.json(),
  
  // TTL for temporary processing data (30 days)
  tempDataTtl: a.integer(),
  
  // Timestamps
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.authorization((allow) => [
  allow.owner().to(['create', 'read']),
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  allow.custom(), // For payment processor functions
])
.secondaryIndexes((index) => [
  index('customerId').sortKeys(['createdAt']).queryField('transactionsByCustomer'),
  index('providerId').sortKeys(['createdAt']).queryField('transactionsByProvider'),
  index('status').sortKeys(['createdAt']).queryField('transactionsByStatus'),
]);

// Escrow Account Model with Cost Optimization
export const EscrowAccount = a.model({
  // Primary Key
  id: a.id(),
  
  // Account Details
  transactionId: a.string().required(),
  customerId: a.string().required(),
  providerId: a.string().required(),
  
  // Escrow Information
  heldAmountCents: a.integer().required(),
  currency: a.string(),
  holdStartDate: a.datetime().required(),
  holdEndDate: a.datetime().required(),
  
  // Release Conditions
  status: a.enum(['holding', 'released', 'disputed', 'frozen']),
  releaseConditions: a.json(),
  autoReleaseEnabled: a.boolean(),
  
  // Interest Calculation (for compliance)
  interestRateAnnual: a.float(),
  accruedInterestCents: a.integer(),
  lastInterestCalculation: a.datetime(),
  
  // Dispute Handling
  disputeId: a.string(),
  disputeStatus: a.enum(['none', 'pending', 'resolved']),
  
  // Cost Optimization
  holdingCostCents: a.integer(), // Cost to hold funds
  interestEarnedCents: a.integer(), // Interest earned on held funds
  
  // TTL for completed escrows (90 days after release)
  cleanupTtl: a.integer(),
  
  // Timestamps
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.authorization((allow) => [
  allow.owner().to(['read']),
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  allow.custom(), // For escrow manager functions
])
.secondaryIndexes((index) => [
  index('status').sortKeys(['holdEndDate']).queryField('escrowsByStatusAndEndDate'),
  index('customerId').sortKeys(['createdAt']).queryField('escrowsByCustomer'),
  index('providerId').sortKeys(['createdAt']).queryField('escrowsByProvider'),
]);

// ACH Transfer Model for Direct Payouts
export const AchTransfer = a.model({
  // Primary Key
  id: a.id(),
  
  // Transfer Details
  providerId: a.string().required(),
  bankAccountId: a.string().required(),
  
  // Transfer Information
  amountCents: a.integer().required(),
  currency: a.string(),
  transferType: a.enum(['standard', 'same-day']),
  
  // Status and Processing
  status: a.enum(['initiated', 'processing', 'completed', 'failed', 'returned']),
  initiatedAt: a.datetime(),
  completedAt: a.datetime(),
  expectedCompletionDate: a.datetime(),
  
  // ACH Details
  achTraceNumber: a.string(),
  achBatchId: a.string(),
  returnCode: a.string(), // If returned
  returnReason: a.string(),
  
  // Cost Tracking
  transferFeeCents: a.integer(), // ACH fee
  stripeSavedFeeCents: a.integer(), // What Stripe Connect would have cost
  feePercentageSaved: a.float(),
  
  // Batch Information (for cost optimization)
  batchId: a.string(), // Groups transfers for batching
  batchSize: a.integer(),
  batchProcessedAt: a.datetime(),
  
  // Compliance
  nachaComplianceCheck: a.json(),
  fraudCheckResult: a.json(),
  
  // TTL for completed transfers (7 years for compliance)
  complianceTtl: a.integer(),
  
  // Timestamps
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.authorization((allow) => [
  allow.owner().to(['read']),
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  allow.custom(), // For ACH transfer functions
])
.secondaryIndexes((index) => [
  index('providerId').sortKeys(['createdAt']).queryField('transfersByProvider'),
  index('status').sortKeys(['createdAt']).queryField('transfersByStatus'),
  index('batchId').sortKeys(['createdAt']).queryField('transfersByBatch'),
]);

// Bank Account Model for ACH Transfers
export const BankAccount = a.model({
  // Primary Key
  id: a.id(),
  
  // Account Details
  providerId: a.string().required(),
  accountType: a.enum(['checking', 'savings']),
  
  // Bank Information (encrypted)
  routingNumber: a.string().required(),
  accountNumberHash: a.string().required(), // Hashed for security
  accountNumberLastFour: a.string().required(),
  bankName: a.string(),
  
  // Verification Status
  verificationStatus: a.enum(['pending', 'verified', 'failed']),
  verificationMethod: a.enum(['micro-deposits', 'instant']),
  microDepositAmount1: a.integer(),
  microDepositAmount2: a.integer(),
  verificationAttempts: a.integer(),
  
  // Account Status
  active: a.boolean(),
  suspendedReason: a.string(),
  lastUsedAt: a.datetime(),
  
  // ACH Limits
  dailyLimitCents: a.integer(),
  monthlyLimitCents: a.integer(),
  currentDailyUsageCents: a.integer(),
  currentMonthlyUsageCents: a.integer(),
  
  // TTL for inactive accounts (2 years)
  inactiveTtl: a.integer(),
  
  // Timestamps
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.authorization((allow) => [
  allow.owner().to(['create', 'read', 'update', 'delete']),
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  allow.custom(), // For bank account verification
])
.secondaryIndexes((index) => [
  index('providerId').sortKeys(['createdAt']).queryField('bankAccountsByProvider'),
  index('verificationStatus').sortKeys(['createdAt']).queryField('bankAccountsByVerificationStatus'),
]);

// Cost Metrics Model for Real-time Monitoring
export const CostMetric = a.model({
  // Primary Key
  id: a.id(),
  
  // Metric Details
  transactionId: a.string().required(),
  metricType: a.enum(['transaction_cost', 'transfer_cost', 'storage_cost', 'compute_cost']),
  
  // Cost Information
  awsCostCents: a.integer().required(),
  stripeBaselineCostCents: a.integer().required(),
  savingsCents: a.integer().required(),
  savingsPercentage: a.float().required(),
  
  // Service Breakdown
  lambdaCostCents: a.integer(),
  dynamoDbCostCents: a.integer(),
  paymentCryptoCostCents: a.integer(),
  achCostCents: a.integer(),
  
  // Performance Metrics
  processingTimeMs: a.integer(),
  memoryUsedMB: a.integer(),
  coldStart: a.boolean(),
  architecture: a.enum(['x86_64', 'arm64']),
  
  // TTL for metrics (90 days)
  metricTtl: a.integer(),
  
  // Timestamps
  timestamp: a.datetime().required(),
  createdAt: a.datetime(),
})
.authorization((allow) => [
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  allow.custom(), // For cost monitoring functions
])
.secondaryIndexes((index) => [
  index('metricType').sortKeys(['timestamp']).queryField('metricsByType'),
  index('transactionId').sortKeys(['timestamp']).queryField('metricsByTransaction'),
]);

// Savings Report Model for Daily/Monthly Reporting
export const SavingsReport = a.model({
  // Primary Key (date-based)
  reportDate: a.string().required(), // YYYY-MM-DD format
  
  // Report Type
  reportType: a.enum(['daily', 'weekly', 'monthly', 'yearly']),
  
  // Transaction Summary
  totalTransactions: a.integer().required(),
  totalVolumeProcessedCents: a.integer().required(),
  
  // Cost Summary
  totalAwsCostCents: a.integer().required(),
  totalStripeBaselineCostCents: a.integer().required(),
  totalSavingsCents: a.integer().required(),
  savingsPercentage: a.float().required(),
  
  // Average Metrics
  averageCostPerTransactionCents: a.float().required(),
  averageSavingsPerTransactionCents: a.float().required(),
  
  // Projections
  projectedMonthlySavingsCents: a.integer(),
  projectedYearlySavingsCents: a.integer(),
  
  // Service Breakdown
  lambdaCostCents: a.integer(),
  dynamoDbCostCents: a.integer(),
  paymentCryptoCostCents: a.integer(),
  achCostCents: a.integer(),
  
  // Performance Metrics
  averageProcessingTimeMs: a.float(),
  coldStartPercentage: a.float(),
  arm64UsagePercentage: a.float(),
  
  // TTL for old reports (2 years)
  reportTtl: a.integer(),
  
  // Timestamps
  generatedAt: a.datetime(),
  createdAt: a.datetime(),
})
.identifier(['reportDate', 'reportType'])
.authorization((allow) => [
  allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
  allow.custom(), // For reporting functions
])
.secondaryIndexes((index) => [
  index('reportType').sortKeys(['reportDate']).queryField('reportsByType'),
]);

// Temporary Processing Data Model (with aggressive TTL)
export const TempProcessingData = a.model({
  // Primary Key
  id: a.id(),
  
  // Processing Details
  transactionId: a.string().required(),
  processingStep: a.string().required(),
  
  // Temporary Data
  tempData: a.json().required(),
  dataType: a.enum(['card_token', 'processing_state', 'fraud_check', 'verification']),
  
  // Encryption Details
  encryptionKeyId: a.string(),
  encrypted: a.boolean(),
  
  // Aggressive TTL (1 hour for processing data)
  processingTtl: a.integer().required(),
  
  // Timestamps
  createdAt: a.datetime(),
})
.authorization((allow) => [
  allow.custom(), // Only payment processing functions
])
.secondaryIndexes((index) => [
  index('transactionId').sortKeys(['processingStep']).queryField('tempDataByTransaction'),
]);