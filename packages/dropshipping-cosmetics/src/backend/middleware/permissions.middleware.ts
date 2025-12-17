/**
 * Permissions Middleware for Cosmetics Extension
 *
 * Defines permission checks for cosmetics-specific operations
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Cosmetics extension permissions
 */
export const CosmeticsPermissions = {
  VIEW: 'cosmetics:view',
  EDIT: 'cosmetics:edit',
  MANAGE_FILTERS: 'cosmetics:manage_filters',
  RECOMMEND_ROUTINE: 'cosmetics:recommend_routine',
  SELLER_WORKFLOW: 'cosmetics:seller_workflow',
} as const;

/**
 * Role-based permission mapping
 */
export const RolePermissions = {
  seller: [
    CosmeticsPermissions.VIEW,
    CosmeticsPermissions.SELLER_WORKFLOW,
  ],
  partner: [
    CosmeticsPermissions.VIEW,
    CosmeticsPermissions.RECOMMEND_ROUTINE,
  ],
  admin: [
    CosmeticsPermissions.VIEW,
    CosmeticsPermissions.EDIT,
    CosmeticsPermissions.MANAGE_FILTERS,
    CosmeticsPermissions.RECOMMEND_ROUTINE,
    CosmeticsPermissions.SELLER_WORKFLOW,
  ],
} as const;

/**
 * User interface (extend from your auth system)
 */
interface User {
  id: string;
  role: string;
  permissions?: string[];
}

/**
 * Request with user
 */
export interface AuthenticatedRequest extends Request {
  user?: User | any; // Allow Express.User or our User type
}

/**
 * Check if user has permission
 */
export function hasPermission(user: User | undefined, permission: string): boolean {
  if (!user) return false;

  // Check explicit permissions
  if (user.permissions?.includes(permission)) return true;

  // Check role-based permissions
  const rolePerms = RolePermissions[user.role as keyof typeof RolePermissions];
  if (rolePerms?.includes(permission as any)) return true;

  return false;
}

/**
 * Require permission middleware
 *
 * Usage:
 * ```ts
 * router.put('/filters/:id',
 *   requirePermission(CosmeticsPermissions.MANAGE_FILTERS),
 *   controller.updateFilter
 * );
 * ```
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!hasPermission(user, permission)) {
      res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} required`,
      });
      return;
    }

    next();
  };
}

/**
 * Require any of the permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasAny = permissions.some((perm) => hasPermission(user, perm));

    if (!hasAny) {
      res.status(403).json({
        success: false,
        message: `Permission denied: one of [${permissions.join(', ')}] required`,
      });
      return;
    }

    next();
  };
}

/**
 * Require all permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasAll = permissions.every((perm) => hasPermission(user, perm));

    if (!hasAll) {
      res.status(403).json({
        success: false,
        message: `Permission denied: all of [${permissions.join(', ')}] required`,
      });
      return;
    }

    next();
  };
}

/**
 * Check if user owns the resource
 */
export function requireOwnership(
  resourceUserIdGetter: (req: AuthenticatedRequest) => string | Promise<string>
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    try {
      const resourceUserId = await resourceUserIdGetter(req);

      // Admin can access any resource
      if (user.role === 'admin') {
        next();
        return;
      }

      // Check ownership
      if (user.id !== resourceUserId) {
        res.status(403).json({
          success: false,
          message: 'Permission denied: You can only access your own resources',
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify ownership',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
