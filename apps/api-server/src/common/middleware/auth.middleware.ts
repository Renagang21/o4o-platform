import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { RoleAssignment } from '../../modules/auth/entities/RoleAssignment.js';
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
 * Verifies that the request includes a valid JWT token and the user exists.
 * Attaches the user object to req.user for downstream use.
 *
 * Returns 401 if:
 * - No token provided
 * - Token is invalid or expired
 * - User not found in database
 * - User account is inactive
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

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as any;

    // Get user from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts', 'dbRoles', 'dbRoles.permissions'],
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

  // Check if user has admin/operator role
  const isAdmin =
    user.hasRole('admin') ||
    user.hasRole('super_admin') ||
    user.hasRole('operator');

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
};

/**
 * Require Specific Role(s) Middleware
 *
 * Requires the user to have one of the specified roles.
 * Checks both legacy role system and new RoleAssignment table.
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
      let hasActiveRole = false;
      let matchedAssignment: RoleAssignment | null = null;

      // First check legacy role system
      for (const role of roleList) {
        if (user.hasRole(role)) {
          hasActiveRole = true;
          break;
        }
      }

      // If not found in legacy system, check RoleAssignment table
      if (!hasActiveRole) {
        const assignmentRepo = AppDataSource.getRepository(RoleAssignment);

        for (const role of roleList) {
          const assignment = await assignmentRepo.findOne({
            where: {
              userId: user.id,
              role: role,
              isActive: true,
            },
          });

          // Check validity period if assignment exists
          if (assignment && assignment.isValidNow()) {
            hasActiveRole = true;
            matchedAssignment = assignment;
            break;
          }
        }
      }

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

      // Attach role assignment to request for downstream use
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

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as any;

    // Get user from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts', 'dbRoles', 'dbRoles.permissions'],
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
 * Checks user's roles against the SSOT permission mapping.
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

      // Check if user has permission through their role
      // Import dynamically to avoid circular dependencies
      const { roleHasPermission, ADMIN_ROLES } = await import('@o4o/types');

      // Admin roles have all permissions
      if (ADMIN_ROLES.includes(user.role as any)) {
        return next();
      }

      // Check legacy role
      if (roleHasPermission(user.role, permission)) {
        return next();
      }

      // Check RoleAssignment-based roles
      const assignmentRepo = AppDataSource.getRepository(RoleAssignment);
      const assignments = await assignmentRepo.find({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      for (const assignment of assignments) {
        if (assignment.isValidNow() && roleHasPermission(assignment.role, permission)) {
          return next();
        }
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
      const { roleHasPermission, ADMIN_ROLES } = await import('@o4o/types');

      // Admin roles have all permissions
      if (ADMIN_ROLES.includes(user.role as any)) {
        return next();
      }

      // Check direct permissions
      for (const permission of permissions) {
        if (user.permissions?.includes(permission)) {
          return next();
        }
      }

      // Check role-based permissions
      for (const permission of permissions) {
        if (roleHasPermission(user.role, permission)) {
          return next();
        }
      }

      // Check RoleAssignment-based roles
      const assignmentRepo = AppDataSource.getRepository(RoleAssignment);
      const assignments = await assignmentRepo.find({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      for (const assignment of assignments) {
        if (assignment.isValidNow()) {
          for (const permission of permissions) {
            if (roleHasPermission(assignment.role, permission)) {
              return next();
            }
          }
        }
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
