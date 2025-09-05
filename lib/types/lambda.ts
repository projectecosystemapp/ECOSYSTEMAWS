/**
 * Comprehensive Lambda Type Definitions for Marketplace Platform
 * 
 * This file defines all Lambda function types following the AppSync-only architecture mandate.
 * All Lambda functions must be integrated via AppSync custom resolvers - NO Function URLs allowed.
 * 
 * Generated types are based on the existing GraphQL schema and follow AWS best practices.
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

import { 
  BookingStatus, 
  UserProfile, 
  Booking, 
  Service, 
  Transaction, 
  Message, 
  Notification 
} from '../types';

// =============================================================================
// Base AppSync Event Types
// =============================================================================

/**
 * Standard AppSync resolver event handler type
 */
export type AppSyncHandler<TArguments = Record<string, unknown>, TResult = unknown> = (
  event: AppSyncResolverEvent<TArguments>,
  context: Context
) => Promise<TResult>;

/**
 * Base AppSync resolver event with correlation tracking
 */
export interface BaseAppSyncEvent<T = Record<string, unknown>> extends AppSyncResolverEvent<T> {
  identity?: {
    sub?: string;
    username?: string;
    email?: string;
    groups?: string[];
    resolverContext?: {
      correlationId?: string;
      traceId?: string;
      requestId?: string;
    };
  };
}

/**
 * Standard success response wrapper
 */
export interface LambdaSuccessResponse<T = unknown> {
  success: true;
  data: T;
  correlationId?: string;
  duration?: number;
  timestamp?: string;
}

/**
 * Standard error response wrapper
 */
export interface LambdaErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  correlationId?: string;
  duration?: number;
  timestamp?: string;
  details?: Record<string, unknown>;
}

/**
 * Generic Lambda response type
 */
export type LambdaResponse<T = unknown> = LambdaSuccessResponse<T> | LambdaErrorResponse;

// =============================================================================
// Stripe Connect Lambda Types
// =============================================================================

/**
 * Stripe Connect operation types
 */
export type StripeConnectAction = 
  | 'CREATE_ACCOUNT'
  | 'CREATE_ACCOUNT_LINK'
  | 'CHECK_ACCOUNT_STATUS'
  | 'CREATE_PAYMENT_INTENT'
  | 'CREATE_ESCROW_PAYMENT'
  | 'RELEASE_ESCROW'
  | 'PROCESS_REFUND';

export interface StripeConnectEventArgs {
  action: StripeConnectAction;
  providerId?: string;
  paymentIntentId?: string;
  amount?: number;
  connectedAccountId?: string;
  customerId?: string;
  serviceId?: string;
  bookingId?: string;
  currency?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StripeAccountData {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: any;
  capabilities?: any;
  onboardingUrl?: string;
}

export interface StripePaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  platformFee: number;
  escrowEnabled?: boolean;
}

export interface StripeEscrowReleaseData {
  success: boolean;
  transferId: string;
  amountTransferred: number;
  platformFee: number;
}

export interface StripeRefundData {
  refundId: string;
  amount: number;
  status: string;
}

export type StripeConnectResponse = 
  | StripeAccountData
  | StripePaymentIntentData
  | StripeEscrowReleaseData
  | StripeRefundData
  | { url: string };

export type StripeConnectHandler = AppSyncHandler<StripeConnectEventArgs, LambdaResponse<StripeConnectResponse>>;

// =============================================================================
// Stripe Webhook Lambda Types
// =============================================================================

export interface StripeWebhookEventArgs {
  body: string;
  signature: string;
}

export interface StripeWebhookProcessingResult {
  eventId: string;
  eventType: string;
  processed: boolean;
  duration?: number;
  data?: any;
  deduplicated?: boolean;
}

export type StripeWebhookHandler = AppSyncHandler<StripeWebhookEventArgs, LambdaResponse<StripeWebhookProcessingResult>>;

// =============================================================================
// Booking Processor Lambda Types
// =============================================================================

export type BookingAction = 
  | 'CREATE_BOOKING'
  | 'CONFIRM_BOOKING'
  | 'CANCEL_BOOKING'
  | 'COMPLETE_BOOKING'
  | 'UPDATE_BOOKING'
  | 'GET_AVAILABILITY'
  | 'GENERATE_QR_CODE'
  | 'SCAN_QR_CODE';

export interface BookingProcessorEventArgs {
  action: BookingAction;
  bookingId?: string;
  serviceId?: string;
  customerId?: string;
  providerId?: string;
  startDateTime?: string;
  endDateTime?: string;
  groupSize?: number;
  specialRequests?: string;
  customerEmail?: string;
  customerPhone?: string;
  reason?: string;
  qrCode?: string;
  metadata?: Record<string, unknown>;
}

export interface BookingAvailabilityData {
  date: string;
  availableSlots: string[];
  unavailableSlots: string[];
  timeZone: string;
}

export interface BookingQRData {
  qrCode: string;
  qrCodeUrl?: string;
  expiresAt?: string;
}

export interface BookingProcessingResult {
  booking?: Booking;
  availability?: BookingAvailabilityData[];
  qrData?: BookingQRData;
  status?: BookingStatus;
  message?: string;
}

export type BookingProcessorHandler = AppSyncHandler<BookingProcessorEventArgs, LambdaResponse<BookingProcessingResult>>;

// =============================================================================
// Payout Manager Lambda Types
// =============================================================================

export type PayoutAction = 
  | 'CREATE_PAYOUT'
  | 'GET_PAYOUT_STATUS'
  | 'LIST_PAYOUTS'
  | 'CALCULATE_EARNINGS'
  | 'UPDATE_PAYOUT_SCHEDULE';

export interface PayoutManagerEventArgs {
  action: PayoutAction;
  providerId: string;
  payoutId?: string;
  amount?: number;
  currency?: string;
  schedule?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate?: string;
  endDate?: string;
}

export interface PayoutData {
  id: string;
  providerId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'PAID' | 'FAILED' | 'CANCELED';
  arrivalDate?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface EarningsData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  transactions: Transaction[];
}

export interface PayoutManagerResult {
  payout?: PayoutData;
  payouts?: PayoutData[];
  earnings?: EarningsData;
  schedule?: {
    frequency: string;
    nextPayoutDate: string;
  };
}

export type PayoutManagerHandler = AppSyncHandler<PayoutManagerEventArgs, LambdaResponse<PayoutManagerResult>>;

// =============================================================================
// Refund Processor Lambda Types
// =============================================================================

export interface RefundProcessorEventArgs {
  paymentIntentId: string;
  bookingId?: string;
  amount?: number;
  reason?: string;
  refundType?: 'FULL' | 'PARTIAL' | 'COMMISSION_ONLY';
  notifyCustomer?: boolean;
  notifyProvider?: boolean;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  platformFeeRefunded: number;
  providerRefunded: number;
  status: string;
  estimatedArrival?: string;
  receiptUrl?: string;
}

export type RefundProcessorHandler = AppSyncHandler<RefundProcessorEventArgs, LambdaResponse<RefundResult>>;

// =============================================================================
// Messaging Handler Lambda Types
// =============================================================================

export type MessagingAction = 
  | 'SEND_MESSAGE'
  | 'GET_MESSAGES'
  | 'MARK_AS_READ'
  | 'GET_CONVERSATIONS'
  | 'DELETE_MESSAGE'
  | 'EDIT_MESSAGE';

export interface MessagingEventArgs {
  action: MessagingAction;
  senderEmail?: string;
  recipientEmail?: string;
  content?: string;
  messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  bookingId?: string;
  serviceId?: string;
  conversationId?: string;
  messageId?: string;
  query?: string;
  limit?: number;
  nextToken?: string;
}

export interface MessagingResult {
  message?: Message;
  messages?: Message[];
  conversations?: Array<{
    id: string;
    participants: string[];
    lastMessage: Message;
    unreadCount: number;
  }>;
  nextToken?: string;
  conversationId?: string;
}

export type MessagingHandler = AppSyncHandler<MessagingEventArgs, LambdaResponse<MessagingResult>>;

// =============================================================================
// Notification Handler Lambda Types
// =============================================================================

export type NotificationAction = 
  | 'SEND_NOTIFICATION'
  | 'GET_NOTIFICATIONS'
  | 'MARK_AS_READ'
  | 'DELETE_NOTIFICATION'
  | 'GET_UNREAD_COUNT'
  | 'UPDATE_PREFERENCES';

export interface NotificationEventArgs {
  action: NotificationAction;
  userId?: string;
  userEmail?: string;
  type?: string;
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, unknown>;
  notificationId?: string;
  unreadOnly?: boolean;
  preferences?: Record<string, boolean>;
}

export interface NotificationResult {
  notification?: Notification;
  notifications?: Notification[];
  unreadCount?: number;
  preferences?: Record<string, boolean>;
  sent?: boolean;
}

export type NotificationHandler = AppSyncHandler<NotificationEventArgs, LambdaResponse<NotificationResult>>;

// =============================================================================
// Webhook Deduplication Types
// =============================================================================

export interface WebhookEvent {
  id: string;
  type: string;
  signature?: string;
  source: 'stripe' | 'other';
  attempts?: number;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  createdAt?: string;
  processedAt?: string;
}

export interface WebhookDeduplicationResult {
  acquired: boolean;
  existingRecord?: WebhookEvent;
  lockAcquired?: boolean;
  processingResult?: any;
}

// =============================================================================
// Post Confirmation Trigger Types (Cognito)
// =============================================================================

export interface PostConfirmationEvent {
  version: string;
  region: string;
  userPoolId: string;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  triggerSource: 'PostConfirmation_ConfirmSignUp' | 'PostConfirmation_ConfirmForgotPassword';
  request: {
    userAttributes: Record<string, string>;
  };
  response: Record<string, unknown>;
}

export interface PostConfirmationResult {
  userProfile: UserProfile;
  created: boolean;
}

export type PostConfirmationHandler = (
  event: PostConfirmationEvent,
  context: Context
) => Promise<PostConfirmationEvent>;

// =============================================================================
// Webhook Authorizer Types
// =============================================================================

export interface WebhookAuthorizerEvent {
  type: 'REQUEST';
  authorizationToken: string;
  resource: string;
  path: string;
  httpMethod: string;
  headers: Record<string, string>;
  multiValueHeaders: Record<string, string[]>;
  pathParameters: Record<string, string> | null;
  stageVariables: Record<string, string> | null;
  requestContext: {
    path: string;
    accountId: string;
    resourceId: string;
    stage: string;
    requestId: string;
    identity: {
      sourceIp: string;
      userAgent: string;
    };
    httpMethod: string;
    apiId: string;
  };
}

export interface WebhookAuthorizerResult {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: 'Allow' | 'Deny';
      Resource: string;
    }>;
  };
  context?: Record<string, string | number | boolean>;
}

export type WebhookAuthorizerHandler = (
  event: WebhookAuthorizerEvent,
  context: Context
) => Promise<WebhookAuthorizerResult>;

// =============================================================================
// Utility Types and Helpers
// =============================================================================

/**
 * Extract arguments type from AppSync handler
 */
export type ExtractArgs<T> = T extends AppSyncHandler<infer A, any> ? A : never;

/**
 * Extract result type from AppSync handler  
 */
export type ExtractResult<T> = T extends AppSyncHandler<any, infer R> ? R : never;

/**
 * Helper for creating success responses
 */
export function createSuccessResponse<T>(
  data: T, 
  correlationId?: string, 
  duration?: number
): LambdaSuccessResponse<T> {
  return {
    success: true,
    data,
    correlationId,
    duration,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper for creating error responses
 */
export function createErrorResponse(
  error: string, 
  errorCode?: string, 
  correlationId?: string, 
  duration?: number,
  details?: Record<string, unknown>
): LambdaErrorResponse {
  return {
    success: false,
    error,
    errorCode,
    correlationId,
    duration,
    timestamp: new Date().toISOString(),
    details,
  };
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: LambdaResponse<T>
): response is LambdaSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: LambdaResponse
): response is LambdaErrorResponse {
  return response.success === false;
}

/**
 * Correlation ID generator utility
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Performance tracking wrapper for Lambda handlers
 */
export function withPerformanceTracking<TArgs, TResult>(
  handler: AppSyncHandler<TArgs, TResult>
): AppSyncHandler<TArgs, TResult> {
  return async (event, context) => {
    const startTime = Date.now();
    const correlationId = event.identity?.resolverContext?.correlationId || generateCorrelationId();
    
    try {
      const result = await handler(event, context);
      const duration = Date.now() - startTime;
      
      // If result is a LambdaResponse, add performance data
      if (typeof result === 'object' && result !== null && 'success' in result) {
        (result as any).correlationId = correlationId;
        (result as any).duration = duration;
      }
      
      console.log('Lambda execution completed', {
        functionName: nullableToString(context.functionName),
        correlationId,
        duration,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('Lambda execution failed', {
        functionName: nullableToString(context.functionName),
        correlationId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      throw error;
    }
  };
}

/**
 * Environment variable helper with type safety
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Optional environment variable helper
 */
export function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// =============================================================================
// Schema-based Generated Types (matches amplify/data/resource.ts)
// =============================================================================

/**
 * These types are generated based on the existing GraphQL schema
 * and should be kept in sync with amplify/data/resource.ts
 */

export interface ProcessedWebhook {
  eventId: string;
  processedAt?: string;
  result?: any;
  eventType?: string;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  attempts?: number;
  createdAt?: string;
}

/**
 * Type-safe environment configuration
 */
export interface LambdaEnvironment {
  // DynamoDB Tables
  USER_PROFILE_TABLE_NAME: string;
  BOOKING_TABLE_NAME: string;
  SERVICE_TABLE_NAME: string;
  MESSAGE_TABLE_NAME: string;
  TRANSACTION_TABLE_NAME: string;
  WEBHOOK_TABLE_NAME: string;
  
  // Stripe Configuration
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // Application URLs
  APP_URL: string;
  
  // AWS Region
  AWS_REGION: string;
  
  // Feature Flags
  ENABLE_WEBHOOK_DEDUPLICATION?: string;
  ENABLE_CORRELATION_TRACKING?: string;
  ENABLE_PERFORMANCE_METRICS?: string;
}

/**
 * Helper to get typed environment configuration
 */
export function getLambdaEnvironment(): LambdaEnvironment {
  return {
    USER_PROFILE_TABLE_NAME: getRequiredEnvVar('USER_PROFILE_TABLE_NAME'),
    BOOKING_TABLE_NAME: getRequiredEnvVar('BOOKING_TABLE_NAME'),
    SERVICE_TABLE_NAME: getRequiredEnvVar('SERVICE_TABLE_NAME'),
    MESSAGE_TABLE_NAME: getRequiredEnvVar('MESSAGE_TABLE_NAME'),
    TRANSACTION_TABLE_NAME: getRequiredEnvVar('TRANSACTION_TABLE_NAME'),
    WEBHOOK_TABLE_NAME: getRequiredEnvVar('WEBHOOK_TABLE_NAME'),
    STRIPE_SECRET_KEY: getRequiredEnvVar('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: getRequiredEnvVar('STRIPE_WEBHOOK_SECRET'),
    APP_URL: getRequiredEnvVar('APP_URL'),
    AWS_REGION: getRequiredEnvVar('AWS_REGION'),
    ENABLE_WEBHOOK_DEDUPLICATION: getOptionalEnvVar('ENABLE_WEBHOOK_DEDUPLICATION', 'true'),
    ENABLE_CORRELATION_TRACKING: getOptionalEnvVar('ENABLE_CORRELATION_TRACKING', 'true'),
    ENABLE_PERFORMANCE_METRICS: getOptionalEnvVar('ENABLE_PERFORMANCE_METRICS', 'true'),
  };
}