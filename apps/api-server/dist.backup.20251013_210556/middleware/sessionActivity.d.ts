import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to update session activity on each request
 */
export declare const updateSessionActivity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to validate session on protected routes
 */
export declare const validateSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=sessionActivity.d.ts.map