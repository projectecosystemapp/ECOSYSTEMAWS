# ECOSYSTEM MARKETPLACE – AWS STACK CONSTITUTION

## 1.0 AWS-Native Tech Stack (Non-Negotiable)

### Frontend & Full-Stack
- **Next.js 14 (App Router)** - deployed on AWS Amplify Hosting
- **TypeScript (Strict Mode)** - all code must be typed
- **Tailwind CSS + ShadCN UI** - design system unchanged
- **Framer Motion** - animations

### Backend & Database
- **AWS Amplify Gen 2** - backend infrastructure as code
- **Amazon DynamoDB** - NoSQL database with single-table design
- **AWS Lambda** - serverless functions for business logic
- **Amazon S3** - file storage for provider assets
- **Amazon Cognito** - authentication and user management

### Payments & Financial
- **Stripe Connect** - payment processing (unchanged)
- **AWS Lambda** - webhook handlers and payment logic
- **DynamoDB** - transaction and booking records

### Caching & Performance
- **Amazon ElastiCache (Redis)** - caching layer
- **Amazon CloudFront** - CDN for global performance
- **AWS Lambda@Edge** - edge computing

### Monitoring & Security
- **Amazon CloudWatch** - logging and monitoring
- **AWS X-Ray** - distributed tracing
- **AWS WAF** - web application firewall
- **AWS Secrets Manager** - secrets management

## 2.0 Architecture Mapping

### Directory Structure (AWS-Optimized)
```
amplify/
  backend.ts              # Amplify Gen 2 backend definition
  auth/                   # Cognito configuration
  data/                   # DynamoDB schema
  functions/              # Lambda functions
  storage/                # S3 bucket configuration

app/                      # Next.js App Router (unchanged)
components/               # UI components (unchanged)
lib/
  aws/                    # AWS SDK clients
  dynamodb/               # DynamoDB utilities
  lambda/                 # Lambda function utilities
  cognito/                # Auth utilities
```

### Core AWS Services Integration

#### Authentication (Amazon Cognito)
```typescript
// lib/aws/cognito.ts
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});
```

#### Database (DynamoDB Single Table)
```typescript
// lib/aws/dynamodb.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);
```

#### Storage (S3)
```typescript
// lib/aws/s3.ts
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION
});
```

## 3.0 Business Model (Unchanged)
- **10% platform commission** on all transactions
- **10% guest surcharge** for non-authenticated users
- **Stripe Connect** for provider payouts
- **Provider receives 90%** of base service price

## 4.0 Data Model (DynamoDB Single Table)

### Primary Table: `EcosystemMarketplace`
```
PK (Partition Key) | SK (Sort Key) | Entity Type | Attributes
USER#123          | PROFILE       | UserProfile | name, email, role, etc.
PROVIDER#456      | METADATA      | Provider    | name, slug, status, etc.
PROVIDER#456      | SERVICE#789   | Service     | title, price, duration, etc.
BOOKING#101       | METADATA      | Booking     | status, amount, dates, etc.
BOOKING#101       | PAYMENT#202   | Payment     | stripeId, amount, status, etc.
```

### GSI Indexes
- **GSI1**: `slug` → `PK` (for provider lookups)
- **GSI2**: `status` → `PK` (for filtering by status)
- **GSI3**: `customerId` → `SK` (for user bookings)

## 5.0 Lambda Functions (Amplify Gen 2)

### Core Functions
```typescript
// amplify/functions/stripe-webhook/handler.ts
export const handler = async (event: APIGatewayProxyEvent) => {
  // Stripe webhook processing
  // Update DynamoDB records
  // Trigger notifications
};

// amplify/functions/booking-processor/handler.ts
export const handler = async (event: DynamoDBStreamEvent) => {
  // Process booking state changes
  // Handle availability updates
  // Send notifications
};

// amplify/functions/search-indexer/handler.ts
export const handler = async (event: DynamoDBStreamEvent) => {
  // Update search indexes
  // Cache invalidation
};
```

## 6.0 Environment Variables (AWS-Specific)

```bash
# AWS Configuration
AWS_REGION=us-east-1
AMPLIFY_APP_ID=your-app-id

# Cognito
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxx

# DynamoDB
DYNAMODB_TABLE_NAME=EcosystemMarketplace-dev

# S3
S3_BUCKET_NAME=ecosystem-assets-dev

# Stripe (unchanged)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ElastiCache
REDIS_CLUSTER_ENDPOINT=your-cluster.cache.amazonaws.com:6379
```

## 7.0 Deployment Pipeline

### Amplify Gen 2 Deployment
```bash
# Deploy backend
npx ampx sandbox  # Development
npx ampx pipeline-deploy --branch main  # Production

# Deploy frontend
# Automatic via Amplify Hosting on git push
```

### CI/CD (AWS CodeBuild)
```yaml
# amplify.yml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

## 8.0 Security (AWS-Native)

### IAM Roles & Policies
- **Lambda Execution Role**: DynamoDB read/write, S3 access, CloudWatch logs
- **Cognito User Pool**: MFA enabled, password policies
- **API Gateway**: Rate limiting, request validation
- **WAF Rules**: SQL injection, XSS protection

### Data Protection
- **DynamoDB**: Encryption at rest enabled
- **S3**: Server-side encryption (SSE-S3)
- **Lambda**: Environment variables encrypted with KMS
- **CloudFront**: HTTPS only, security headers

## 9.0 Monitoring & Observability

### CloudWatch Integration
```typescript
// lib/aws/monitoring.ts
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export const putMetric = async (metricName: string, value: number) => {
  const command = new PutMetricDataCommand({
    Namespace: 'EcosystemMarketplace',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: 'Count'
    }]
  });
  
  await cloudWatchClient.send(command);
};
```

### X-Ray Tracing
```typescript
// Enable in Lambda functions
import AWSXRay from 'aws-xray-sdk-core';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
```

## 10.0 Migration Strategy

### Phase 1: Infrastructure Setup
1. Create Amplify Gen 2 project
2. Configure DynamoDB table with GSIs
3. Set up Cognito User Pool
4. Configure S3 bucket for assets

### Phase 2: Data Migration
1. Export existing data from Supabase
2. Transform to DynamoDB single-table format
3. Import using DynamoDB batch operations
4. Validate data integrity

### Phase 3: Application Updates
1. Replace Supabase client with DynamoDB
2. Update auth to use Cognito
3. Migrate file uploads to S3
4. Update API routes to use Lambda functions

### Phase 4: Testing & Deployment
1. Run full test suite
2. Performance testing with AWS load
3. Security audit with AWS tools
4. Go-live with monitoring

## 11.0 Cost Optimization

### AWS Cost Controls
- **DynamoDB**: On-demand billing for variable workloads
- **Lambda**: Pay per invocation, optimize cold starts
- **S3**: Intelligent tiering for asset storage
- **CloudFront**: Edge caching to reduce origin requests
- **ElastiCache**: Right-size Redis clusters

### Monitoring
- **AWS Cost Explorer**: Track spending by service
- **CloudWatch Billing Alarms**: Alert on budget overruns
- **AWS Trusted Advisor**: Cost optimization recommendations

## 12.0 Compliance (AWS-Enhanced)

### AWS Compliance Features
- **AWS Config**: Configuration compliance monitoring
- **AWS CloudTrail**: API call auditing
- **AWS GuardDuty**: Threat detection
- **AWS Security Hub**: Centralized security findings

### Data Governance
- **DynamoDB Point-in-Time Recovery**: Continuous backups
- **S3 Versioning**: Asset version control
- **KMS**: Customer-managed encryption keys
- **VPC**: Network isolation for sensitive operations

## 13.0 Implementation Priorities

### MVP (AWS Migration)
- ✅ Amplify Gen 2 backend setup
- 🟨 DynamoDB schema design
- ❌ Cognito authentication integration
- ❌ Lambda function development
- ❌ S3 asset migration
- ❌ Stripe webhook Lambda handlers

### Growth Phase
- ❌ ElastiCache Redis integration
- ❌ CloudFront CDN optimization
- ❌ Advanced monitoring dashboards
- ❌ Auto-scaling configurations

### Scale Phase
- ❌ Multi-region deployment
- ❌ Advanced security features
- ❌ Cost optimization automation
- ❌ Enterprise compliance features

---

This AWS-native stack maintains the core Ecosystem Marketplace vision while leveraging AWS services for scalability, security, and cost-effectiveness. The business model, user flows, and design system remain unchanged - only the underlying infrastructure is migrated to AWS.