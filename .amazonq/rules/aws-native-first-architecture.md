# AWS Native-First Architecture Rule

## Purpose
This rule ensures that all new features and services leverage AWS-native capabilities before considering external solutions, maintaining architectural consistency and reducing operational complexity in the Ecosystem Marketplace platform.

## Rule Statement
When implementing any new functionality or service, developers MUST first evaluate and attempt to use AWS-native services through Amplify. External dependencies or third-party services should only be considered when AWS lacks equivalent functionality AND a documented business justification exists.

## Applies To
- All new feature development
- Service integrations
- Infrastructure decisions
- Refactoring initiatives
- Migration tasks

## Implementation Guidelines

### Decision Framework
Before implementing any solution, ask these questions in order:

1. **Does AWS provide a native service for this?**
   - Check AWS service catalog
   - Review Amplify's built-in capabilities
   - Consult AWS documentation

2. **Can existing AWS services be combined to achieve this?**
   - Consider service orchestration with Step Functions
   - Evaluate EventBridge for event routing
   - Explore Lambda compositions

3. **Is there an AWS partner solution in AWS Marketplace?**
   - Review AWS-integrated third-party services
   - Check for AWS-validated solutions

4. **Only if all above are "No": Consider external solutions**
   - Document why AWS alternatives are insufficient
   - Get architectural review approval
   - Plan for future migration when AWS adds capability

### Service Mapping Reference

| If you need... | Use AWS Service | Not External Service |
|----------------|-----------------|---------------------|
| Real-time updates | AppSync Subscriptions | Socket.io |
| Workflow orchestration | Step Functions | Temporal/Airflow |
| Event routing | EventBridge | RabbitMQ/Kafka |
| Search capability | OpenSearch | Elasticsearch/Algolia |
| File storage | S3 via Amplify Storage | Custom file servers |
| Authentication | Cognito | Auth0/Okta |
| Notifications | SNS/Pinpoint | Twilio/SendGrid |
| Queuing | SQS | Redis Queue |
| Caching | ElastiCache/DynamoDB | Redis/Memcached |
| Analytics | QuickSight/Athena | Tableau/Looker |

### Code Review Checklist

When reviewing code, verify:

- [ ] No direct HTTP calls to external services without justification
- [ ] All real-time features use AppSync subscriptions
- [ ] File uploads use Amplify Storage (S3)
- [ ] Authentication uses Cognito tokens
- [ ] Events publish to EventBridge, not external queues
- [ ] Workflows defined in Step Functions, not custom orchestration
- [ ] Search operations use OpenSearch or DynamoDB GSIs
- [ ] Monitoring uses CloudWatch, not external APM tools

### Exception Process

If an external service is absolutely necessary:

1. **Document the gap** - Explain what AWS capability is missing
2. **Create abstraction layer** - Wrap external service in interface for future migration
3. **Set migration trigger** - Define when to revisit (e.g., "When AWS releases X")
4. **Get approval** - Architectural review required before implementation

### Examples

#### ✅ Correct Implementation
```typescript
// Using AppSync subscription for real-time updates
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Real-time booking updates via AWS AppSync
const subscription = client.models.Booking.onUpdate({
  filter: { id: { eq: bookingId } }
}).subscribe({
  next: (data) => updateUI(data)
});