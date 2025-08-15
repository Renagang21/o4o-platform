import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/auth';
export type { AuthRequest };
/**
 * Middleware to authenticate requests using httpOnly cookies
 */
export declare const authenticateCookie: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware for role-based access control
 */
export declare const requireRole: (roles: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Middleware for optional authentication
 * Adds user to request if valid token exists, but doesn't fail if not
 */
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth-v2.d.ts.map