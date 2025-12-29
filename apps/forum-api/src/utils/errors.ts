/**
 * Error Utilities
 * =============================================================================
 * Standardized error responses for Forum API.
 *
 * Alpha Level Error Handling:
 * - Consistent error response format
 * - User-friendly Korean messages
 * - Error codes for client handling
 * =============================================================================
 */

import { Response } from 'express';
import { ValidationError } from './validation.js';

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  THREAD_NOT_FOUND: 'THREAD_NOT_FOUND',
  REPLY_NOT_FOUND: 'REPLY_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// =============================================================================
// ERROR RESPONSE INTERFACE
// =============================================================================

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationError[] | Record<string, unknown>;
  };
}

// =============================================================================
// ERROR RESPONSE HELPERS
// =============================================================================

/**
 * Send a validation error response
 */
export function sendValidationError(
  res: Response,
  errors: ValidationError[]
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: '입력값이 올바르지 않습니다.',
      details: errors,
    },
  };
  res.status(400).json(response);
}

/**
 * Send an unauthorized error response
 */
export function sendUnauthorizedError(
  res: Response,
  message = '로그인이 필요합니다.'
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.UNAUTHORIZED,
      message,
    },
  };
  res.status(401).json(response);
}

/**
 * Send a forbidden error response
 */
export function sendForbiddenError(
  res: Response,
  message = '권한이 없습니다.'
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.FORBIDDEN,
      message,
    },
  };
  res.status(403).json(response);
}

/**
 * Send a not found error response
 */
export function sendNotFoundError(
  res: Response,
  code: ErrorCode = ErrorCodes.NOT_FOUND,
  message = '요청하신 리소스를 찾을 수 없습니다.'
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  res.status(404).json(response);
}

/**
 * Send an internal server error response
 */
export function sendInternalError(
  res: Response,
  message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message,
    },
  };
  res.status(500).json(response);
}

/**
 * Send a custom error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  res.status(statusCode).json(response);
}
