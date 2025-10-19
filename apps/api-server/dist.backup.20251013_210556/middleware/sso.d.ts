import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
/**
 * Middleware to validate SSO session
 */
export declare const validateSSOSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware for optional SSO session validation
 */
export declare const optionalSSOSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=sso.d.ts.map