/**
 * O4O Platform — Standardized Error Classes
 *
 * WO-O4O-ERROR-HANDLING-STANDARDIZATION-V1 Phase 1
 *
 * Proper Error subclasses extending the existing AppError from error-handler.middleware.
 * Forward-compatible: existing `throw new Error(msg)` and `throw new AppError(...)` continue to work.
 * New code should use these typed errors for automatic HTTP status mapping.
 *
 * Usage:
 *   throw new NotFoundError('Product');              // 404, code: NOT_FOUND
 *   throw new ValidationError('Invalid email');       // 400, code: VALIDATION_ERROR
 *   throw new ConflictError('Email already exists');  // 409, code: CONFLICT
 *   throw new ForbiddenError('Admin access required');// 403, code: FORBIDDEN
 */

import { AppError } from '../middleware/error-handler.middleware.js';

// Re-export AppError as the base
export { AppError };

// Re-export existing utilities
export {
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
} from '../middleware/error-handler.middleware.js';

// ─── ErrorCode Enum ─────────────────────────────────────────────────────────

/**
 * Centralized error codes for machine-readable error identification.
 * Consolidates API_ERROR_CODES + AUTH_ERROR_CODES from @o4o/types.
 */
export const ErrorCode = {
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Auth (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_USER: 'INVALID_USER',
  USER_INACTIVE: 'USER_INACTIVE',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  NO_REFRESH_TOKEN: 'NO_REFRESH_TOKEN',
  SOCIAL_LOGIN_REQUIRED: 'SOCIAL_LOGIN_REQUIRED',

  // Authorization (403)
  FORBIDDEN: 'FORBIDDEN',
  ROLE_REQUIRED: 'ROLE_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  MEMBERSHIP_NOT_FOUND: 'MEMBERSHIP_NOT_FOUND',
  MEMBERSHIP_NOT_ACTIVE: 'MEMBERSHIP_NOT_ACTIVE',
  SERVICE_TOKEN_NOT_ALLOWED: 'SERVICE_TOKEN_NOT_ALLOWED',
  PLATFORM_TOKEN_NOT_ALLOWED: 'PLATFORM_TOKEN_NOT_ALLOWED',
  GUEST_TOKEN_REQUIRED: 'GUEST_TOKEN_REQUIRED',

  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Not Found (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Conflict (409)
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate Limit (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',

  // External
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── HTTP Error Subclasses ──────────────────────────────────────────────────

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: string = ErrorCode.BAD_REQUEST, details?: any) {
    super(message, 400, code, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 400 Validation Error (specialized BadRequest)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', code: string = ErrorCode.AUTH_REQUIRED) {
    super(message, 401, code);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = ErrorCode.FORBIDDEN, details?: any) {
    super(message, 403, code, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', code: string = ErrorCode.NOT_FOUND) {
    super(`${resource} not found`, 404, code);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, code: string = ErrorCode.CONFLICT, details?: any) {
    super(message, 409, code, details);
    this.name = 'ConflictError';
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, ErrorCode.RATE_LIMITED, retryAfter ? { retryAfter } : undefined);
    this.name = 'RateLimitError';
  }
}
