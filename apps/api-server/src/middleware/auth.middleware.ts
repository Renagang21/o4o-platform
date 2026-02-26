import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';

// Re-export AuthRequest for backward compatibility
export type { AuthRequest };

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
 * P0 RBAC: requireAuth - Basic authentication check
 *
 * Verifies user is logged in (401 if not).
 * Attaches user to req.user for downstream use.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    logger.info('[requireAuth] Checking authentication', {
      path: req.path,
      method: req.method,
      hasToken: !!token
    });

    if (!token) {
      logger.warn('[requireAuth] No token found');
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    logger.info('[requireAuth] Token verified', { userId: decoded.userId || decoded.sub });

    // Get user from database
    // Note: dbRoles relation is deprecated - use RoleAssignment for RBAC
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts']
    });

    if (!user) {
      logger.warn('[requireAuth] User not found in database', { userId: decoded.userId || decoded.sub });
      return res.status(401).json({
        code: 'INVALID_USER',
        message: 'User account not found or has been deactivated'
      });
    }

    if (!user.isActive) {
      logger.warn('[requireAuth] User is inactive', { userId: user.id });
      return res.status(401).json({
        code: 'USER_INACTIVE',
        message: 'User account is inactive'
      });
    }

    // Phase3-E: RoleAssignment에서 권한 있는 역할 로드 → user.roles 오버라이드
    // role is now a getter computed from roles[0], so only set roles
    try {
      const roleNames = await roleAssignmentService.getRoleNames(user.id);
      if (roleNames.length > 0) {
        user.roles = roleNames;
      }
    } catch {
      // RoleAssignment 테이블 미존재 시 무시
    }

    logger.info('[requireAuth] Authentication successful', { userId: user.id, roles: user.roles });
    // Attach user to request
    req.user = user as any;
    next();
  } catch (error) {
    logger.error('[requireAuth] Token verification failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Access token is invalid or has expired'
    });
  }
};

/**
 * P0 RBAC: requireAdmin - Admin/Operator authorization check
 *
 * Requires user to be authenticated AND have admin/operator role.
 * Returns 403 if user lacks admin privileges.
 * Uses RoleAssignment table (P0 RBAC) for role checking.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // First ensure user is authenticated
  await requireAuth(req, res, () => {});

  if (!req.user) {
    return; // requireAuth already sent 401
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
      // Log unauthorized access attempt
      logger.warn('Unauthorized admin access attempt', {
        userId: user.id,
        email: user.email,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Admin privileges required'
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking admin role', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id
    });

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error verifying admin access'
    });
  }
};

/**
 * P0 RBAC: requireRole - Role-based authorization check
 *
 * Requires user to have an active RoleAssignment for one of the specified roles.
 * Uses P0 role_assignments table via RoleAssignmentService as the sole source of truth.
 *
 * @param roles - Role name(s) to check (e.g., 'supplier', ['admin', 'staff'])
 */
export const requireRole = (roles: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    await requireAuth(req, res, () => {});

    if (!req.user) {
      return; // requireAuth already sent 401
    }

    const user = req.user as User;
    const roleList = Array.isArray(roles) ? roles : [roles];

    try {
      // P0 RBAC: Check roles using RoleAssignment service only
      const hasActiveRole = await roleAssignmentService.hasAnyRole(user.id, roleList);

      if (!hasActiveRole) {
        // Log unauthorized role access attempt
        logger.warn('Unauthorized role access attempt', {
          userId: user.id,
          email: user.email,
          requiredRoles: roleList,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({
          code: 'ROLE_REQUIRED',
          message: roleList.length === 1
            ? `Active ${roleList[0]} role required`
            : `One of these roles required: ${roleList.join(', ')}`,
          details: {
            requiredRoles: roleList
          }
        });
      }

      // Get active roles for request context
      const activeRoles = await roleAssignmentService.getActiveRoles(user.id);
      const matchedAssignment = activeRoles.find(a => roleList.includes(a.role));
      if (matchedAssignment) {
        (req as any).roleAssignment = matchedAssignment;
      }

      next();
    } catch (error) {
      logger.error('Error checking role assignment', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        roles: roleList
      });

      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Error verifying role access'
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user to request if valid token is present
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(); // No token, continue without authentication
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    // Get user from database
    // Note: dbRoles relation is deprecated - use RoleAssignment for RBAC
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts']
    });

    if (user && user.isActive) {
      // Phase3-E: RoleAssignment에서 역할 오버라이드
      // role is now a getter computed from roles[0], so only set roles
      try {
        const roleNames = await roleAssignmentService.getRoleNames(user.id);
        if (roleNames.length > 0) {
          user.roles = roleNames;
        }
      } catch {
        // RoleAssignment 테이블 미존재 시 무시
      }
      // Attach user to request
      req.user = user as any;
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Legacy authenticate middleware (deprecated)
 *
 * @deprecated Use requireAuth instead
 */
export const authenticate = requireAuth;

/**
 * Alias for requireAuth - for compatibility with auth.ts
 */
export const authenticateToken = requireAuth;

/**
 * Alias for requireAuth - for auth-v2 compatibility
 */
export const authenticateCookie = requireAuth;