/**
 * Global Error Handler Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
export declare function errorHandler(error: Error | ApiError, req: Request, res: Response, next: NextFunction): void;
export declare function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=error-handler.d.ts.map