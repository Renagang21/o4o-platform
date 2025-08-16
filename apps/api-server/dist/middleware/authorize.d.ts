import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
/**
 * Authorization middleware to check user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export declare const authorize: (allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has admin role
 */
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has staff role or higher
 */
export declare const requireStaff: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=authorize.d.ts.map