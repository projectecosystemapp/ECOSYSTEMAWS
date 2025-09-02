// SECURITY FIX: CWE-20 (Improper Input Validation)
// Risk: All API routes lack proper input validation and type safety
// Mitigation: Centralized type definitions and validation schemas
// Validated: TypeScript strict mode enforces type safety at compile time

import { z } from 'zod';

// ========== Base API Types ==========
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextToken?: string;
  total?: number;
}

// ========== Authentication Types ==========
export interface AuthenticatedUser {
  userId: string;
  email: string;
  groups: string[];
  signInDetails?: {
    loginId?: string;
  };
}

// ========== Stripe Connect Types ==========
export const StripeConnectActionSchema = z.enum([
  'CREATE_ACCOUNT',
  'CREATE_ACCOUNT_LINK', 
  'CHECK_ACCOUNT_STATUS',
  'CREATE_PAYMENT_INTENT',
  'CREATE_ESCROW_PAYMENT',
  'RELEASE_ESCROW',
  'PROCESS_REFUND',
  'CREATE_LOGIN_LINK'
]);

export type StripeConnectAction = z.infer<typeof StripeConnectActionSchema>;

export const StripeConnectRequestSchema = z.object({
  action: StripeConnectActionSchema,
  providerId: z.string().optional(),
  accountId: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  connectedAccountId: z.string().optional(),
  customerId: z.string().optional(),
  serviceId: z.string().optional(),
  bookingId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  reason: z.string().optional(),
});

export type StripeConnectRequest = z.infer<typeof StripeConnectRequestSchema>;

export interface PaymentIntentParams {
  amount: number;
  currency?: string;
  connectedAccountId: string;
  customerId: string;
  serviceId: string;
  bookingId: string;
}

export interface EscrowPaymentParams {
  amount: number;
  currency?: string;
  connectedAccountId: string;
  customerId: string;
  serviceId: string;
  bookingId: string;
}

export interface ReleaseEscrowParams {
  paymentIntentId: string;
  connectedAccountId: string;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

// ========== Messaging Types ==========
export const MessageActionSchema = z.enum([
  'SEND_MESSAGE',
  'MARK_MESSAGES_READ',
  'SEARCH_MESSAGES',
  'CREATE_CONVERSATION_THREAD'
]);

export type MessageAction = z.infer<typeof MessageActionSchema>;

export const MessageTypeSchema = z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const SendMessageSchema = z.object({
  action: z.literal('SEND_MESSAGE'),
  data: z.object({
    senderEmail: z.string().email(),
    recipientEmail: z.string().email(),
    content: z.string().min(1).max(2000),
    messageType: MessageTypeSchema.optional(),
    attachments: z.array(z.string()).optional(),
    bookingId: z.string().optional(),
    serviceId: z.string().optional(),
  }),
  userEmail: z.string().email(),
});

export const SearchMessagesSchema = z.object({
  action: z.literal('SEARCH_MESSAGES'),
  data: z.object({
    query: z.string().min(1).max(100),
    conversationId: z.string().optional(),
  }),
  userEmail: z.string().email(),
});

export const MarkMessagesReadSchema = z.object({
  action: z.literal('MARK_MESSAGES_READ'),
  data: z.object({
    conversationId: z.string(),
    userEmail: z.string().email(),
  }),
  userEmail: z.string().email(),
});

export const CreateConversationSchema = z.object({
  action: z.literal('CREATE_CONVERSATION_THREAD'),
  data: z.object({
    participantEmails: z.array(z.string().email()).length(2),
    bookingId: z.string().optional(),
    serviceId: z.string().optional(),
  }),
  userEmail: z.string().email(),
});

export const MessageRequestSchema = z.union([
  SendMessageSchema,
  SearchMessagesSchema,
  MarkMessagesReadSchema,
  CreateConversationSchema,
]);

export type MessageRequest = z.infer<typeof MessageRequestSchema>;

export interface MessageData {
  conversationId: string;
  senderId: string;
  senderEmail: string;
  recipientId: string;
  recipientEmail: string;
  content: string;
  messageType: MessageType;
  attachments?: string[];
  read: boolean;
  createdAt: string;
  bookingId?: string;
  serviceId?: string;
}

// ========== Notification Types ==========
export const NotificationActionSchema = z.enum([
  'MARK_READ',
  'MARK_ALL_READ',
  'CREATE'
]);

export type NotificationAction = z.infer<typeof NotificationActionSchema>;

export const NotificationTypeSchema = z.enum([
  'MESSAGE_RECEIVED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'PAYMENT_RECEIVED',
  'PAYOUT_PROCESSED',
  'SYSTEM_ALERT'
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const CreateNotificationSchema = z.object({
  action: z.literal('CREATE'),
  data: z.object({
    userId: z.string(),
    type: NotificationTypeSchema,
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(500),
    bookingId: z.string().optional(),
    serviceId: z.string().optional(),
    senderId: z.string().optional(),
    actionUrl: z.string().url().optional(),
    actionText: z.string().max(50).optional(),
  }),
});

export const MarkNotificationReadSchema = z.object({
  action: z.literal('MARK_READ'),
  data: z.object({
    notificationId: z.string(),
  }),
});

export const MarkAllNotificationsReadSchema = z.object({
  action: z.literal('MARK_ALL_READ'),
  data: z.object({}),
});

export const NotificationRequestSchema = z.union([
  CreateNotificationSchema,
  MarkNotificationReadSchema,
  MarkAllNotificationsReadSchema,
]);

export type NotificationRequest = z.infer<typeof NotificationRequestSchema>;

// ========== AI Bio Generation Types ==========
export const BioToneSchema = z.enum(['professional', 'friendly', 'creative', 'formal']);
export type BioTone = z.infer<typeof BioToneSchema>;

export const GenerateBioRequestSchema = z.object({
  keywords: z.array(z.string()).min(1).max(10),
  businessName: z.string().min(1).max(100).optional(),
  specializations: z.array(z.string()).max(5).optional(),
  yearsExperience: z.string().max(50).optional(),
  tone: BioToneSchema.optional(),
  providerId: z.string().optional(),
});

export type GenerateBioRequest = z.infer<typeof GenerateBioRequestSchema>;

export interface BioGenerationResponse {
  bio: string;
  generated: boolean;
  fallback?: boolean;
  message?: string;
}

// ========== Geocoding Types ==========
export const GeocodeRequestSchema = z.object({
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  province: z.string().length(2),
  postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
});

export type GeocodeRequest = z.infer<typeof GeocodeRequestSchema>;

export interface GeocodeResponse {
  lat: number;
  lng: number;
  formatted_address: string;
  confidence: number;
}

// ========== Health Check Types ==========
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: number;
  version?: string;
  uptime?: number;
  dependencies?: Record<string, 'ok' | 'error'>;
}

// ========== Error Types ==========
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
  validationErrors?: ValidationError[];
}

// ========== Type Guards ==========
export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && z.string().email().safeParse(email).success;
}

export function isValidUUID(id: unknown): id is string {
  return typeof id === 'string' && z.string().uuid().safeParse(id).success;
}

export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
}

export function isValidCurrency(currency: unknown): currency is string {
  return typeof currency === 'string' && /^[A-Z]{3}$/.test(currency);
}

export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Basic XSS prevention
    .replace(/[\r\n]/g, ' '); // Normalize line breaks
}

export function validateAndSanitizeInput<T>(
  input: unknown, 
  schema: z.ZodSchema<T>
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.errors.map(e => e.message).join(', ')}`);
  }
  return result.data;
}