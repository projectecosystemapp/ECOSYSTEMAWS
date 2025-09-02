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
});

// Configure the post-confirmation trigger
backend.auth.resources.userPool.addTrigger({
  operation: 'postConfirmation',
  handler: backend.postConfirmationTrigger.resources.lambda,
});

// Grant the function permissions to access the GraphQL API
backend.postConfirmationTrigger.resources.lambda.addToRolePolicy({
  actions: ['appsync:GraphQL'],
  resources: [
    backend.data.resources.graphqlApi.arn + '/*',
  ],
});

// Grant webhook authorizer permissions to access DynamoDB for deduplication
backend.webhookAuthorizer.resources.lambda.addToRolePolicy({
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
});

// Grant reconciliation Lambda permissions
backend.webhookReconciliation.resources.lambda.addToRolePolicy({
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
});

// Grant CloudWatch metrics permissions
// Note: PutMetricData requires wildcard resource per AWS documentation
// This is the minimum required permission for CloudWatch metrics
backend.webhookReconciliation.resources.lambda.addToRolePolicy({
  actions: [
    'cloudwatch:PutMetricData',
  ],
  resources: ['*'], // CloudWatch PutMetricData doesn't support resource-level permissions
});

// Grant SNS permissions for alerts - scoped to specific topic
backend.webhookReconciliation.resources.lambda.addToRolePolicy({
  actions: [
    'sns:Publish',
  ],
  resources: [
    `arn:aws:sns:${process.env.AWS_REGION || 'us-east-1'}:*:webhook-reconciliation-alerts`,
    `arn:aws:sns:${process.env.AWS_REGION || 'us-east-1'}:*:critical-system-alerts`,
  ],
});

// Schedule the reconciliation Lambda to run daily at 2 AM UTC
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

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