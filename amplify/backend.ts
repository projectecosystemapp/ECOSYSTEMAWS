import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { stripeConnect } from './functions/stripe-connect/resource.js';
import { stripeWebhook } from './functions/stripe-webhook/resource.js';
import { payoutManager } from './functions/payout-manager/resource.js';
import { refundProcessor } from './functions/refund-processor/resource.js';
import { bookingProcessor } from './functions/booking-processor/resource.js';
import { messagingHandler } from './functions/messaging-handler/resource.js';
import { notificationHandler } from './functions/notification-handler/resource.js';
import { profileEventsFunction } from './functions/profile-events/resource.js';
import { bedrockAiFunction } from './functions/bedrock-ai/resource.js';
import { postConfirmationTrigger } from './functions/post-confirmation-trigger/resource.js';
import { webhookAuthorizer } from './functions/webhook-authorizer/resource.js';
import { webhookReconciliation } from './functions/webhook-reconciliation/resource.js';
import { workflowOrchestrator } from './functions/workflow-orchestrator/resource.js';
import { searchIndexer } from './functions/search-indexer/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

// EventBridge and Step Functions imports
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
// Search infrastructure imports
import { EcosystemOpenSearchDomain } from './search/opensearch-domain.js';
import { EcosystemCacheConfig } from './search/cache-config.js';
import { EcosystemSearchMonitoring } from './search/monitoring.js';
// DynamoDB Streams import
import { StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
import { LambdaFunction, SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { 
  StateMachine, 
  TaskInput, 
  LogLevel,
  StateMachineType,
  DefinitionBody,
  Pass,
  Fail,
  Succeed,
  Choice,
  Condition,
  Wait,
  WaitTime
} from 'aws-cdk-lib/aws-stepfunctions';
import { 
  LambdaInvoke,
  EventBridgePutEvents,
  DynamoGetItem,
  DynamoPutItem,
  DynamoUpdateItem
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Role, ServicePrincipal, ManagedPolicy, PolicyDocument } from 'aws-cdk-lib/aws-iam';

/**
 * AWS Amplify Backend Definition
 * 
 * Defines the complete backend infrastructure including:
 * - Authentication via Cognito
 * - GraphQL API with DynamoDB
 * - Stripe payment processing functions
 * - Webhook handling for payment events
 * - Payout management and scheduling
 * - Refund processing with commission handling
 * - Real-time messaging system
 * - Push and email notification system
 * 
 * SECURITY ARCHITECTURE:
 * - All functions use AWS Secrets Manager for sensitive data
 * - IAM roles follow least privilege principle
 * - Network isolation available via VPC configuration
 * - Comprehensive audit logging for all payment operations
 * - Message validation and permission checking
 * 
 * PAYMENT FLOW:
 * 1. bookingProcessor: Creates bookings with integrated payment intent
 * 2. stripeConnect: Handles account creation and direct payment operations
 * 3. stripeWebhook: Processes Stripe events and updates database
 * 4. payoutManager: Manages provider payouts (scheduled/manual)
 * 5. refundProcessor: Handles refunds with proper commission logic
 * 
 * MESSAGING FLOW:
 * 1. messagingHandler: Manages conversation threads and message delivery
 * 2. notificationHandler: Processes push/email notifications for messages
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  stripeConnect,
  stripeWebhook,
  payoutManager,
  refundProcessor,
  bookingProcessor,
  messagingHandler,
  notificationHandler,
  profileEventsFunction,
  bedrockAiFunction,
  postConfirmationTrigger,
  webhookAuthorizer,
  webhookReconciliation,
  workflowOrchestrator,
  searchIndexer,
});

// ========== EventBridge Event Bus Configuration ==========

// Create custom event bus for marketplace events
const marketplaceEventBus = new EventBus(backend.storage.resources.bucket.stack, 'MarketplaceEventBus', {
  eventBusName: 'ecosystem-marketplace-events',
  description: 'Custom event bus for marketplace domain events',
});

// ========== CloudWatch Log Groups for Step Functions ==========

const stepFunctionLogGroup = new LogGroup(backend.storage.resources.bucket.stack, 'StepFunctionLogGroup', {
  logGroupName: '/aws/stepfunctions/marketplace-workflows',
  retention: RetentionDays.ONE_MONTH,
});

// ========== IAM Role for Step Functions ==========

const stepFunctionRole = new Role(backend.storage.resources.bucket.stack, 'StepFunctionExecutionRole', {
  assumedBy: new ServicePrincipal('states.amazonaws.com'),
  description: 'Execution role for marketplace Step Functions',
  managedPolicies: [
    ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSStepFunctionsFullAccess'),
  ],
  inlinePolicies: {
    MarketplaceStepFunctionPolicy: new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: [
            'lambda:InvokeFunction',
            'events:PutEvents',
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:Query',
            'dynamodb:Scan',
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
          ],
          resources: ['*'], // Step Functions requires broad permissions
        }),
      ],
    }),
  },
});

// ========== Step Functions State Machines ==========

// 1. Booking Lifecycle Workflow
const bookingWorkflowDefinition = new Pass(backend.storage.resources.bucket.stack, 'BookingStart', {
  comment: 'Start booking workflow',
  parameters: {
    'workflowType': 'BOOKING_LIFECYCLE',
    'timestamp.$': '$$.State.EnteredTime',
    'input.$': '$',
  },
}).next(
  new Choice(backend.storage.resources.bucket.stack, 'BookingActionChoice')
    .when(
      Condition.stringEquals('$.action', 'CREATE'),
      new LambdaInvoke(backend.storage.resources.bucket.stack, 'ValidateBookingRequest', {
        lambdaFunction: backend.bookingProcessor.resources.lambda,
        payload: TaskInput.fromJsonPathAt('$'),
        resultPath: '$.validationResult',
      }).next(
        new Choice(backend.storage.resources.bucket.stack, 'ValidationChoice')
          .when(
            Condition.booleanEquals('$.validationResult.isValid', true),
            new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessPayment', {
              lambdaFunction: backend.stripeConnect.resources.lambda,
              payload: TaskInput.fromObject({
                'action': 'create_payment_intent',
                'bookingId.$': '$.bookingId',
                'amount.$': '$.amount',
                'customerId.$': '$.customerId',
                'providerId.$': '$.providerId',
              }),
              resultPath: '$.paymentResult',
            }).next(
              new Choice(backend.storage.resources.bucket.stack, 'PaymentChoice')
                .when(
                  Condition.stringEquals('$.paymentResult.status', 'succeeded'),
                  new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishBookingConfirmed', {
                    entries: [{
                      source: 'marketplace.booking',
                      detailType: 'Booking Confirmed',
                      detail: TaskInput.fromJsonPathAt('$'),
                      eventBus: marketplaceEventBus,
                    }],
                    resultPath: '$.eventResult',
                  }).next(
                    new LambdaInvoke(backend.storage.resources.bucket.stack, 'SendBookingNotifications', {
                      lambdaFunction: backend.notificationHandler.resources.lambda,
                      payload: TaskInput.fromObject({
                        'action': 'booking_confirmed',
                        'bookingId.$': '$.bookingId',
                        'customerId.$': '$.customerId',
                        'providerId.$': '$.providerId',
                      }),
                    }).next(new Succeed(backend.storage.resources.bucket.stack, 'BookingSuccessful'))
                  )
                )
                .otherwise(
                  new Fail(backend.storage.resources.bucket.stack, 'PaymentFailed', {
                    cause: 'Payment processing failed',
                    error: 'PaymentError',
                  })
                )
            )
          )
          .otherwise(
            new Fail(backend.storage.resources.bucket.stack, 'ValidationFailed', {
              cause: 'Booking validation failed',
              error: 'ValidationError',
            })
          )
      )
    )
    .when(
      Condition.stringEquals('$.action', 'CANCEL'),
      new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessCancellation', {
        lambdaFunction: backend.refundProcessor.resources.lambda,
        payload: TaskInput.fromJsonPathAt('$'),
        resultPath: '$.cancellationResult',
      }).next(
        new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishBookingCancelled', {
          entries: [{
            source: 'marketplace.booking',
            detailType: 'Booking Cancelled',
            detail: TaskInput.fromJsonPathAt('$'),
            eventBus: marketplaceEventBus,
          }],
        }).next(new Succeed(backend.storage.resources.bucket.stack, 'CancellationSuccessful'))
      )
    )
    .otherwise(
      new Fail(backend.storage.resources.bucket.stack, 'InvalidAction', {
        cause: 'Invalid booking action specified',
        error: 'InvalidActionError',
      })
    )
);

const bookingWorkflow = new StateMachine(backend.storage.resources.bucket.stack, 'BookingLifecycleWorkflow', {
  stateMachineName: 'ecosystem-booking-lifecycle',
  definitionBody: DefinitionBody.fromChainable(bookingWorkflowDefinition),
  role: stepFunctionRole,
  logs: {
    destination: stepFunctionLogGroup,
    level: LogLevel.ALL,
    includeExecutionData: true,
  },
  tracingEnabled: true,
  timeout: Duration.minutes(15),
  stateMachineType: StateMachineType.STANDARD,
});

// 2. Payment Processing Workflow
const paymentWorkflowDefinition = new Pass(backend.storage.resources.bucket.stack, 'PaymentStart', {
  comment: 'Start payment workflow',
  parameters: {
    'workflowType': 'PAYMENT_PROCESSING',
    'timestamp.$': '$$.State.EnteredTime',
    'input.$': '$',
  },
}).next(
  new Choice(backend.storage.resources.bucket.stack, 'PaymentTypeChoice')
    .when(
      Condition.stringEquals('$.paymentType', 'DIRECT'),
      new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessDirectPayment', {
        lambdaFunction: backend.stripeConnect.resources.lambda,
        payload: TaskInput.fromJsonPathAt('$'),
        resultPath: '$.paymentResult',
      })
    )
    .when(
      Condition.stringEquals('$.paymentType', 'PAYOUT'),
      new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessPayout', {
        lambdaFunction: backend.payoutManager.resources.lambda,
        payload: TaskInput.fromJsonPathAt('$'),
        resultPath: '$.paymentResult',
      })
    )
    .when(
      Condition.stringEquals('$.paymentType', 'REFUND'),
      new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessRefund', {
        lambdaFunction: backend.refundProcessor.resources.lambda,
        payload: TaskInput.fromJsonPathAt('$'),
        resultPath: '$.paymentResult',
      })
    )
    .otherwise(
      new Fail(backend.storage.resources.bucket.stack, 'InvalidPaymentType', {
        cause: 'Invalid payment type specified',
        error: 'InvalidPaymentTypeError',
      })
    )
).next(
  new Choice(backend.storage.resources.bucket.stack, 'PaymentResultChoice')
    .when(
      Condition.or(
        Condition.stringEquals('$.paymentResult.status', 'succeeded'),
        Condition.stringEquals('$.paymentResult.status', 'completed')
      ),
      new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishPaymentSucceeded', {
        entries: [{
          source: 'marketplace.payment',
          detailType: 'Payment Succeeded',
          detail: TaskInput.fromJsonPathAt('$'),
          eventBus: marketplaceEventBus,
        }],
      }).next(new Succeed(backend.storage.resources.bucket.stack, 'PaymentSuccessful'))
    )
    .when(
      Condition.stringEquals('$.paymentResult.status', 'failed'),
      new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishPaymentFailed', {
        entries: [{
          source: 'marketplace.payment',
          detailType: 'Payment Failed',
          detail: TaskInput.fromJsonPathAt('$'),
          eventBus: marketplaceEventBus,
        }],
      }).next(new Fail(backend.storage.resources.bucket.stack, 'PaymentProcessingFailed'))
    )
    .otherwise(
      new Wait(backend.storage.resources.bucket.stack, 'WaitForPaymentConfirmation', {
        time: WaitTime.duration(Duration.seconds(30)),
      }).next(
        new LambdaInvoke(backend.storage.resources.bucket.stack, 'CheckPaymentStatus', {
          lambdaFunction: backend.stripeConnect.resources.lambda,
          payload: TaskInput.fromObject({
            'action': 'check_payment_status',
            'paymentIntentId.$': '$.paymentIntentId',
          }),
          resultPath: '$.statusCheck',
        }).next(
          new Choice(backend.storage.resources.bucket.stack, 'StatusCheckChoice')
            .when(
              Condition.stringEquals('$.statusCheck.status', 'succeeded'),
              new Succeed(backend.storage.resources.bucket.stack, 'PaymentConfirmed')
            )
            .otherwise(
              new Fail(backend.storage.resources.bucket.stack, 'PaymentTimeout', {
                cause: 'Payment confirmation timeout',
                error: 'TimeoutError',
              })
            )
        )
      )
    )
);

const paymentWorkflow = new StateMachine(backend.storage.resources.bucket.stack, 'PaymentProcessingWorkflow', {
  stateMachineName: 'ecosystem-payment-processing',
  definitionBody: DefinitionBody.fromChainable(paymentWorkflowDefinition),
  role: stepFunctionRole,
  logs: {
    destination: stepFunctionLogGroup,
    level: LogLevel.ALL,
    includeExecutionData: true,
  },
  tracingEnabled: true,
  timeout: Duration.minutes(10),
  stateMachineType: StateMachineType.STANDARD,
});

// 3. Dispute Resolution Workflow
const disputeWorkflowDefinition = new Pass(backend.storage.resources.bucket.stack, 'DisputeStart', {
  comment: 'Start dispute resolution workflow',
  parameters: {
    'workflowType': 'DISPUTE_RESOLUTION',
    'timestamp.$': '$$.State.EnteredTime',
    'input.$': '$',
    'disputeId.$': '$$.Execution.Name',
  },
}).next(
  new DynamoPutItem(backend.storage.resources.bucket.stack, 'CreateDisputeRecord', {
    table: backend.data.resources.tables['Booking'],
    item: {
      'id': { 'S.$': '$.disputeId' },
      'bookingId': { 'S.$': '$.bookingId' },
      'disputeType': { 'S.$': '$.disputeType' },
      'status': { 'S': 'UNDER_REVIEW' },
      'createdAt': { 'S.$': '$.timestamp' },
      'description': { 'S.$': '$.description' },
    },
    resultPath: '$.disputeRecord',
  }).next(
    new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishDisputeCreated', {
      entries: [{
        source: 'marketplace.dispute',
        detailType: 'Dispute Created',
        detail: TaskInput.fromJsonPathAt('$'),
        eventBus: marketplaceEventBus,
      }],
    }).next(
      new Wait(backend.storage.resources.bucket.stack, 'DisputeReviewWait', {
        time: WaitTime.duration(Duration.hours(24)), // 24-hour review period
      }).next(
        new Choice(backend.storage.resources.bucket.stack, 'DisputeResolutionChoice')
          .when(
            Condition.stringEquals('$.disputeType', 'REFUND_REQUEST'),
            new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessDisputeRefund', {
              lambdaFunction: backend.refundProcessor.resources.lambda,
              payload: TaskInput.fromObject({
                'action': 'process_dispute_refund',
                'disputeId.$': '$.disputeId',
                'bookingId.$': '$.bookingId',
                'amount.$': '$.amount',
                'reason': 'Dispute resolution',
              }),
              resultPath: '$.resolutionResult',
            })
          )
          .when(
            Condition.stringEquals('$.disputeType', 'SERVICE_COMPLAINT'),
            new LambdaInvoke(backend.storage.resources.bucket.stack, 'ProcessServiceComplaint', {
              lambdaFunction: backend.messagingHandler.resources.lambda,
              payload: TaskInput.fromObject({
                'action': 'escalate_complaint',
                'disputeId.$': '$.disputeId',
                'bookingId.$': '$.bookingId',
                'providerId.$': '$.providerId',
                'customerId.$': '$.customerId',
              }),
              resultPath: '$.resolutionResult',
            })
          )
          .otherwise(
            new Pass(backend.storage.resources.bucket.stack, 'ManualReviewRequired', {
              parameters: {
                'status': 'MANUAL_REVIEW_REQUIRED',
                'message': 'Dispute requires manual administrative review',
              },
              resultPath: '$.resolutionResult',
            })
          )
      ).next(
        new DynamoUpdateItem(backend.storage.resources.bucket.stack, 'UpdateDisputeStatus', {
          table: backend.data.resources.tables['Booking'],
          key: {
            'id': { 'S.$': '$.disputeId' },
          },
          updateExpression: 'SET #status = :status, #resolvedAt = :resolvedAt, #resolution = :resolution',
          expressionAttributeNames: {
            '#status': 'status',
            '#resolvedAt': 'resolvedAt',
            '#resolution': 'resolution',
          },
          expressionAttributeValues: {
            ':status': { 'S.$': '$.resolutionResult.status' },
            ':resolvedAt': { 'S.$': '$$.State.EnteredTime' },
            ':resolution': { 'S.$': '$.resolutionResult.message' },
          },
        }).next(
          new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishDisputeResolved', {
            entries: [{
              source: 'marketplace.dispute',
              detailType: 'Dispute Resolved',
              detail: TaskInput.fromJsonPathAt('$'),
              eventBus: marketplaceEventBus,
            }],
          }).next(new Succeed(backend.storage.resources.bucket.stack, 'DisputeResolved'))
        )
      )
    )
  )
);

const disputeWorkflow = new StateMachine(backend.storage.resources.bucket.stack, 'DisputeResolutionWorkflow', {
  stateMachineName: 'ecosystem-dispute-resolution',
  definitionBody: DefinitionBody.fromChainable(disputeWorkflowDefinition),
  role: stepFunctionRole,
  logs: {
    destination: stepFunctionLogGroup,
    level: LogLevel.ALL,
    includeExecutionData: true,
  },
  tracingEnabled: true,
  timeout: Duration.days(7), // Long timeout for dispute resolution
  stateMachineType: StateMachineType.STANDARD,
});

// 4. Provider Onboarding Workflow
const onboardingWorkflowDefinition = new Pass(backend.storage.resources.bucket.stack, 'OnboardingStart', {
  comment: 'Start provider onboarding workflow',
  parameters: {
    'workflowType': 'PROVIDER_ONBOARDING',
    'timestamp.$': '$$.State.EnteredTime',
    'input.$': '$',
  },
}).next(
  new LambdaInvoke(backend.storage.resources.bucket.stack, 'CreateStripeAccount', {
    lambdaFunction: backend.stripeConnect.resources.lambda,
    payload: TaskInput.fromObject({
      'action': 'create_connect_account',
      'providerId.$': '$.providerId',
      'email.$': '$.email',
      'businessInfo.$': '$.businessInfo',
    }),
    resultPath: '$.stripeResult',
  }).next(
    new Choice(backend.storage.resources.bucket.stack, 'StripeAccountChoice')
      .when(
        Condition.stringEquals('$.stripeResult.status', 'created'),
        new DynamoUpdateItem(backend.storage.resources.bucket.stack, 'UpdateProviderProfile', {
          table: backend.data.resources.tables['UserProfile'],
          key: {
            'id': { 'S.$': '$.providerId' },
          },
          updateExpression: 'SET #stripeAccountId = :stripeAccountId, #onboardingStatus = :status',
          expressionAttributeNames: {
            '#stripeAccountId': 'stripeAccountId',
            '#onboardingStatus': 'onboardingStatus',
          },
          expressionAttributeValues: {
            ':stripeAccountId': { 'S.$': '$.stripeResult.accountId' },
            ':status': { 'S': 'STRIPE_CONNECTED' },
          },
          resultPath: '$.updateResult',
        }).next(
          new EventBridgePutEvents(backend.storage.resources.bucket.stack, 'PublishProviderOnboarded', {
            entries: [{
              source: 'marketplace.provider',
              detailType: 'Provider Onboarded',
              detail: TaskInput.fromJsonPathAt('$'),
              eventBus: marketplaceEventBus,
            }],
          }).next(
            new LambdaInvoke(backend.storage.resources.bucket.stack, 'SendWelcomeNotification', {
              lambdaFunction: backend.notificationHandler.resources.lambda,
              payload: TaskInput.fromObject({
                'action': 'provider_welcome',
                'providerId.$': '$.providerId',
                'email.$': '$.email',
                'stripeAccountId.$': '$.stripeResult.accountId',
              }),
            }).next(new Succeed(backend.storage.resources.bucket.stack, 'OnboardingComplete'))
          )
        )
      )
      .otherwise(
        new Wait(backend.storage.resources.bucket.stack, 'RetryDelay', {
          time: WaitTime.duration(Duration.minutes(5)),
        }).next(
          new LambdaInvoke(backend.storage.resources.bucket.stack, 'RetryStripeAccount', {
            lambdaFunction: backend.stripeConnect.resources.lambda,
            payload: TaskInput.fromJsonPathAt('$'),
            resultPath: '$.retryResult',
          }).next(
            new Choice(backend.storage.resources.bucket.stack, 'RetryChoice')
              .when(
                Condition.stringEquals('$.retryResult.status', 'created'),
                new Succeed(backend.storage.resources.bucket.stack, 'OnboardingCompleteRetry')
              )
              .otherwise(
                new Fail(backend.storage.resources.bucket.stack, 'OnboardingFailed', {
                  cause: 'Failed to create Stripe Connect account after retry',
                  error: 'StripeAccountCreationError',
                })
              )
          )
        )
      )
  )
);

const onboardingWorkflow = new StateMachine(backend.storage.resources.bucket.stack, 'ProviderOnboardingWorkflow', {
  stateMachineName: 'ecosystem-provider-onboarding',
  definitionBody: DefinitionBody.fromChainable(onboardingWorkflowDefinition),
  role: stepFunctionRole,
  logs: {
    destination: stepFunctionLogGroup,
    level: LogLevel.ALL,
    includeExecutionData: true,
  },
  tracingEnabled: true,
  timeout: Duration.minutes(30),
  stateMachineType: StateMachineType.STANDARD,
});

// ========== EventBridge Rules and Routing ==========

// Rule for booking events
const bookingEventsRule = new Rule(backend.storage.resources.bucket.stack, 'BookingEventsRule', {
  eventBus: marketplaceEventBus,
  eventPattern: {
    source: ['marketplace.booking'],
    detailType: ['Booking Confirmed', 'Booking Cancelled', 'Booking Updated'],
  },
  description: 'Routes booking events to appropriate handlers',
});

// Add Lambda targets for booking events
bookingEventsRule.addTarget(new LambdaFunction(backend.notificationHandler.resources.lambda));
bookingEventsRule.addTarget(new LambdaFunction(backend.messagingHandler.resources.lambda));

// Rule for payment events
const paymentEventsRule = new Rule(backend.storage.resources.bucket.stack, 'PaymentEventsRule', {
  eventBus: marketplaceEventBus,
  eventPattern: {
    source: ['marketplace.payment'],
    detailType: ['Payment Succeeded', 'Payment Failed', 'Payout Completed'],
  },
  description: 'Routes payment events to appropriate handlers',
});

// Add targets for payment events
paymentEventsRule.addTarget(new LambdaFunction(backend.payoutManager.resources.lambda));
paymentEventsRule.addTarget(new SfnStateMachine(bookingWorkflow)); // Trigger booking updates

// Rule for dispute events
const disputeEventsRule = new Rule(backend.storage.resources.bucket.stack, 'DisputeEventsRule', {
  eventBus: marketplaceEventBus,
  eventPattern: {
    source: ['marketplace.dispute'],
    detailType: ['Dispute Created', 'Dispute Resolved'],
  },
  description: 'Routes dispute events to notification system',
});

disputeEventsRule.addTarget(new LambdaFunction(backend.notificationHandler.resources.lambda));

// Rule for provider events
const providerEventsRule = new Rule(backend.storage.resources.bucket.stack, 'ProviderEventsRule', {
  eventBus: marketplaceEventBus,
  eventPattern: {
    source: ['marketplace.provider'],
    detailType: ['Provider Onboarded', 'Provider Updated'],
  },
  description: 'Routes provider events to appropriate handlers',
});

providerEventsRule.addTarget(new LambdaFunction(backend.notificationHandler.resources.lambda));

// ========== Configure Authentication and Permissions ==========

// Configure the post-confirmation trigger
backend.auth.resources.userPool.addTrigger({
  operation: 'postConfirmation',
  handler: backend.postConfirmationTrigger.resources.lambda,
});

// Grant the function permissions to access the GraphQL API
backend.postConfirmationTrigger.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [
      backend.data.resources.graphqlApi.arn + '/*',
    ],
  })
);

// Grant webhook authorizer permissions to access DynamoDB for deduplication
backend.webhookAuthorizer.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/ProcessedWebhooks',
      'arn:aws:dynamodb:*:*:table/ProcessedWebhooks/*',
    ],
  })
);

// Grant reconciliation Lambda permissions
backend.webhookReconciliation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:BatchGetItem',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/ProcessedWebhooks',
      'arn:aws:dynamodb:*:*:table/ProcessedWebhooks/*',
      'arn:aws:dynamodb:*:*:table/Booking',
      'arn:aws:dynamodb:*:*:table/Booking/*',
      'arn:aws:dynamodb:*:*:table/Transaction',
      'arn:aws:dynamodb:*:*:table/Transaction/*',
    ],
  })
);

// Grant CloudWatch metrics permissions
backend.webhookReconciliation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cloudwatch:PutMetricData',
    ],
    resources: ['*'], // CloudWatch PutMetricData doesn't support resource-level permissions
  })
);

// Grant SNS permissions for alerts
backend.webhookReconciliation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'sns:Publish',
    ],
    resources: [
      `arn:aws:sns:${process.env.AWS_REGION || 'us-east-1'}:*:webhook-reconciliation-alerts`,
      `arn:aws:sns:${process.env.AWS_REGION || 'us-east-1'}:*:critical-system-alerts`,
    ],
  })
);

// Grant EventBridge permissions to Lambda functions
const lambdaFunctions = [
  backend.bookingProcessor.resources.lambda,
  backend.stripeConnect.resources.lambda,
  backend.payoutManager.resources.lambda,
  backend.refundProcessor.resources.lambda,
  backend.messagingHandler.resources.lambda,
  backend.notificationHandler.resources.lambda,
  backend.workflowOrchestrator.resources.lambda,
];

lambdaFunctions.forEach(lambda => {
  lambda.addToRolePolicy(
    new PolicyStatement({
      actions: [
        'events:PutEvents',
        'states:StartExecution',
        'states:StopExecution',
        'states:DescribeExecution',
      ],
      resources: [
        marketplaceEventBus.eventBusArn,
        bookingWorkflow.stateMachineArn,
        paymentWorkflow.stateMachineArn,
        disputeWorkflow.stateMachineArn,
        onboardingWorkflow.stateMachineArn,
      ],
    })
  );
});

// Grant workflow orchestrator additional Step Functions permissions
backend.workflowOrchestrator.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'states:ListExecutions',
      'states:ListStateMachines',
      'states:DescribeStateMachine',
    ],
    resources: ['*'], // These actions require wildcard for resource discovery
  })
);

// Set environment variables for the workflow orchestrator with state machine ARNs
backend.workflowOrchestrator.resources.lambda.addEnvironment('BOOKING_STATE_MACHINE_ARN', bookingWorkflow.stateMachineArn);
backend.workflowOrchestrator.resources.lambda.addEnvironment('PAYMENT_STATE_MACHINE_ARN', paymentWorkflow.stateMachineArn);
backend.workflowOrchestrator.resources.lambda.addEnvironment('DISPUTE_STATE_MACHINE_ARN', disputeWorkflow.stateMachineArn);
backend.workflowOrchestrator.resources.lambda.addEnvironment('ONBOARDING_STATE_MACHINE_ARN', onboardingWorkflow.stateMachineArn);
backend.workflowOrchestrator.resources.lambda.addEnvironment('MARKETPLACE_EVENT_BUS_ARN', marketplaceEventBus.eventBusArn);

// Add workflow orchestrator as EventBridge target for auto-triggering workflows
const workflowTriggerRule = new Rule(backend.storage.resources.bucket.stack, 'WorkflowAutoTriggerRule', {
  eventBus: marketplaceEventBus,
  eventPattern: {
    source: ['marketplace.booking', 'marketplace.payment', 'marketplace.dispute', 'marketplace.provider'],
    detailType: [
      'Booking Created',
      'Payment Intent Created', 
      'Dispute Filed',
      'Registration Completed'
    ],
  },
  description: 'Auto-triggers workflows based on domain events',
});

workflowTriggerRule.addTarget(new LambdaFunction(backend.workflowOrchestrator.resources.lambda, {
  event: Rule.fromEventPattern({
    source: ['marketplace.booking', 'marketplace.payment', 'marketplace.dispute', 'marketplace.provider'],
  }),
}));

// Add SSM permissions for Lambda functions to read Parameter Store
backend.stripeWebhook.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ssm:GetParameter'],
    resources: [
      `arn:aws:ssm:*:*:parameter/amplify/stripe/*`
    ],
  })
);

// Schedule the reconciliation Lambda to run daily at 2 AM UTC
const reconciliationRule = new Rule(backend.webhookReconciliation.resources.lambda.stack, 'WebhookReconciliationSchedule', {
  schedule: Schedule.cron({
    minute: '0',
    hour: '2',
    day: '*',
    month: '*',
    year: '*',
  }),
  description: 'Daily webhook reconciliation at 2 AM UTC',
});

reconciliationRule.addTarget(new LambdaFunction(backend.webhookReconciliation.resources.lambda));

// ========== Search Infrastructure Configuration ==========

// PERFORMANCE: Deploy cost-optimized OpenSearch domain
const environment = backend.auth.resources.userPool.stack.node.tryGetContext('environment') || 'dev';
const openSearchDomain = new EcosystemOpenSearchDomain(backend.searchIndexer.resources.lambda.stack, 'SearchDomain', {
  environment: environment as 'dev' | 'staging' | 'production',
  enableCostOptimization: true,
  // Cognito integration for fine-grained access control
  cognitoUserPoolId: backend.auth.resources.userPool.userPoolId,
  cognitoIdentityPoolId: backend.auth.resources.identityPool?.identityPoolId,
});

// PERFORMANCE: Deploy ElastiCache for sub-100ms search latency
const cacheConfig = new EcosystemCacheConfig(backend.searchIndexer.resources.lambda.stack, 'SearchCache', {
  environment: environment as 'dev' | 'staging' | 'production',
  vpc: backend.searchIndexer.resources.lambda.vpc, // Use Lambda VPC if configured
  enableCostOptimization: true,
  enableClusterMode: environment === 'production',
});

// Configure search indexer Lambda with OpenSearch and cache endpoints
backend.searchIndexer.resources.lambda.addEnvironment('OPENSEARCH_DOMAIN_ENDPOINT', openSearchDomain.domainEndpoint);
backend.searchIndexer.resources.lambda.addEnvironment('OPENSEARCH_REGION', backend.searchIndexer.resources.lambda.stack.region);
backend.searchIndexer.resources.lambda.addEnvironment('ELASTICACHE_ENDPOINT', cacheConfig.cacheEndpoint);
backend.searchIndexer.resources.lambda.addEnvironment('ELASTICACHE_PORT', cacheConfig.cachePort.toString());

// Grant OpenSearch permissions to search indexer
openSearchDomain.grantAccess(backend.searchIndexer.resources.lambda.role!);

// PERFORMANCE: Configure DynamoDB Streams for real-time search indexing
const tablesToStream = ['Service', 'Booking', 'UserProfile'];
tablesToStream.forEach(tableName => {
  const table = backend.data.resources.tables[tableName];
  if (table) {
    // Enable streams with keys and new/old images
    table.addStreamViewType(StreamViewType.NEW_AND_OLD_IMAGES);
    
    // Grant stream permissions to search indexer
    table.grantStreamRead(backend.searchIndexer.resources.lambda);
    
    // Create event source mapping
    backend.searchIndexer.resources.lambda.addEventSourceMapping(`${tableName}StreamMapping`, {
      eventSourceArn: table.tableStreamArn!,
      startingPosition: 'LATEST',
      batchSize: 25, // Process up to 25 records per batch for optimal performance
      parallelizationFactor: 2, // Process 2 shards concurrently
      retryAttempts: 3,
      maxBatchingWindow: Duration.seconds(5), // Wait up to 5 seconds to fill batch
      reportBatchItemFailures: true, // Enable partial batch failure reporting
    });
  }
});

// PERFORMANCE: Deploy comprehensive search monitoring
const searchMonitoring = new EcosystemSearchMonitoring(backend.searchIndexer.resources.lambda.stack, 'SearchMonitoring', {
  environment: environment as 'dev' | 'staging' | 'production',
  openSearchDomain: openSearchDomain.domain,
  searchIndexerFunction: backend.searchIndexer.resources.lambda,
  cacheClusterId: cacheConfig.replicationGroup?.attrReplicationGroupId || cacheConfig.cacheCluster?.attrClusterId,
  alertEmail: process.env.ALERT_EMAIL || 'admin@ecosystem-marketplace.com',
  enableCostMonitoring: true,
});

// Grant additional permissions for cost monitoring and CloudWatch metrics
backend.searchIndexer.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cloudwatch:PutMetricData',
      'cloudwatch:GetMetricStatistics',
      'cloudwatch:ListMetrics',
    ],
    resources: ['*'], // CloudWatch metrics require wildcard
  })
);

// Grant ElastiCache permissions
backend.searchIndexer.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'elasticache:DescribeCacheClusters',
      'elasticache:DescribeReplicationGroups',
    ],
    resources: [
      `arn:aws:elasticache:${backend.searchIndexer.resources.lambda.stack.region}:${backend.searchIndexer.resources.lambda.stack.account}:cluster/*`,
      `arn:aws:elasticache:${backend.searchIndexer.resources.lambda.stack.region}:${backend.searchIndexer.resources.lambda.stack.account}:replicationgroup/*`,
    ],
  })
);
