# AWS Native Payment System - Deployment & Configuration Guide

This comprehensive guide covers deploying and configuring the AWS Native Payment Processing system that replaces Stripe with 98% cost reduction through native AWS services.

## Table of Contents

1. [Pre-deployment Requirements](#1-pre-deployment-requirements)
2. [Environment Configuration](#2-environment-configuration)
3. [Step-by-Step Deployment Process](#3-step-by-step-deployment-process)
4. [Configuration Management](#4-configuration-management)
5. [Testing & Validation](#5-testing--validation)
6. [Monitoring Setup](#6-monitoring-setup)
7. [Troubleshooting Guide](#7-troubleshooting-guide)
8. [Production Readiness Checklist](#8-production-readiness-checklist)

---

## 1. Pre-deployment Requirements

### AWS Account Setup

#### 1.1 AWS Account Prerequisites

**Required AWS Services Access:**
- AWS Payment Cryptography
- AWS Fraud Detector  
- Amazon DynamoDB
- AWS Lambda
- Amazon Cognito
- AWS Secrets Manager
- Amazon CloudWatch
- AWS SNS/SQS
- Amazon S3
- AWS AppSync

**Account Limits & Quotas:**
```bash
# Check current limits
aws service-quotas list-service-quotas --service-code payment-cryptography
aws service-quotas list-service-quotas --service-code lambda
aws service-quotas list-service-quotas --service-code dynamodb
```

**Request Limit Increases:**
```bash
# Payment Cryptography (if needed)
aws service-quotas request-service-quota-increase \
  --service-code payment-cryptography \
  --quota-code L-1234ABCD \
  --desired-value 100

# Lambda concurrent executions
aws service-quotas request-service-quota-increase \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --desired-value 10000
```

#### 1.2 Required IAM Permissions

**Administrator Setup Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "payment-cryptography:*",
        "frauddetector:*",
        "dynamodb:*",
        "lambda:*",
        "cognito-identity:*",
        "cognito-idp:*",
        "appsync:*",
        "secretsmanager:*",
        "iam:*",
        "cloudformation:*",
        "s3:*",
        "sns:*",
        "sqs:*",
        "cloudwatch:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Deployment User Minimal Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:cloudformation:*:*:stack/amplify-*",
        "arn:aws:iam::*:role/amplify-*"
      ]
    }
  ]
}
```

#### 1.3 AWS CLI Configuration

**Install AWS CLI v2:**
```bash
# macOS
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

**Configure AWS Credentials:**
```bash
# Configure default profile
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]  
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

**Configure Multiple Profiles:**
```bash
# Development profile
aws configure --profile dev
aws configure --profile staging  
aws configure --profile production

# Set environment variable
export AWS_PROFILE=dev
```

#### 1.4 Development Environment Setup

**Install Node.js 20+:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version  # Should be 20.x.x
npm --version   # Should be 10.x.x
```

**Install Amplify CLI:**
```bash
npm install -g @aws-amplify/cli@latest
npx ampx --version
```

**Clone and Setup Repository:**
```bash
git clone <repository-url>
cd ECOSYSTEMAWS
npm install
```

---

## 2. Environment Configuration

### 2.1 Environment Separation Strategy

**Environment Architecture:**
- **Development**: `dev` - Feature development and testing
- **Staging**: `staging` - Pre-production validation  
- **Production**: `prod` - Live customer traffic

**Branch Strategy:**
```
main -> production deployment
staging -> staging deployment  
develop -> development deployment
feature/* -> temporary dev environments
```

### 2.2 Environment-Specific Configuration

#### Development Environment (.env.local)
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=dev

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=https://dev-api.yourapp.com

# Feature Flags (AWS Native Payment Migration)
NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS=true
NEXT_PUBLIC_USE_PAYMENT_CRYPTOGRAPHY=true
NEXT_PUBLIC_ENABLE_FRAUD_DETECTION=true
NEXT_PUBLIC_USE_ACH_TRANSFERS=true

# Legacy Stripe (for comparison testing)
NEXT_PUBLIC_STRIPE_ENABLED=false
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Payment Configuration
NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=8
NEXT_PUBLIC_MIN_CHARGE_AMOUNT=100  # $1.00 in cents
NEXT_PUBLIC_MAX_CHARGE_AMOUNT=500000  # $5,000.00 in cents

# Development-specific
NODE_ENV=development
NEXT_PUBLIC_DEBUG_PAYMENTS=true
NEXT_PUBLIC_MOCK_PAYMENT_CRYPTO=false
```

#### Staging Environment
```bash
# AWS Configuration  
AWS_REGION=us-east-1
AWS_PROFILE=staging

# Application URLs
NEXT_PUBLIC_APP_URL=https://staging.yourapp.com
NEXT_PUBLIC_API_URL=https://staging-api.yourapp.com

# Feature Flags
NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS=true
NEXT_PUBLIC_USE_PAYMENT_CRYPTOGRAPHY=true
NEXT_PUBLIC_ENABLE_FRAUD_DETECTION=true
NEXT_PUBLIC_USE_ACH_TRANSFERS=true

# Staging-specific
NODE_ENV=staging
NEXT_PUBLIC_DEBUG_PAYMENTS=false
NEXT_PUBLIC_MOCK_PAYMENT_CRYPTO=false
```

#### Production Environment
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=production

# Application URLs  
NEXT_PUBLIC_APP_URL=https://yourapp.com
NEXT_PUBLIC_API_URL=https://api.yourapp.com

# Feature Flags (all AWS native)
NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS=true
NEXT_PUBLIC_USE_PAYMENT_CRYPTOGRAPHY=true
NEXT_PUBLIC_ENABLE_FRAUD_DETECTION=true
NEXT_PUBLIC_USE_ACH_TRANSFERS=true
NEXT_PUBLIC_STRIPE_ENABLED=false

# Production-specific
NODE_ENV=production
NEXT_PUBLIC_DEBUG_PAYMENTS=false
NEXT_PUBLIC_MOCK_PAYMENT_CRYPTO=false
```

### 2.3 Secrets Management

#### AWS Secrets Manager Configuration

**Create Payment Cryptography Secrets:**
```bash
# Development
aws secretsmanager create-secret \
  --name "ecosystemaws/dev/payment-crypto" \
  --description "Payment cryptography keys for development" \
  --secret-string '{
    "encryption_key_arn": "arn:aws:payment-cryptography:us-east-1:123456789012:key/key-1234567890abcdef",
    "mac_key_arn": "arn:aws:payment-cryptography:us-east-1:123456789012:key/key-abcdef1234567890",
    "kms_key_id": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }'

# Staging
aws secretsmanager create-secret \
  --name "ecosystemaws/staging/payment-crypto" \
  --description "Payment cryptography keys for staging" \
  --secret-string '{
    "encryption_key_arn": "arn:aws:payment-cryptography:us-east-1:123456789012:key/key-staging123456",
    "mac_key_arn": "arn:aws:payment-cryptography:us-east-1:123456789012:key/key-staging789012",
    "kms_key_id": "arn:aws:kms:us-east-1:123456789012:key/staging-kms-key-id"
  }'

# Production
aws secretsmanager create-secret \
  --name "ecosystemaws/prod/payment-crypto" \
  --description "Payment cryptography keys for production" \
  --secret-string '{
    "encryption_key_arn": "arn:aws:payment-cryptography:us-east-1:123456789012:key/key-prod12345678",
    "mac_key_arn": "arn:aws:payment-cryptography:us-east-1:123456789012:key/key-prod87654321",
    "kms_key_id": "arn:aws:kms:us-east-1:123456789012:key/prod-kms-key-id"
  }'
```

**Create Banking Integration Secrets:**
```bash
# ACH Processing Configuration
aws secretsmanager create-secret \
  --name "ecosystemaws/prod/ach-config" \
  --secret-string '{
    "routing_number": "123456789",
    "account_number": "1234567890",
    "bank_name": "Your Business Bank",
    "nacha_company_id": "1234567890"
  }'

# Fraud Detection Configuration  
aws secretsmanager create-secret \
  --name "ecosystemaws/prod/fraud-config" \
  --secret-string '{
    "fraud_detector_endpoint": "https://frauddetector.us-east-1.amazonaws.com",
    "model_endpoint": "your-fraud-model-endpoint",
    "risk_threshold": 0.75
  }'
```

#### Amplify Secrets Configuration

**Set secrets for Amplify environments:**
```bash
# Development
npx ampx sandbox secret set PAYMENT_CRYPTOGRAPHY_KEY_ARN
npx ampx sandbox secret set FRAUD_DETECTOR_ENDPOINT  
npx ampx sandbox secret set ACH_ROUTING_NUMBER

# Staging
npx ampx secret set PAYMENT_CRYPTOGRAPHY_KEY_ARN --branch staging
npx ampx secret set FRAUD_DETECTOR_ENDPOINT --branch staging
npx ampx secret set ACH_ROUTING_NUMBER --branch staging

# Production
npx ampx secret set PAYMENT_CRYPTOGRAPHY_KEY_ARN --branch main
npx ampx secret set FRAUD_DETECTOR_ENDPOINT --branch main  
npx ampx secret set ACH_ROUTING_NUMBER --branch main
```

---

## 3. Step-by-Step Deployment Process

### 3.1 Initial Infrastructure Setup

#### Step 1: Payment Cryptography Setup
```bash
# Create payment cryptography keys
npm run setup:payment-crypto

# Verify setup
npm run verify:payment-security
```

#### Step 2: Initialize Amplify Environment
```bash
# Initialize for development
npx ampx sandbox

# Wait for deployment to complete (5-10 minutes)
# Watch logs
npx ampx sandbox --watch
```

#### Step 3: Deploy Core Infrastructure
```bash
# Deploy authentication and data layer
npx ampx generate outputs --format ts

# Generate GraphQL client code  
npx ampx generate graphql-client-code --format typescript --out lib/graphql
```

### 3.2 Payment System Deployment

#### Step 1: Deploy AWS Native Payment Functions
```bash
# Deploy payment processing functions
npx ampx pipeline-deploy --branch develop

# Verify deployment
aws lambda list-functions --query 'Functions[?contains(FunctionName, `payment`)]'
```

#### Step 2: Configure Payment Cryptography
```bash
# Setup Payment Cryptography keys
aws payment-cryptography create-key \
  --key-attributes KeyClass=SYMMETRIC_KEY,KeyAlgorithm=AES_256,KeyUsage=ENCRYPT_DECRYPT,KeyModesOfUse='{"Encrypt":true,"Decrypt":true}' \
  --key-check-value-algorithm CMAC

# Import existing keys (if migrating)
aws payment-cryptography import-key \
  --key-material file://path/to/key-material.json
```

#### Step 3: Setup Fraud Detection
```bash
# Create fraud detector
aws frauddetector create-detector \
  --detector-id payment-fraud-detector \
  --detector-version-id 1.0 \
  --description "Real-time payment fraud detection"

# Create fraud model
aws frauddetector create-model-version \
  --model-id payment-fraud-model \
  --model-type ONLINE_FRAUD_INSIGHTS \
  --training-data-source s3://your-training-data-bucket/fraud-training.csv
```

#### Step 4: Configure ACH Processing
```bash
# Setup ACH batch processing
aws events put-rule \
  --name daily-ach-processing \
  --schedule-expression "cron(0 2 * * ? *)" \
  --description "Daily ACH batch processing at 2 AM"

# Add target to the rule
aws events put-targets \
  --rule daily-ach-processing \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:ach-batch-processor"
```

### 3.3 Frontend Deployment

#### Step 1: Build and Test
```bash
# Install dependencies
npm install

# Run type checking
npm run fix:types

# Run tests
npm run test:aws-payment-client
npm run test:payment-processor
npm run test:integration

# Build application
npm run build
```

#### Step 2: Deploy to Amplify Hosting
```bash
# Deploy to staging
git push origin staging

# Deploy to production  
git push origin main

# Or deploy specific branch
npx ampx pipeline-deploy --branch main --app-id <YOUR_APP_ID>
```

### 3.4 Environment-Specific Deployments

#### Development Environment
```bash
# Start sandbox
npx ampx sandbox

# Deploy function updates
npx ampx sandbox --watch

# Test locally
npm run dev
```

#### Staging Environment  
```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# Deploy to staging
npx ampx pipeline-deploy --branch staging

# Run staging tests
PLAYWRIGHT_TEST_BASE_URL=https://staging.yourapp.com npm run test:e2e
```

#### Production Environment
```bash
# Deploy to production
git checkout main
git merge staging
git push origin main

# Monitor deployment
npx ampx pipeline-status --branch main

# Run production smoke tests
npm run test:e2e:smoke
```

---

## 4. Configuration Management

### 4.1 Feature Flag Configuration

**Feature Flag Strategy:**
```typescript
// lib/feature-flags.ts
export const PaymentFeatureFlags = {
  // AWS Native Payment System
  useAWSNativePayments: process.env.NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS === 'true',
  usePaymentCryptography: process.env.NEXT_PUBLIC_USE_PAYMENT_CRYPTOGRAPHY === 'true',  
  enableFraudDetection: process.env.NEXT_PUBLIC_ENABLE_FRAUD_DETECTION === 'true',
  useACHTransfers: process.env.NEXT_PUBLIC_USE_ACH_TRANSFERS === 'true',
  
  // Legacy Stripe (for comparison)
  stripeEnabled: process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true',
  
  // Gradual Migration Flags
  aws_payment_processor: true,  // 100% AWS native
  ach_transfer_manager: true,   // Direct ACH transfers  
  escrow_manager: true,         // Native escrow
  fraud_detector: true,         // AWS Fraud Detector
  cost_monitor: true,           // Cost optimization
  
  // Legacy Stripe Functions (deprecated)
  stripe_connect: false,        // Use AWS native instead
  stripe_payments: false,       // Use Payment Cryptography
  stripe_webhooks: false,       // Use native events
} as const;
```

**Environment-Specific Overrides:**
```bash
# Development - Enable all AWS features
export NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS=true
export NEXT_PUBLIC_USE_PAYMENT_CRYPTOGRAPHY=true
export NEXT_PUBLIC_ENABLE_FRAUD_DETECTION=true  
export NEXT_PUBLIC_USE_ACH_TRANSFERS=true

# Staging - Production simulation
export NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS=true
export NEXT_PUBLIC_STRIPE_ENABLED=false

# Production - 100% AWS Native
export NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS=true
export NEXT_PUBLIC_STRIPE_ENABLED=false
```

### 4.2 Database Configuration

**DynamoDB Tables:**
```bash
# Payment Method table
aws dynamodb create-table \
  --table-name PaymentMethod \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=customerId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=CustomerPaymentMethods,KeySchema=[{AttributeName=customerId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST

# Transaction table
aws dynamodb create-table \
  --table-name Transaction \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=customerId,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=CustomerTransactions,KeySchema=[{AttributeName=customerId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=10,WriteCapacityUnits=10} \
    IndexName=TransactionsByStatus,KeySchema=[{AttributeName=status,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST
```

### 4.3 Monitoring Configuration

**CloudWatch Dashboard Creation:**
```bash
# Create payment monitoring dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "AWS-Native-Payment-System" \
  --dashboard-body file://cloudwatch-dashboard.json
```

**cloudwatch-dashboard.json:**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "aws-payment-processor"],
          ["AWS/Lambda", "Errors", "FunctionName", "aws-payment-processor"],
          ["AWS/Lambda", "Invocations", "FunctionName", "aws-payment-processor"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Payment Processor Performance"
      }
    },
    {
      "type": "metric", 
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "Transaction"],
          ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "Transaction"],
          ["AWS/DynamoDB", "UserErrors", "TableName", "Transaction"],
          ["AWS/DynamoDB", "SystemErrors", "TableName", "Transaction"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1", 
        "title": "Transaction Table Performance"
      }
    }
  ]
}
```

---

## 5. Testing & Validation

### 5.1 Payment Flow Testing

#### Unit Tests
```bash
# Test AWS payment client
npm run test:aws-payment-client

# Test payment processor function  
npm run test:payment-processor

# Test ACH transfer manager
npm run test:ach-manager  

# Test PCI compliance
npm run test:pci-compliance

# Test cost validation
npm run test:cost-validation
```

#### Integration Tests
```bash
# Full payment flow integration test
npm run test:payment-flow

# Performance/load testing  
npm run test:load

# Security testing
npm run test:security
```

#### End-to-End Tests
```bash
# Complete customer payment journey
npm run test:e2e:customer-journey

# AWS native payment flows
npm run test:e2e:aws-payments

# Provider payout testing
npm run test:e2e:provider-payments

# Mobile payment testing
npm run test:e2e:mobile
```

### 5.2 Payment Security Validation

#### PCI Compliance Testing
```bash
# Run PCI compliance validation
npm run verify:payment-security

# Test payment data encryption
npm run test:pci-compliance
```

**Manual Security Checklist:**
- [ ] Payment data never stored in plain text
- [ ] AWS Payment Cryptography keys properly configured
- [ ] IAM roles follow least privilege principle  
- [ ] All payment APIs require authentication
- [ ] Fraud detection rules properly configured
- [ ] Audit logging enabled for all payment operations

#### Fraud Detection Testing
```bash
# Test fraud detection rules
aws frauddetector get-event-prediction \
  --detector-id payment-fraud-detector \
  --detector-version-id 1.0 \
  --event-id test-event-1 \
  --variables email=test@example.com,amount=10000,ip_address=192.168.1.1
```

### 5.3 Performance Testing

#### Load Testing Configuration
```javascript
// tests/performance/payment-load.test.ts
describe('Payment Load Testing', () => {
  test('Handle 1000 concurrent payments', async () => {
    const concurrentPayments = 1000;
    const paymentPromises = Array.from({ length: concurrentPayments }, () =>
      processPayment({
        amount: 10000, // $100.00
        currency: 'USD',
        paymentMethodId: 'test-pm-123'
      })
    );
    
    const results = await Promise.allSettled(paymentPromises);
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    expect(successful.length).toBeGreaterThan(950); // 95% success rate
    expect(failed.length).toBeLessThan(50);
  });
});
```

#### Performance Benchmarks
```bash
# Run performance tests
npm run test:performance

# Expected benchmarks:
# - Payment processing: < 2 seconds average
# - Database writes: < 500ms average  
# - Fraud detection: < 1 second average
# - ACH batch processing: < 5 minutes for 10,000 transactions
```

---

## 6. Monitoring Setup

### 6.1 CloudWatch Alarms

#### Payment Processing Alarms
```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "payment-processor-high-errors" \
  --alarm-description "Payment processor error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:payment-alerts

# High latency alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "payment-processor-high-latency" \
  --alarm-description "Payment processor latency > 5 seconds" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:payment-alerts
```

#### Database Performance Alarms
```bash
# DynamoDB throttling alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "transaction-table-throttling" \
  --alarm-description "Transaction table experiencing throttling" \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:payment-alerts
```

### 6.2 Custom Metrics

#### Business Metrics
```typescript
// amplify/functions/aws-payment-processor/metrics.ts
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });

export const trackPaymentMetrics = async (
  amount: number,
  currency: string,
  processingTime: number,
  success: boolean
) => {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'ECOSYSTEMAWS/Payments',
    MetricData: [
      {
        MetricName: 'PaymentAmount',
        Value: amount,
        Unit: 'Count',
        Dimensions: [{ Name: 'Currency', Value: currency }]
      },
      {
        MetricName: 'PaymentProcessingTime', 
        Value: processingTime,
        Unit: 'Milliseconds'
      },
      {
        MetricName: 'PaymentSuccess',
        Value: success ? 1 : 0,
        Unit: 'Count'
      }
    ]
  }));
};
```

### 6.3 Cost Monitoring

#### Cost Optimization Dashboard
```bash
# Create cost monitoring dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "Payment-Cost-Optimization" \
  --dashboard-body file://cost-dashboard.json
```

**Cost Tracking Script:**
```typescript
// scripts/track-payment-costs.ts
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

const costExplorer = new CostExplorerClient({ region: 'us-east-1' });

const trackPaymentCosts = async () => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: startDate, End: endDate },
    Granularity: 'DAILY',
    Metrics: ['BlendedCost', 'UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: ['Amazon DynamoDB', 'AWS Lambda', 'AWS Payment Cryptography']
      }
    }
  });
  
  const response = await costExplorer.send(command);
  console.log('Payment system costs:', JSON.stringify(response, null, 2));
};
```

---

## 7. Troubleshooting Guide

### 7.1 Common Deployment Issues

#### Issue: Payment Cryptography Key Creation Fails
```bash
# Symptoms
Error: User is not authorized to perform: payment-cryptography:CreateKey

# Solution
# 1. Check IAM permissions
aws iam get-user-policy --user-name <username> --policy-name PaymentCryptographyPolicy

# 2. Add missing permissions
aws iam put-user-policy --user-name <username> --policy-name PaymentCryptographyPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow", 
      "Action": ["payment-cryptography:*"],
      "Resource": "*"
    }]
  }'

# 3. Verify region availability
aws payment-cryptography describe-key --key-identifier <key-id>
```

#### Issue: Amplify Deployment Timeout
```bash
# Symptoms  
Deployment stuck at "Creating resources..." for > 30 minutes

# Solution
# 1. Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name amplify-<app-id>-<branch>

# 2. Check for failed resources
aws cloudformation describe-stack-events --stack-name amplify-<app-id>-<branch>

# 3. Manual cleanup if needed
aws cloudformation delete-stack --stack-name amplify-<app-id>-<branch>

# 4. Redeploy
npx ampx pipeline-deploy --branch <branch-name>
```

#### Issue: Lambda Function Cold Start Performance
```bash
# Symptoms
Payment processing taking > 10 seconds on first request

# Solution  
# 1. Enable provisioned concurrency for critical functions
aws lambda put-provisioned-concurrency-config \
  --function-name aws-payment-processor \
  --qualifier $LATEST \
  --provisioned-concurrency-config ProvisionedConcurrencyConfigs=1

# 2. Optimize function initialization
# Move SDK initialization outside handler
# Use connection pooling for database connections
# Minimize cold start dependencies
```

### 7.2 Payment Processing Issues

#### Issue: Payment Cryptography Decryption Fails
```bash
# Symptoms
Error: Unable to decrypt payment data

# Diagnosis
# 1. Check key ARN configuration
aws secretsmanager get-secret-value --secret-id ecosystemaws/prod/payment-crypto

# 2. Verify key status
aws payment-cryptography describe-key --key-identifier <key-id>

# 3. Test key functionality
aws payment-cryptography encrypt \
  --key-identifier <key-id> \
  --plaintext "test data" \
  --encryption-algorithm AES_256

# Solution
# 1. Ensure key is in ENABLED state
# 2. Verify IAM permissions for Lambda execution role
# 3. Check key usage policies
```

#### Issue: Fraud Detection False Positives
```bash
# Symptoms
Legitimate transactions being flagged as fraudulent

# Diagnosis
# 1. Check fraud detection rules
aws frauddetector get-rules --detector-id payment-fraud-detector

# 2. Review recent predictions
aws frauddetector get-event-prediction \
  --detector-id payment-fraud-detector \
  --event-id <transaction-id>

# Solution
# 1. Adjust risk threshold
aws frauddetector update-detector-version \
  --detector-id payment-fraud-detector \
  --detector-version-id 1.0 \
  --rules '[{"ruleId":"high-risk-rule","ruleVersion":"1","expression":"$model_score > 0.9"}]'

# 2. Retrain model with recent data
aws frauddetector create-model-version \
  --model-id payment-fraud-model \
  --training-data-source s3://updated-training-data/
```

### 7.3 Database Issues

#### Issue: DynamoDB Throttling
```bash
# Symptoms
Error: ProvisionedThroughputExceededException

# Diagnosis
# 1. Check current capacity and usage
aws dynamodb describe-table --table-name Transaction

# 2. Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=Transaction \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Maximum

# Solution
# 1. Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --resource-id table/Transaction \
  --min-capacity 5 \
  --max-capacity 1000

# 2. Or switch to on-demand billing
aws dynamodb modify-table \
  --table-name Transaction \
  --billing-mode PAY_PER_REQUEST
```

---

## 8. Production Readiness Checklist

### 8.1 Security Validation

#### Core Security Requirements
- [ ] **Payment Data Encryption**: All payment data encrypted with AWS Payment Cryptography
- [ ] **Key Management**: Payment cryptography keys properly rotated (quarterly)
- [ ] **Access Control**: IAM roles follow least privilege principle
- [ ] **API Security**: All payment APIs require authentication and authorization
- [ ] **Data Residency**: Payment data stored only in approved AWS regions
- [ ] **Audit Logging**: All payment operations logged to CloudWatch/CloudTrail
- [ ] **Network Security**: Payment functions deployed in private subnets
- [ ] **Secrets Management**: All sensitive configuration in AWS Secrets Manager

#### Security Testing Checklist
```bash
# Run security test suite
npm run test:security

# Validate PCI compliance  
npm run test:pci-compliance

# Check for secrets in code
npm run lint:secrets

# Validate TLS configuration
openssl s_client -connect api.yourapp.com:443 -tls1_2

# Test API authentication
curl -X POST https://api.yourapp.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ processPayment { id } }"}'
# Should return 401 Unauthorized
```

### 8.2 Performance Validation

#### Performance Benchmarks
- [ ] **Payment Processing**: < 2 seconds average response time
- [ ] **Fraud Detection**: < 1 second analysis time
- [ ] **Database Operations**: < 500ms average query time
- [ ] **API Response Time**: < 1 second for 95th percentile
- [ ] **Concurrent Processing**: Handle 1000+ simultaneous payments
- [ ] **Throughput**: Process 10,000+ payments per hour
- [ ] **Availability**: 99.99% uptime SLA

#### Performance Testing
```bash
# Load testing
npm run test:load

# Stress testing  
npm run test:performance

# Monitor during testing
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=aws-payment-processor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

### 8.3 Compliance & Monitoring

#### Compliance Requirements
- [ ] **PCI DSS**: Level 1 compliance for payment card processing
- [ ] **SOX Compliance**: Financial reporting and audit trails  
- [ ] **Data Privacy**: GDPR/CCPA compliance for customer data
- [ ] **Financial Regulations**: AML/KYC compliance for transactions
- [ ] **Audit Logging**: Complete audit trail for all payment operations
- [ ] **Data Retention**: Proper data retention and deletion policies

#### Monitoring & Alerting Setup
- [ ] **Payment Success Rate**: Monitor > 99.5% success rate
- [ ] **Error Rate Monitoring**: Alert on > 1% error rate
- [ ] **Latency Monitoring**: Alert on > 5 second response times
- [ ] **Fraud Detection**: Monitor fraud detection accuracy > 95%
- [ ] **Cost Monitoring**: Track payment processing costs vs Stripe
- [ ] **Security Monitoring**: Monitor for unusual access patterns
- [ ] **Business KPIs**: Revenue, transaction volume, customer growth

### 8.4 Cost Optimization Validation

#### Cost Comparison Analysis
```bash
# Generate cost comparison report
node -e "
const stripeCost = (amount) => amount * 0.029 + 30; // 2.9% + 30¢
const awsCost = (amount) => Math.max(amount * 0.005, 5); // ~0.5%, min 5¢

const monthlyVolume = 1000000; // $10k monthly volume
const avgTransaction = 5000; // $50 average 
const transactions = monthlyVolume / avgTransaction;

const stripeTotal = stripeCost(avgTransaction) * transactions;
const awsTotal = awsCost(avgTransaction) * transactions;
const savings = ((stripeTotal - awsTotal) / stripeTotal) * 100;

console.log(\`Monthly Payment Processing Costs:
Stripe: $\${(stripeTotal/100).toFixed(2)}
AWS Native: $\${(awsTotal/100).toFixed(2)} 
Savings: \${savings.toFixed(1)}% ($\${((stripeTotal-awsTotal)/100).toFixed(2)})\`);
"
```

#### Expected Cost Savings
- **Target**: 90-98% reduction in payment processing fees
- **Stripe Cost**: 2.9% + $0.30 per transaction = $3.20 per $100
- **AWS Native Cost**: ~0.5% + $0.05 per transaction = $0.55 per $100  
- **Savings**: 83% reduction per transaction
- **Annual Savings**: $1M+ for high-volume businesses

### 8.5 Operational Readiness

#### Deployment Pipeline
- [ ] **CI/CD Pipeline**: Automated testing and deployment
- [ ] **Blue/Green Deployment**: Zero-downtime deployments
- [ ] **Rollback Capability**: Quick rollback within 5 minutes
- [ ] **Feature Flags**: Gradual feature rollout capability
- [ ] **Environment Parity**: Dev/staging/prod environment consistency

#### Disaster Recovery
- [ ] **Backup Strategy**: Automated daily backups of all data
- [ ] **Multi-Region Setup**: Active-passive failover capability  
- [ ] **Data Recovery**: RTO < 4 hours, RPO < 1 hour
- [ ] **Incident Response**: 24/7 monitoring and escalation procedures
- [ ] **Business Continuity**: Payment processing continues during AWS outages

#### Documentation & Training
- [ ] **API Documentation**: Complete GraphQL schema documentation
- [ ] **Runbooks**: Operational procedures for common scenarios
- [ ] **Training**: Team trained on AWS native payment system
- [ ] **Support Procedures**: Customer support processes for payment issues
- [ ] **Compliance Documentation**: PCI DSS and regulatory documentation

---

## Final Production Launch Steps

### Phase 1: Soft Launch (1-2 weeks)
1. Deploy to production with 10% traffic
2. Monitor error rates and performance  
3. Validate cost savings vs projections
4. Gather customer feedback

### Phase 2: Gradual Rollout (2-4 weeks)  
1. Increase traffic to 50%
2. Monitor business metrics
3. Fine-tune fraud detection
4. Optimize performance based on real traffic

### Phase 3: Full Migration (1 week)
1. Route 100% traffic to AWS native
2. Disable Stripe integration
3. Remove legacy code and dependencies
4. Celebrate 90%+ cost savings achievement!

### Post-Launch Optimization
1. Monitor cost savings realization
2. Optimize fraud detection rules
3. Fine-tune performance settings
4. Plan additional AWS native features

---

**Support Resources:**
- AWS Payment Cryptography Documentation: https://docs.aws.amazon.com/payment-cryptography/
- AWS Fraud Detector Documentation: https://docs.aws.amazon.com/frauddetector/
- Amplify Gen 2 Documentation: https://docs.amplify.aws/nextjs/
- PCI DSS Compliance Guide: https://aws.amazon.com/compliance/pci-dss-level-1-faqs/

For additional support, contact the AWS native payment system team or create an issue in the repository.