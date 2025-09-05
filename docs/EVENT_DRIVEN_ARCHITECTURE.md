# Event-Driven Architecture with EventBridge and Step Functions

## Overview

The Ecosystem Marketplace now implements a comprehensive event-driven architecture using AWS EventBridge for event routing and AWS Step Functions for workflow orchestration. This architecture provides:

- **Loose Coupling**: Services communicate through events, reducing direct dependencies
- **Scalability**: EventBridge handles millions of events with automatic scaling
- **Reliability**: Step Functions provide built-in error handling and retry logic
- **Observability**: Full tracing and logging throughout the event flow
- **Workflow Management**: Complex business processes automated through state machines

## Architecture Components

### 1. EventBridge Custom Event Bus

**Event Bus Name**: `ecosystem-marketplace-events`

**Purpose**: Central hub for all marketplace domain events

**Event Sources**:
- `marketplace.booking` - Booking lifecycle events
- `marketplace.payment` - Payment processing events  
- `marketplace.dispute` - Dispute handling events
- `marketplace.provider` - Provider management events
- `marketplace.workflow` - Workflow execution events

### 2. Step Functions State Machines

#### Booking Lifecycle Workflow
**State Machine**: `ecosystem-booking-lifecycle`
**Timeout**: 15 minutes
**Triggers**: Booking creation, cancellation, updates

**Flow**:
1. Validate booking request
2. Process payment intent
3. Confirm booking
4. Send notifications
5. Handle cancellations with refunds

#### Payment Processing Workflow
**State Machine**: `ecosystem-payment-processing`  
**Timeout**: 10 minutes
**Triggers**: Payment intents, payouts, refunds

**Flow**:
1. Determine payment type (DIRECT/PAYOUT/REFUND)
2. Process through appropriate Lambda function
3. Wait for confirmation if needed
4. Publish success/failure events

#### Dispute Resolution Workflow
**State Machine**: `ecosystem-dispute-resolution`
**Timeout**: 7 days
**Triggers**: Dispute creation, escalation

**Flow**:
1. Create dispute record in DynamoDB
2. 24-hour review period
3. Automated resolution based on type
4. Manual escalation if needed
5. Update dispute status

#### Provider Onboarding Workflow
**State Machine**: `ecosystem-provider-onboarding`
**Timeout**: 30 minutes  
**Triggers**: Provider registration completion

**Flow**:
1. Create Stripe Connect account
2. Update provider profile
3. Send welcome notifications
4. Retry logic for failures

### 3. Event Routing Rules

#### Booking Events Rule
**Triggers**: `marketplace.booking` events
**Targets**: 
- Notification handler Lambda
- Messaging handler Lambda

#### Payment Events Rule  
**Triggers**: `marketplace.payment` events
**Targets**:
- Payout manager Lambda
- Booking workflow state machine

#### Dispute Events Rule
**Triggers**: `marketplace.dispute` events
**Targets**:
- Notification handler Lambda

#### Provider Events Rule
**Triggers**: `marketplace.provider` events  
**Targets**:
- Notification handler Lambda

#### Workflow Auto-Trigger Rule
**Triggers**: Domain events that should start workflows
**Targets**:
- Workflow orchestrator Lambda

## Implementation Details

### GraphQL Schema Integration

The EventBridge and Step Functions are integrated through AppSync custom mutations:

```graphql
# Start a workflow
mutation StartWorkflow {
  startWorkflow(
    workflowType: "BOOKING_LIFECYCLE"
    input: { bookingId: "123", action: "CREATE" }
    executionName: "booking-123-1693737600"
  ) {
    success
    executionArn
    status
  }
}

# Get workflow status
query GetWorkflowStatus {
  getWorkflowStatus(
    executionArn: "arn:aws:states:..."
    workflowType: "BOOKING_LIFECYCLE"
  ) {
    success
    status
    output
  }
}

# Publish custom event
mutation PublishEvent {
  publishEvent(
    source: "marketplace.booking"
    detailType: "Booking Created"
    detail: { bookingId: "123", customerId: "456" }
  ) {
    success
    eventId
  }
}
```

### Frontend Integration

Use the amplify client wrapper for all workflow operations:

```typescript
import { 
  startWorkflow, 
  getWorkflowStatus, 
  stopWorkflow, 
  publishEvent 
} from '@/lib/amplify-client-wrapper';

// Start a booking workflow
const result = await startWorkflow({
  workflowType: 'BOOKING_LIFECYCLE',
  input: {
    action: 'CREATE',
    bookingId: '123',
    customerId: '456',
    amount: 100.00
  },
  executionName: `booking-${bookingId}-${Date.now()}`
});

// Check status
const status = await getWorkflowStatus({
  executionArn: result.data.executionArn,
  workflowType: 'BOOKING_LIFECYCLE'
});

// Publish a custom event
await publishEvent({
  source: 'marketplace.booking',
  detailType: 'Booking Updated',
  detail: {
    bookingId: '123',
    status: 'confirmed',
    timestamp: new Date().toISOString()
  }
});
```

### Lambda Function Integration

Lambda functions can publish events and start workflows:

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

// Publish event
await eventBridgeClient.send(new PutEventsCommand({
  Entries: [{
    Source: 'marketplace.payment',
    DetailType: 'Payment Succeeded',
    Detail: JSON.stringify(paymentData),
    EventBusName: process.env.MARKETPLACE_EVENT_BUS_ARN
  }]
}));

// Start workflow
await sfnClient.send(new StartExecutionCommand({
  stateMachineArn: process.env.DISPUTE_STATE_MACHINE_ARN,
  input: JSON.stringify(disputeData),
  name: `dispute-${disputeId}-${Date.now()}`
}));
```

## Event Schemas

### Booking Events

```typescript
// Booking Created
{
  source: 'marketplace.booking',
  detailType: 'Booking Created',
  detail: {
    bookingId: string,
    serviceId: string,
    customerId: string,
    providerId: string,
    startDateTime: string,
    endDateTime: string,
    amount: number,
    timestamp: string
  }
}

// Booking Confirmed  
{
  source: 'marketplace.booking',
  detailType: 'Booking Confirmed',
  detail: {
    bookingId: string,
    paymentIntentId: string,
    confirmationCode: string,
    timestamp: string
  }
}
```

### Payment Events

```typescript
// Payment Succeeded
{
  source: 'marketplace.payment',
  detailType: 'Payment Succeeded', 
  detail: {
    paymentIntentId: string,
    amount: number,
    platformFee: number,
    providerEarnings: number,
    bookingId: string,
    timestamp: string
  }
}

// Payout Completed
{
  source: 'marketplace.payment',
  detailType: 'Payout Completed',
  detail: {
    payoutId: string,
    providerId: string,
    amount: number,
    currency: string,
    timestamp: string
  }
}
```

### Dispute Events

```typescript
// Dispute Created
{
  source: 'marketplace.dispute',
  detailType: 'Dispute Created',
  detail: {
    disputeId: string,
    bookingId: string,
    disputeType: 'REFUND_REQUEST' | 'SERVICE_COMPLAINT',
    customerId: string,
    providerId: string,
    description: string,
    timestamp: string
  }
}
```

## Monitoring and Observability

### CloudWatch Metrics

**Step Functions Metrics**:
- Execution count by status
- Duration percentiles
- Error rates
- Throttling events

**EventBridge Metrics**:
- Events published
- Rules matched  
- Failed invocations
- Rule processing latency

### Custom Metrics

The workflow orchestrator publishes custom metrics:
- Workflow success/failure rates by type
- Execution duration by workflow
- Retry attempts
- Circuit breaker state changes

### Logging

**Log Groups**:
- `/aws/stepfunctions/marketplace-workflows` - All workflow executions
- `/aws/lambda/workflow-orchestrator` - Orchestrator function logs  
- `/aws/events/marketplace-events` - EventBridge rule logs

**Log Structure**:
```json
{
  "timestamp": "2025-09-02T10:00:00Z",
  "level": "INFO",
  "correlationId": "12345678-1234-1234-1234-123456789012",
  "workflowType": "BOOKING_LIFECYCLE",
  "executionArn": "arn:aws:states:...",
  "status": "RUNNING",
  "duration": 1500,
  "message": "Workflow started successfully"
}
```

## Error Handling and Resilience

### Step Functions Error Handling

- **Retry Configuration**: Exponential backoff with max attempts
- **Catch Blocks**: Graceful degradation for known errors
- **Dead Letter Queues**: Failed executions for manual review
- **Circuit Breakers**: Prevent cascade failures

### EventBridge Resilience

- **Replay Capability**: Failed events can be replayed
- **Dead Letter Queues**: Failed rule invocations captured
- **Archive and Replay**: Historical events for debugging
- **Cross-Region Replication**: Disaster recovery support

## Cost Optimization

### Step Functions

- **Express Workflows**: For high-volume, short-duration processes
- **Standard Workflows**: For long-running, complex processes  
- **Optimize State Transitions**: Minimize unnecessary steps
- **Efficient Input/Output**: Reduce payload sizes

### EventBridge

- **Rule Filtering**: Precise event matching to reduce invocations
- **Batch Processing**: Group related events when possible
- **Archive Policies**: Automatic cleanup of old events
- **Cross-Account Sharing**: Avoid duplicate event buses

## Security Considerations

### IAM Policies

- **Least Privilege**: Functions can only access required resources
- **Cross-Service Permissions**: EventBridge to Lambda, Step Functions to DynamoDB
- **Encryption**: All events encrypted in transit and at rest
- **VPC Isolation**: Optional VPC deployment for sensitive workflows

### Event Validation

- **Schema Validation**: EventBridge schema registry
- **Authentication**: AppSync authorization for GraphQL operations
- **Input Sanitization**: Validate workflow inputs
- **Audit Logging**: All events and executions logged

## Development and Testing

### Local Development

```bash
# Start Amplify sandbox
npx ampx sandbox

# Test workflow operations
npm run test:workflows

# Monitor logs
npx ampx logs --function workflow-orchestrator --follow
```

### End-to-End Testing

```typescript
// Test workflow execution
describe('Booking Workflow', () => {
  it('should complete booking lifecycle', async () => {
    const result = await startWorkflow({
      workflowType: 'BOOKING_LIFECYCLE',
      input: testBookingData
    });
    
    expect(result.success).toBe(true);
    expect(result.data.executionArn).toBeDefined();
    
    // Wait for completion
    await waitForWorkflowCompletion(result.data.executionArn);
    
    // Verify final state
    const status = await getWorkflowStatus({
      executionArn: result.data.executionArn,
      workflowType: 'BOOKING_LIFECYCLE'
    });
    
    expect(status.data.status).toBe('SUCCEEDED');
  });
});
```

## Migration Strategy

### Phase 1: Infrastructure Setup ✅
- EventBridge custom bus created
- Step Functions state machines deployed
- GraphQL schema updated
- Workflow orchestrator function implemented

### Phase 2: Event Integration
- Update existing Lambda functions to publish events
- Configure EventBridge rules and targets
- Test event routing and delivery
- Monitor event processing metrics

### Phase 3: Workflow Adoption  
- Replace direct Lambda calls with workflow executions
- Update frontend to use workflow operations
- Implement error handling and retry logic
- Performance testing and optimization

### Phase 4: Full Migration
- Migrate all business processes to event-driven workflows
- Remove legacy direct integration patterns
- Comprehensive monitoring and alerting
- Documentation and team training

## Best Practices

### Event Design
- **Immutable Events**: Never modify published events
- **Rich Context**: Include all necessary data in event payload
- **Versioning**: Plan for schema evolution
- **Correlation IDs**: Track events across services

### Workflow Design
- **Idempotent**: Workflows can be safely retried
- **Atomic Operations**: Each step should be self-contained
- **Compensation Logic**: Handle partial failures gracefully
- **Timeout Configuration**: Prevent hung executions

### Performance
- **Parallel Execution**: Use parallel states where possible
- **Efficient Polling**: Minimize wait states
- **Resource Optimization**: Right-size Lambda functions
- **Caching**: Store frequently accessed data

This event-driven architecture provides a robust, scalable foundation for the Ecosystem Marketplace, enabling complex business processes while maintaining system reliability and observability.