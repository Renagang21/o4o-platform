import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Business Logic
  VENDOR_NOT_ACTIVE = 'VENDOR_NOT_ACTIVE',
  SUPPLIER_NOT_APPROVED = 'SUPPLIER_NOT_APPROVED',
  COMMISSION_ALREADY_PROCESSED = 'COMMISSION_ALREADY_PROCESSED',
  SETTLEMENT_ALREADY_PAID = 'SETTLEMENT_ALREADY_PAID',
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  INVALID_COMMISSION_PERIOD = 'INVALID_COMMISSION_PERIOD',
  
  // External Services
  PAYMENT_SERVICE_ERROR = 'PAYMENT_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  REDIS_CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT'
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators
export const createAuthError = (message: string = 'Authentication required') =>
  new AppError(message, 401, ErrorCode.UNAUTHORIZED);

export const createForbiddenError = (message: string = 'Access denied') =>
  new AppError(message, 403, ErrorCode.FORBIDDEN);

export const createNotFoundError = (resource: string = 'Resource') =>
  new AppError(`${resource} not found`, 404, ErrorCode.RESOURCE_NOT_FOUND);

export const createValidationError = (message: string, details?: any) =>
  new AppError(message, 400, ErrorCode.VALIDATION_ERROR, true, details);

export const createConflictError = (message: string, details?: any) =>
  new AppError(message, 409, ErrorCode.RESOURCE_CONFLICT, true, details);

export const createVendorNotActiveError = () =>
  new AppError('Vendor account is not active', 403, ErrorCode.VENDOR_NOT_ACTIVE);

export const createSupplierNotApprovedError = () =>
  new AppError('Supplier is not approved', 403, ErrorCode.SUPPLIER_NOT_APPROVED);

export const createCommissionAlreadyProcessedError = () =>
  new AppError('Commission already processed for this period', 409, ErrorCode.COMMISSION_ALREADY_PROCESSED);

export const createInsufficientInventoryError = (sku: string, available: number, requested: number) =>
  new AppError(
    `Insufficient inventory for ${sku}`, 
    400, 
    ErrorCode.INSUFFICIENT_INVENTORY,
    true,
    { sku, available, requested }
  );

// Error response interface
interface ErrorResponse {
  success: false;
  errorCode: ErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  stack?: string;
}

// Main error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let error = err as AppError;

  // Convert known errors to AppError
  if (!(err instanceof AppError)) {
    if (err.name === 'ValidationError') {
      error = createValidationError('Validation failed', err.message);
    } else if (err.name === 'CastError') {
      error = createValidationError('Invalid ID format');
    } else if (err.name === 'JsonWebTokenError') {
      error = createAuthError('Invalid token');
    } else if (err.name === 'TokenExpiredError') {
      error = new AppError('Token expired', 401, ErrorCode.TOKEN_EXPIRED);
    } else if (err.message && err.message.includes('duplicate key')) {
      error = createConflictError('Resource already exists');
    } else {
      // Unknown error - create generic internal server error
      error = new AppError(
        'Internal server error',
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        false
      );
    }
  }

  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log error details
  const errorContext = {
    requestId,
    userId: req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    errorCode: error.errorCode,
    statusCode: error.statusCode,
    message: error.message,
    stack: error.stack,
    details: error.details,
    isOperational: error.isOperational
  };

  // Log based on severity
  if (error.statusCode >= 500) {
    logger.error('Server Error', errorContext);
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error', errorContext);
  }

  // Set error message in headers for performance tracking
  res.set('X-Error-Message', error.message);

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    errorCode: error.errorCode,
    message: error.message,
    timestamp: error.timestamp.toISOString(),
    path: req.path,
    method: req.method,
    requestId
  };

  // Add details in development or for operational errors
  if (process.env.NODE_ENV === 'development' || error.isOperational) {
    errorResponse.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(error.statusCode).json(errorResponse);
};

// Async error catcher utility
export const asyncHandler = (fn: any): any => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason.message || reason,
    stack: reason.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

export default errorHandler;