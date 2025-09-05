/**
 * Platform Constants - Constitutional Single Source of Truth
 * 
 * All platform-wide constants must be defined here.
 * These values are immutable and form the business rules foundation.
 */

// ========== BUSINESS CONSTANTS ==========

/** 
 * Platform commission rate (8% as mandated by Constitution)
 * This is the immutable platform fee rate.
 */
export const PLATFORM_COMMISSION_RATE = 0.08;

/**
 * Platform commission as percentage for display
 */
export const PLATFORM_COMMISSION_PERCENTAGE = PLATFORM_COMMISSION_RATE * 100;

/**
 * Provider earnings rate (92% after platform commission)
 */
export const PROVIDER_EARNINGS_RATE = 1 - PLATFORM_COMMISSION_RATE;

/**
 * Minimum service price in dollars
 */
export const MIN_SERVICE_PRICE = 10.00;

/**
 * Maximum service price in dollars
 */
export const MAX_SERVICE_PRICE = 10000.00;

/**
 * Default booking duration in minutes
 */
export const DEFAULT_BOOKING_DURATION = 60;

/**
 * Maximum advance booking days
 */
export const MAX_ADVANCE_BOOKING_DAYS = 365;

/**
 * Minimum advance booking hours
 */
export const MIN_ADVANCE_BOOKING_HOURS = 2;

// ========== PAYMENT CONSTANTS ==========

/**
 * Stripe minimum charge amount in cents ($0.50)
 */
export const STRIPE_MIN_CHARGE_CENTS = 50;

/**
 * Payment processing timeout in milliseconds (30 seconds)
 */
export const PAYMENT_TIMEOUT_MS = 30000;

/**
 * Refund processing window in days
 */
export const REFUND_WINDOW_DAYS = 30;

/**
 * Automatic payout delay in days (for dispute protection)
 */
export const PAYOUT_DELAY_DAYS = 7;

// ========== RATE LIMITING CONSTANTS ==========

/**
 * API rate limits per endpoint type
 */
export const RATE_LIMITS = {
  // Auth endpoints
  AUTH_LOGIN: { requests: 5, window: 15 * 60 * 1000 }, // 5 per 15 min
  AUTH_REGISTER: { requests: 3, window: 60 * 60 * 1000 }, // 3 per hour
  
  // General API
  API_DEFAULT: { requests: 100, window: 15 * 60 * 1000 }, // 100 per 15 min
  API_SEARCH: { requests: 50, window: 60 * 1000 }, // 50 per minute
  
  // Payment endpoints
  PAYMENT_CREATE: { requests: 10, window: 60 * 1000 }, // 10 per minute
  STRIPE_WEBHOOK: { requests: 200, window: 60 * 1000 }, // 200 per minute
} as const;

// ========== TIME CONSTANTS ==========

/**
 * Time slots configuration
 */
export const TIME_SLOTS = {
  SLOT_DURATION_MINUTES: 30,
  BUSINESS_HOURS_START: 8, // 8 AM
  BUSINESS_HOURS_END: 20,  // 8 PM
  DAYS_IN_ADVANCE: 60,     // 60 days
} as const;

/**
 * Timezone configuration
 */
export const TIMEZONE = {
  DEFAULT: 'America/New_York',
  SUPPORTED: [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
  ],
} as const;

// ========== VALIDATION CONSTANTS ==========

/**
 * Input validation limits
 */
export const VALIDATION_LIMITS = {
  // Text fields
  SERVICE_TITLE_MAX_LENGTH: 100,
  SERVICE_DESCRIPTION_MAX_LENGTH: 2000,
  REVIEW_COMMENT_MAX_LENGTH: 1000,
  
  // Business info
  BUSINESS_NAME_MAX_LENGTH: 100,
  USER_NAME_MAX_LENGTH: 50,
  
  // File uploads
  PROFILE_IMAGE_MAX_SIZE_MB: 5,
  SERVICE_IMAGE_MAX_SIZE_MB: 10,
  MAX_SERVICE_IMAGES: 10,
  
  // Arrays
  MAX_SPECIALIZATIONS: 10,
  MAX_SERVICE_CATEGORIES: 5,
} as const;

/**
 * Supported file types for uploads
 */
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENTS: ['application/pdf'],
} as const;

// ========== SYSTEM CONSTANTS ==========

/**
 * Application configuration
 */
export const APP_CONFIG = {
  NAME: 'Ecosystem Global Solutions',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@ecosystem.com',
  COMPANY_ADDRESS: '1234 Market St, San Francisco, CA 94102',
} as const;

/**
 * Environment detection
 */
export const ENVIRONMENT = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

/**
 * Feature flags for gradual rollouts
 */
export const FEATURES = {
  ENABLE_REVIEWS: true,
  ENABLE_MESSAGING: true,
  ENABLE_VIDEO_CALLS: false,
  ENABLE_SUBSCRIPTIONS: false,
  ENABLE_MULTI_CURRENCY: false,
} as const;

// ========== SECURITY CONSTANTS ==========

/**
 * Security configuration
 */
export const SECURITY = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_REQUIRE_NUMBER: true,
  
  // Session management
  SESSION_TIMEOUT_MINUTES: 30,
  REMEMBER_ME_DAYS: 30,
  
  // Account lockout
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  
  // API keys
  API_KEY_LENGTH: 32,
  WEBHOOK_SECRET_LENGTH: 64,
} as const;

/**
 * CORS configuration
 */
export const CORS_CONFIG = {
  ALLOWED_ORIGINS: ENVIRONMENT.IS_PRODUCTION 
    ? ['https://ecosystem.com', 'https://www.ecosystem.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Correlation-ID',
    'stripe-signature',
  ],
} as const;

// ========== REGEX PATTERNS ==========

/**
 * Common validation patterns
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  POSTAL_CODE: /^\d{5}(-\d{4})?$/,
  BUSINESS_SLUG: /^[a-z0-9-]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// ========== ERROR MESSAGES ==========

/**
 * Standard error messages (user-facing)
 */
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  AUTHENTICATION: 'Please log in to continue.',
  AUTHORIZATION: 'You do not have permission to perform this action.',
  VALIDATION: 'Please check your input and try again.',
  PAYMENT: 'Payment could not be processed. Please try again.',
  SERVICE_UNAVAILABLE: 'This service is temporarily unavailable.',
  BOOKING_CONFLICT: 'This time slot is no longer available.',
} as const;

// Type exports for strict typing
export type RateLimitType = keyof typeof RATE_LIMITS;
export type TimezoneType = typeof TIMEZONE.SUPPORTED[number];
export type AllowedFileType = typeof ALLOWED_FILE_TYPES.IMAGES[number] | typeof ALLOWED_FILE_TYPES.DOCUMENTS[number];