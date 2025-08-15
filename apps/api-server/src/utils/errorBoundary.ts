import { Request, Response, NextFunction } from 'express';

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error logger
 */
export const logError = (error: Error, context?: string) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    message: error.message,
    stack: error.stack,
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', errorLog);
  } else {
    // In production, could send to monitoring service
    console.error(`[${timestamp}] ${context || 'Unknown'}: ${error.message}`);
  }
};

/**
 * Validation error handler
 */
export const handleValidationError = (errors: any[]) => {
  const formattedErrors = errors.map(err => ({
    field: err.param || err.path,
    message: err.msg || err.message,
  }));
  
  return {
    success: false,
    error: 'Validation failed',
    errors: formattedErrors,
  };
};