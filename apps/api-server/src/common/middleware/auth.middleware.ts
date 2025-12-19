import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { RoleAssignment } from '../../modules/auth/entities/RoleAssignment.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { verifyAccessToken } from '../../utils/token.utils.js';
import logger from '../../utils/logger.js';

/**
 * Extended Request interface with authenticated user
 */
export interface AuthRequest extends Request {
  user?: User;
  roleAssignment?: RoleAssignment;
}

/**
 * Extract JWT token from Authorization header or httpOnly cookie
 */
function extractToken(req: Request): string | null {
  // Try Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try httpOnly cookie (production)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * Require Authentication Middleware
 *
 * === Phase 2.5: Server Isolation & Unified Error Handling ===
 * Uses token.utils.verifyAccessToken which includes:
 * - JWT signature verification
 * - Issuer/Audience validation (server isolation)
 * - Expiration check
 *
 * Returns 401 if:
 * - No token provided (AUTH_REQUIRED)
 * - Token is invalid, expired, or from different server (INVALID_TOKEN)
 * - User not found in database (INVALID_USER)
 * - User account is inactive (USER_INACTIVE)
 *
 * @example
 * ```typescript
 * router.get('/profile', requireAuth, UserController.getProfile);
 * ```
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Phase 2.5: Use token.utils for verification (includes issuer/audience check)
    const payload = verifyAccessToken(token);

    if (!payload) {
      // Token is invalid, expired, or from a different server
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user from database
    // Note: dbRoles relation is deprecated - use RoleAssignment for RBAC
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.userId },
      relations: ['linkedAccounts'],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or has been deactivated',
        code: 'INVALID_USER',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('[requireAuth] Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(401).json({
      success: false,
      error: 'Access token is invalid or has expired',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Require Admin Role Middleware
 *
 * Requires the user to be authenticated AND have admin/operator role.
 * This should be chained after requireAuth or used standalone (it calls requireAuth internally).
 * Uses RoleAssignment table (P0 RBAC) for role checking.
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
    // P0 RBAC: Check roles using RoleAssignment service
    const isAdmin = await roleAssignmentService.hasAnyRole(user.id, [
      'admin',
      'super_admin',
      'operator'
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

    next();
  } catch (error) {
    logger.error('[requireAdmin] Error checking admin role', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id
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
 * Optional Authentication Middleware
 *
 * === Phase 2.5: Server Isolation ===
 * Uses token.utils.verifyAccessToken for consistent token validation.
 * Tokens from different servers will be silently rejected.
 *
 * Attempts to authenticate the user but doesn't fail if no token is present.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * ```typescript
 * router.get('/products', optionalAuth, ProductController.list);
 * // Inside controller: if (req.user) { ... show personalized data ... }
 * ```
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(); // No token, continue without authentication
    }

    // Phase 2.5: Use token.utils for verification (includes issuer/audience check)
    const payload = verifyAccessToken(token);

    if (!payload) {
      return next(); // Invalid token, continue without authentication
    }

    // Get user from database
    // Note: dbRoles relation is deprecated - use RoleAssignment for RBAC
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.userId },
      relations: ['linkedAccounts'],
    });

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
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

/**
 * Backwards compatibility aliases
 */
export const authenticate = requireAuth;
export const authenticateToken = requireAuth;
export const authenticateCookie = requireAuth;
