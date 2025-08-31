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
defineBackend({
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
});