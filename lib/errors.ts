/**
 * Centralized Error Definitions - Constitutional Requirement
 * 
 * All errors in the system must be defined here for consistency,
 * proper error codes, and structured logging compatibility.
 */

// Base error class for all application errors
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: nullableToString(this.name),
      code: nullableToString(this.code),
      message: nullableToString(this.message),
      statusCode: nullableToString(this.statusCode),
      details: nullableToString(this.details),
      isOperational: nullableToString(this.isOperational),
    };
  }
}

// Authentication & Authorization Errors
export class AuthenticationError extends AppError {
  readonly code = 'AUTH_REQUIRED';
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class AuthorizationError extends AppError {
  readonly code = 'INSUFFICIENT_PERMISSIONS';
  readonly statusCode = 403;
  readonly isOperational = true;
}

export class InvalidCredentialsError extends AppError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;
  readonly isOperational = true;
}

// Validation Errors
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';
  readonly statusCode = 400;
  readonly isOperational = true;
}

export class InvalidInputError extends AppError {
  readonly code = 'INVALID_INPUT';
  readonly statusCode = 400;
  readonly isOperational = true;
}

// Resource Errors
export class NotFoundError extends AppError {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly statusCode = 404;
  readonly isOperational = true;
}

export class ConflictError extends AppError {
  readonly code = 'RESOURCE_CONFLICT';
  readonly statusCode = 409;
  readonly isOperational = true;
}

export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly isOperational = true;
}

// Business Logic Errors
export class BookingUnavailableError extends AppError {
  readonly code = 'BOOKING_UNAVAILABLE';
  readonly statusCode = 409;
  readonly isOperational = true;
}

export class PaymentFailedError extends AppError {
  readonly code = 'PAYMENT_FAILED';
  readonly statusCode = 402;
  readonly isOperational = true;
}

export class InsufficientFundsError extends AppError {
  readonly code = 'INSUFFICIENT_FUNDS';
  readonly statusCode = 402;
  readonly isOperational = true;
}

export class ServiceUnavailableError extends AppError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
  readonly isOperational = true;
}

// Provider-specific Errors
export class ProviderNotVerifiedError extends AppError {
  readonly code = 'PROVIDER_NOT_VERIFIED';
  readonly statusCode = 403;
  readonly isOperational = true;
}

export class StripeAccountRequiredError extends AppError {
  readonly code = 'STRIPE_ACCOUNT_REQUIRED';
  readonly statusCode = 402;
  readonly isOperational = true;
}

// System Errors (Non-operational)
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  readonly isOperational = false;
}

export class ExternalServiceError extends AppError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 502;
  readonly isOperational = false;
}

export class ConfigurationError extends AppError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly statusCode = 500;
  readonly isOperational = false;
}

// Webhook-specific Errors
export class WebhookVerificationError extends AppError {
  readonly code = 'WEBHOOK_VERIFICATION_FAILED';
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class DuplicateWebhookError extends AppError {
  readonly code = 'DUPLICATE_WEBHOOK';
  readonly statusCode = 409;
  readonly isOperational = true;
}

// Error factory function for unknown errors
export function createAppError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new class UnknownError extends AppError {
      readonly code = 'UNKNOWN_ERROR';
      readonly statusCode = 500;
      readonly isOperational = false;
    }(error.message);
  }
  
  return new class UnknownError extends AppError {
    readonly code = 'UNKNOWN_ERROR';
    readonly statusCode = 500;
    readonly isOperational = false;
  }(fallbackMessage);
}

// Error type guards
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

// HTTP status code mappings
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYMENT_REQUIRED: 402,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES];