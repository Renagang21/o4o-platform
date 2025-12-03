import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger.js';

/**
 * Custom Application Error Class
 *
 * Use this for throwing errors with specific HTTP status codes.
 *
 * @example
 * ```typescript
 * throw new AppError('User not found', 404);
 * throw new AppError('Invalid credentials', 401);
 * ```
 */
export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown in the application and returns a standardized error response.
 * Must be registered LAST in the middleware chain, after all routes.
 *
 * @example
 * ```typescript
 * // In app.ts or main.ts:
 * app.use(routes);
 * app.use(notFoundHandler);      // 404 handler
 * app.use(globalErrorHandler);   // Error handler (must be last)
 * ```
 */
export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Check if it's our custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || code;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    // Handle validation errors (from class-validator or other validators)
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError') {
    // Handle JWT/auth errors
    statusCode = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.message) {
    // Generic error with a message
    message = error.message;
  }

  // Log error details (but don't expose sensitive info to client)
  logger.error('[GlobalErrorHandler] Error occurred', {
    statusCode,
    code,
    message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    error: error instanceof Error ? error.message : String(error),
  });

  // Send error response
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(details && { details }),
    // Include stack trace in development only
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

/**
 * 404 Not Found Handler
 *
 * Catches requests to undefined routes.
 * Should be registered AFTER all routes but BEFORE the global error handler.
 *
 * @example
 * ```typescript
 * app.use(routes);
 * app.use(notFoundHandler);      // 404 handler
 * app.use(globalErrorHandler);   // Error handler
 * ```
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  logger.warn('[NotFoundHandler] Route not found', {
    path: req.path,
    method: req.method,
  });

  return res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
};

/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to catch promise rejections.
 * Eliminates the need for try-catch in every controller method.
 *
 * @example
 * ```typescript
 * // Without asyncHandler (needs try-catch):
 * static async getUser(req: Request, res: Response) {
 *   try {
 *     const user = await userService.findById(req.params.id);
 *     return res.json({ success: true, data: user });
 *   } catch (error) {
 *     return res.status(500).json({ success: false, error: error.message });
 *   }
 * }
 *
 * // With asyncHandler (no try-catch needed):
 * router.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await userService.findById(req.params.id);
 *   if (!user) throw new AppError('User not found', 404);
 *   return res.json({ success: true, data: user });
 * }));
 * ```
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Common HTTP Error Factories
 *
 * Convenience functions for throwing common HTTP errors.
 */
export const BadRequestError = (message: string, details?: any) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

export const UnauthorizedError = (message: string = 'Unauthorized') =>
  new AppError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Forbidden') =>
  new AppError(message, 403, 'FORBIDDEN');

export const NotFoundError = (resource: string = 'Resource') =>
  new AppError(`${resource} not found`, 404, 'NOT_FOUND');

export const ConflictError = (message: string) =>
  new AppError(message, 409, 'CONFLICT');

export const ValidationError = (message: string, details?: any) =>
  new AppError(message, 400, 'VALIDATION_ERROR', details);

export const InternalServerError = (
  message: string = 'Internal server error'
) => new AppError(message, 500, 'INTERNAL_ERROR');
