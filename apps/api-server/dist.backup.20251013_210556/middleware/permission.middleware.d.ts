/**
 * Unified Permission Middleware
 *
 * Centralized permission checking using database-driven role and permission system.
 * This middleware replaces scattered permission checks across the codebase.
 *
 * Features:
 * - Database-driven permissions via User.dbRoles
 * - Fallback to legacy role-based permissions
 * - Support for direct user permissions
 * - Flexible permission checking (single, any, all)
 * - Role-based access control
 */
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../entities/User';
declare module 'express' {
    interface Request {
        user?: User;
    }
}
/**
 * Ensure user is authenticated
 * This should be the first middleware in protected routes
 */
export declare const ensureAuthenticated: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has a specific permission
 * @param permission Permission key (e.g., 'users.view', 'content.create')
 */
export declare const requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has ANY of the specified permissions
 * @param permissions Array of permission keys
 */
export declare const requireAnyPermission: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has ALL of the specified permissions
 * @param permissions Array of permission keys
 */
export declare const requireAllPermissions: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has a specific role
 * @param role Role name or UserRole enum value
 */
export declare const requireRole: (role: UserRole | string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has ANY of the specified roles
 * @param roles Array of role names
 */
export declare const requireAnyRole: (roles: (UserRole | string)[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Shorthand for requiring admin role
 * Checks for both ADMIN and SUPER_ADMIN roles
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Shorthand for requiring super admin role
 */
export declare const requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user is accessing their own resource
 * @param paramName Parameter name containing user ID (default: 'id')
 */
export declare const requireSelfOrAdmin: (paramName?: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Custom permission check function
 * For complex permission logic that can't be expressed with standard middleware
 *
 * @example
 * customPermissionCheck((user) => {
 *   return user.isAdmin() || user.hasPermission('special.access');
 * })
 */
export declare const customPermissionCheck: (checkFn: (user: User) => boolean, errorMessage?: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Optional permission check - allows access but marks in request if user has permission
 * Useful for conditional UI rendering or feature access
 */
export declare const checkOptionalPermission: (permission: string, markAs?: string) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=permission.middleware.d.ts.map