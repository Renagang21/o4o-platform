import { Request, Response, NextFunction } from 'express';
/**
 * Async handler wrapper for Express route handlers
 * Automatically catches async errors and passes them to the error handler
 */
export declare function asyncHandler<T = any>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Async handler wrapper for Express middleware
 * Automatically catches async errors and passes them to the error handler
 */
export declare function asyncMiddleware(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
export default asyncHandler;
//# sourceMappingURL=asyncHandler.d.ts.map