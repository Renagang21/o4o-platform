import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper for Express route handlers
 * Automatically catches async errors and passes them to the error handler
 */
export function asyncHandler<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Async handler wrapper for Express middleware
 * Automatically catches async errors and passes them to the error handler
 */
export function asyncMiddleware(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;