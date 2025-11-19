import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';

// Re-export AuthRequest for backward compatibility
export { AuthRequest };

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

    if (!token) {
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    // Get user from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts', 'dbRoles', 'dbRoles.permissions']
    });

    if (!user) {
      return res.status(401).json({
        code: 'INVALID_USER',
        message: 'User account not found or has been deactivated'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        code: 'USER_INACTIVE',
        message: 'User account is inactive'
      });
    }

    // Attach user to request
    req.user = user as any;
    next();
  } catch (error) {
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

  // Check if user has admin/operator role (legacy or new system)
  const isAdmin = user.hasRole('admin') ||
                  user.hasRole('super_admin') ||
                  user.hasRole('operator');

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
};

/**
 * P0 RBAC: requireRole - Role-based authorization check
 *
 * Requires user to have an active RoleAssignment for one of the specified roles.
 * Uses new P0 role_assignments table as source of truth.
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
      // Check if user has ANY of the required roles
      let hasActiveRole = false;
      let matchedAssignment: RoleAssignment | null = null;

      // First check legacy role system (User.hasRole)
      for (const role of roleList) {
        if (user.hasRole(role)) {
          hasActiveRole = true;
          break;
        }
      }

      // If not found in legacy system, check P0 role_assignments table
      if (!hasActiveRole) {
        const assignmentRepo = AppDataSource.getRepository(RoleAssignment);

        for (const role of roleList) {
          const assignment = await assignmentRepo.findOne({
            where: {
              userId: user.id,
              role: role,
              isActive: true
            }
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

      // Attach assignment to request for downstream use (if found)
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
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts', 'dbRoles', 'dbRoles.permissions']
    });

    if (user && user.isActive) {
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