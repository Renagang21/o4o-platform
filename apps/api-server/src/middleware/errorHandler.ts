import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import logger from '../utils/simpleLogger';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(statusCode: number, message: string, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Standard error response interface
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    method?: string;
    stack?: string;
  };
}

// Error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  // Handle known error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || code;
  } else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token has expired';
    code = 'TOKEN_EXPIRED';
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (err instanceof QueryFailedError) {
    statusCode = 400;
    message = 'Database query failed';
    code = 'DATABASE_ERROR';
    
    // Handle specific database errors
    const dbError = err as any;
    if (dbError.code === '23505') {
      message = 'Duplicate entry';
      code = 'DUPLICATE_ENTRY';
    } else if (dbError.code === '23503') {
      message = 'Foreign key constraint violation';
      code = 'FOREIGN_KEY_ERROR';
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'CAST_ERROR';
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Log error with structured logging
  logger.error(`API Error ${statusCode}: ${message}`, {
    code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: err.stack
  });

  // Preserve CORS headers in error responses
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = [
    'https://neture.co.kr',
    'https://www.neture.co.kr',
    'https://admin.neture.co.kr',
    'http://admin.neture.co.kr', // Allow both http and https for admin
    'https://shop.neture.co.kr',
    'https://forum.neture.co.kr',
    'https://signage.neture.co.kr',
    'https://funding.neture.co.kr',
    'https://auth.neture.co.kr',
    'https://api.neture.co.kr',
    'http://api.neture.co.kr', // Allow both http and https for API
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://13.125.144.8:3000',
    'http://13.125.144.8:3001',
    'http://13.125.144.8', // Direct IP access
    'https://13.125.144.8' // Direct IP access (https)
  ];
  
  // Add environment-defined origins
  const envOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
  allowedOrigins.push(...envOrigins);
  
  // Always set CORS headers for allowed origins in error responses
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count');
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Common error creators
export const BadRequestError = (message: string, code?: string) => 
  new ApiError(400, message, code || 'BAD_REQUEST');

export const UnauthorizedError = (message: string = 'Unauthorized', code?: string) => 
  new ApiError(401, message, code || 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Forbidden', code?: string) => 
  new ApiError(403, message, code || 'FORBIDDEN');

export const NotFoundError = (message: string = 'Resource not found', code?: string) => 
  new ApiError(404, message, code || 'NOT_FOUND');

export const ConflictError = (message: string, code?: string) => 
  new ApiError(409, message, code || 'CONFLICT');

export const TooManyRequestsError = (message: string = 'Too many requests', code?: string) => 
  new ApiError(429, message, code || 'RATE_LIMIT_EXCEEDED');

export const InternalServerError = (message: string = 'Internal server error', code?: string) => 
  new ApiError(500, message, code || 'INTERNAL_ERROR');