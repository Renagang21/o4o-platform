/**
 * Authorization Middleware — Role & Permission Guards
 *
 * Extracted from auth.middleware.ts (WO-O4O-AUTH-MIDDLEWARE-SPLIT-V1)
 * Contains: requireAdmin, requireRole, requirePermission, requireAnyPermission
 */
import { Response, NextFunction } from 'express';
import { User } from '../../../modules/auth/entities/User.js';
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';
import { AuthRequest } from './auth-context.helpers.js';
import { requireAuth } from './authentication.middleware.js';

/**
 * Require Admin Role Middleware
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 2
 *
 * Requires the user to be authenticated AND have platform-level admin role.
 * This should be chained after requireAuth or used standalone (it calls requireAuth internally).
 *
 * Only accepts prefixed platform roles:
 * - platform:super_admin
 * - platform:admin
 *
 * Legacy roles (admin, super_admin, operator) are logged and DENIED.
 *
 * Returns 403 if user lacks admin privileges.
 *
 * @example
 * ```typescript
 * router.delete('/users/:id', requireAdmin, AdminController.deleteUser);
 * ```
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // First ensure user is authenticated
  if (!req.user) {
    return requireAuth(req, res, next);
  }

  const user = req.user as User;

  try {
    // WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2: prefixed roles only
    const isAdmin = await roleAssignmentService.hasAnyRole(user.id, [
      'platform:admin',
      'platform:super_admin',
    ]);

    if (!isAdmin) {
      logger.warn('[requireAdmin] Unauthorized admin access attempt', {
        userId: user.id,
        email: user.email,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'FORBIDDEN',
      });
    }

    return next();
  } catch (error) {
    logger.error('[requireAdmin] Error checking admin role', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id,
    });

    return res.status(500).json({
      success: false,
      error: 'Error verifying admin access',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Require Specific Role(s) Middleware
 *
 * Requires the user to have one of the specified roles.
 * Uses P0 role_assignments table via RoleAssignmentService as the sole source of truth.
 *
 * @param roles - Single role string or array of role strings
 *
 * @example
 * ```typescript
 * router.get('/seller/dashboard', requireRole('seller'), SellerController.getDashboard);
 * router.get('/admin/reports', requireRole(['admin', 'operator']), ReportController.getReports);
 * ```
 */
export const requireRole = (roles: string | string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    // First ensure user is authenticated
    if (!req.user) {
      return requireAuth(req, res, next);
    }

    const user = req.user as User;
    const roleList = Array.isArray(roles) ? roles : [roles];

    try {
      // P0 RBAC: Check roles using RoleAssignment service only
      const hasActiveRole = await roleAssignmentService.hasAnyRole(user.id, roleList);

      if (!hasActiveRole) {
        logger.warn('[requireRole] Unauthorized role access attempt', {
          userId: user.id,
          email: user.email,
          requiredRoles: roleList,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error:
            roleList.length === 1
              ? `Active ${roleList[0]} role required`
              : `One of these roles required: ${roleList.join(', ')}`,
          code: 'ROLE_REQUIRED',
          details: {
            requiredRoles: roleList,
          },
        });
      }

      // Get active roles for request context
      const activeRoles = await roleAssignmentService.getActiveRoles(user.id);
      const matchedAssignment = activeRoles.find(a => roleList.includes(a.role));
      if (matchedAssignment) {
        req.roleAssignment = matchedAssignment;
      }

      next();
    } catch (error) {
      logger.error('[requireRole] Error checking role assignment', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        roles: roleList,
      });

      return res.status(500).json({
        success: false,
        error: 'Error verifying role access',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Require Permission Middleware
 *
 * Requires the user to have a specific permission.
 * Uses RoleAssignmentService to check user's roles against permissions.
 *
 * @param permission - Permission key (e.g., 'cms.templates.edit')
 *
 * @example
 * ```typescript
 * router.put('/templates/:id', requirePermission('cms.templates.edit'), TemplateController.update);
 * ```
 */
export const requirePermission = (permission: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    // First ensure user is authenticated
    if (!req.user) {
      return requireAuth(req, res, next);
    }

    const user = req.user as User;

    try {
      // Check direct permissions on user
      if (user.permissions?.includes(permission)) {
        return next();
      }

      // P0 RBAC: Check permissions using RoleAssignment service
      const hasPermission = await roleAssignmentService.hasPermission(user.id, permission);

      if (hasPermission) {
        return next();
      }

      // No permission found
      logger.warn('[requirePermission] Permission denied', {
        userId: user.id,
        email: user.email,
        permission,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: `Permission denied: ${permission}`,
        code: 'PERMISSION_DENIED',
        details: {
          requiredPermission: permission,
        },
      });
    } catch (error) {
      logger.error('[requirePermission] Error checking permission', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        permission,
      });

      return res.status(500).json({
        success: false,
        error: 'Error verifying permission',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Require Any Permission Middleware
 *
 * Requires the user to have at least one of the specified permissions.
 * Uses RoleAssignmentService to check user's roles against permissions.
 *
 * @param permissions - Array of permission keys
 *
 * @example
 * ```typescript
 * router.get('/reports', requireAnyPermission(['analytics.view', 'reports.view']), ReportController.list);
 * ```
 */
export const requireAnyPermission = (permissions: string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    if (!req.user) {
      return requireAuth(req, res, next);
    }

    const user = req.user as User;

    try {
      // Check direct permissions
      for (const permission of permissions) {
        if (user.permissions?.includes(permission)) {
          return next();
        }
      }

      // P0 RBAC: Check permissions using RoleAssignment service
      const hasAnyPermission = await roleAssignmentService.hasAnyPermission(user.id, permissions);

      if (hasAnyPermission) {
        return next();
      }

      // No permission found
      logger.warn('[requireAnyPermission] Permission denied', {
        userId: user.id,
        email: user.email,
        permissions,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        code: 'PERMISSION_DENIED',
        details: {
          requiredPermissions: permissions,
        },
      });
    } catch (error) {
      logger.error('[requireAnyPermission] Error checking permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        permissions,
      });

      return res.status(500).json({
        success: false,
        error: 'Error verifying permissions',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};
