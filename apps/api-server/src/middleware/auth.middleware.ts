import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';

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
 * Requires user to have an active RoleAssignment for the specified role.
 * Uses new P0 role_assignments table as source of truth.
 *
 * @param role - Role name to check (e.g., 'supplier', 'seller', 'partner')
 */
export const requireRole = (role: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    await requireAuth(req, res, () => {});

    if (!req.user) {
      return; // requireAuth already sent 401
    }

    const user = req.user as User;

    try {
      // Check for active RoleAssignment in P0 table
      const assignmentRepo = AppDataSource.getRepository(RoleAssignment);
      const assignment = await assignmentRepo.findOne({
        where: {
          userId: user.id,
          role: role,
          isActive: true
        }
      });

      // Also check validity period if assignment exists
      const hasActiveRole = assignment && assignment.isValidNow();

      if (!hasActiveRole) {
        // Log unauthorized role access attempt
        logger.warn('Unauthorized role access attempt', {
          userId: user.id,
          email: user.email,
          wantedRole: role,
          hasActiveAssignment: !!assignment,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({
          code: 'ROLE_REQUIRED',
          message: `Active ${role} role required`,
          details: {
            requiredRole: role
          }
        });
      }

      // Attach assignment to request for downstream use
      (req as any).roleAssignment = assignment;
      next();
    } catch (error) {
      logger.error('Error checking role assignment', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        role
      });

      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Error verifying role access'
      });
    }
  };
};

/**
 * Legacy authenticate middleware (deprecated)
 *
 * @deprecated Use requireAuth instead
 */
export const authenticate = requireAuth;