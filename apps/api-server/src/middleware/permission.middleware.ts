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

// Extend Express Request interface
declare module 'express' {
  interface Request {
    user?: User;
  }
}

/**
 * Ensure user is authenticated
 * This should be the first middleware in protected routes
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required. Please log in to access this resource.'
    });
  }
  next();
};

/**
 * Check if user has a specific permission
 * @param permission Permission key (e.g., 'users.view', 'content.create')
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Check if user has the required permission
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `You don't have permission to perform this action. Required: ${permission}`,
        required: permission
      });
    }

    next();
  };
};

/**
 * Check if user has ANY of the specified permissions
 * @param permissions Array of permission keys
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Check if user has any of the required permissions
    if (!req.user.hasAnyPermission(permissions)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `You need one of these permissions: ${permissions.join(', ')}`,
        required: permissions
      });
    }

    next();
  };
};

/**
 * Check if user has ALL of the specified permissions
 * @param permissions Array of permission keys
 */
export const requireAllPermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Check if user has all required permissions
    if (!req.user.hasAllPermissions(permissions)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `You need all of these permissions: ${permissions.join(', ')}`,
        required: permissions
      });
    }

    next();
  };
};

/**
 * Check if user has a specific role
 * @param role Role name or UserRole enum value
 */
export const requireRole = (role: UserRole | string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!req.user.hasRole(role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_ROLE',
        message: `This action requires ${role} role`,
        required: role
      });
    }

    next();
  };
};

/**
 * Check if user has ANY of the specified roles
 * @param roles Array of role names
 */
export const requireAnyRole = (roles: (UserRole | string)[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!req.user.hasAnyRole(roles)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_ROLE',
        message: `This action requires one of these roles: ${roles.join(', ')}`,
        required: roles
      });
    }

    next();
  };
};

/**
 * Shorthand for requiring admin role
 * Checks for both ADMIN and SUPER_ADMIN roles
 */
export const requireAdmin = requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

/**
 * Shorthand for requiring super admin role
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Check if user is accessing their own resource
 * @param paramName Parameter name containing user ID (default: 'id')
 */
export const requireSelfOrAdmin = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const targetUserId = req.params[paramName];
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.isAdmin();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'ACCESS_DENIED',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

/**
 * Custom permission check function
 * For complex permission logic that can't be expressed with standard middleware
 *
 * @example
 * customPermissionCheck((user) => {
 *   return user.isAdmin() || user.hasPermission('special.access');
 * })
 */
export const customPermissionCheck = (
  checkFn: (user: User) => boolean,
  errorMessage: string = 'You do not have permission to perform this action'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!checkFn(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'CUSTOM_PERMISSION_DENIED',
        message: errorMessage
      });
    }

    next();
  };
};

/**
 * Optional permission check - allows access but marks in request if user has permission
 * Useful for conditional UI rendering or feature access
 */
export const checkOptionalPermission = (permission: string, markAs: string = 'hasPermission') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      (req as any)[markAs] = req.user.hasPermission(permission);
    } else {
      (req as any)[markAs] = false;
    }
    next();
  };
};
