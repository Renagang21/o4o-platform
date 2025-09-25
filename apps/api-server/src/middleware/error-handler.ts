/**
 * Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { env } from '../utils/env-validator';
import logger from '../utils/logger';

export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip,
  });

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any;

  // Handle ApiError
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  } 
  // Handle validation errors from express-validator
  else if ((error as any).array && typeof (error as any).array === 'function') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = (error as any).array();
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }
  // Handle TypeORM errors
  else if (error.name === 'EntityNotFoundError') {
    statusCode = 404;
    message = 'Entity not found';
    code = 'ENTITY_NOT_FOUND';
  } else if (error.name === 'QueryFailedError') {
    statusCode = 500;
    message = 'Database query failed';
    code = 'QUERY_FAILED';
    // Only show details in development
    if (env.isDevelopment()) {
      details = error.message;
    }
  }

  // Send response
  const response: any = {
    success: false,
    error: message,
    code,
  };

  // Add details in development mode
  if (env.isDevelopment() && details) {
    response.details = details;
  }

  // Add stack trace in development
  if (env.isDevelopment() && error.stack) {
    response.stack = error.stack.split('\n');
  }

  res.status(statusCode).json(response);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Not found handler
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
  });
}