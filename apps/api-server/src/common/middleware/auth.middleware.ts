import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { RoleAssignment } from '../../modules/auth/entities/RoleAssignment.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { verifyAccessToken, isServiceToken, isPlatformUserToken, isGuestToken, isGuestOrServiceToken } from '../../utils/token.utils.js';
import type { AccessTokenPayload, TokenType } from '../../types/auth.js';
import logger from '../../utils/logger.js';
import { hasPlatformRole, logLegacyRoleUsage } from '../../utils/role.utils.js';

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
  const userRoles = user.roles || [];

  try {
    // Check prefixed platform roles first (Priority 1)
    if (hasPlatformRole(userRoles, 'super_admin') || hasPlatformRole(userRoles, 'admin')) {
      return next();
    }

    // Check RoleAssignment table for prefixed platform roles (Priority 2)
    const hasPlatformRoleAssignment = await roleAssignmentService.hasAnyRole(user.id, [
      'platform:super_admin',
      'platform:admin'
    ]);

    if (hasPlatformRoleAssignment) {
      return next();
    }

    // Check for legacy roles in User.roles and log/deny
    const legacyRoles = ['admin', 'super_admin', 'operator'];
    const hasLegacyRole = legacyRoles.some(role => userRoles.includes(role));

    if (hasLegacyRole) {
      // Log legacy role usage
      legacyRoles.forEach(role => {
        if (userRoles.includes(role)) {
          logLegacyRoleUsage(user.id, role, 'common/auth.middleware:requireAdmin');
        }
      });

      logger.warn('[requireAdmin] Legacy role format detected and denied', {
        userId: user.id,
        email: user.email,
        legacyRoles: userRoles.filter(r => legacyRoles.includes(r)),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Admin privileges required (platform:admin or platform:super_admin)',
        code: 'FORBIDDEN',
      });
    }

    // Check for legacy roles in RoleAssignment table and log/deny
    const hasLegacyRoleAssignment = await roleAssignmentService.hasAnyRole(user.id, [
      'admin',
      'super_admin',
      'operator'
    ]);

    if (hasLegacyRoleAssignment) {
      logLegacyRoleUsage(user.id, 'legacy_role_assignment', 'common/auth.middleware:requireAdmin');

      logger.warn('[requireAdmin] Legacy role assignment detected and denied', {
        userId: user.id,
        email: user.email,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Admin privileges required (platform:admin or platform:super_admin)',
        code: 'FORBIDDEN',
      });
    }

    // No admin role found - deny access
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

// ============================================================================
// Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
// ============================================================================

/**
 * Extended Request interface for Service Users
 */
export interface ServiceAuthRequest extends Request {
  serviceUser?: {
    providerUserId: string;
    provider?: string;
    email: string;
    displayName?: string;
    profileImage?: string;
    serviceId?: string;
    storeId?: string;
    tokenType: 'service';
  };
  tokenPayload?: AccessTokenPayload;
}

/**
 * Require Platform User Authentication
 *
 * Similar to requireAuth but explicitly rejects Service User tokens.
 * Use this for Admin/Operator APIs that should NEVER be accessible
 * by Service Users.
 *
 * Returns 403 if token is a Service User token.
 *
 * @example
 * ```typescript
 * router.delete('/admin/users/:id', requirePlatformUser, AdminController.deleteUser);
 * ```
 */
export const requirePlatformUser = async (
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

    // Phase 1: Check token type - reject Service tokens
    if (isServiceToken(token)) {
      logger.warn('[requirePlatformUser] Service token rejected for platform-only endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Platform user authentication required. Service tokens are not allowed.',
        code: 'SERVICE_TOKEN_NOT_ALLOWED',
      });
    }

    // Continue with standard platform user auth
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user from database
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

    req.user = user;
    next();
  } catch (error) {
    logger.error('[requirePlatformUser] Token verification failed', {
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
 * Require Service User Authentication
 *
 * Validates that the token is a Service User token (tokenType: 'service').
 * Does NOT look up user in database - Service Users are not stored.
 *
 * Attaches serviceUser object to request with token payload data.
 *
 * Returns 401 if no token or invalid token.
 * Returns 403 if token is a Platform User token.
 *
 * @example
 * ```typescript
 * router.get('/service/profile', requireServiceUser, ServiceController.getProfile);
 * ```
 */
export const requireServiceUser = async (
  req: ServiceAuthRequest,
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

    // Phase 1: Check token type - reject Platform tokens
    if (isPlatformUserToken(token)) {
      logger.warn('[requireServiceUser] Platform token rejected for service-only endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Service user authentication required. Platform tokens are not allowed.',
        code: 'PLATFORM_TOKEN_NOT_ALLOWED',
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach service user data from token (no DB lookup)
    req.serviceUser = {
      providerUserId: payload.userId || payload.sub || '',
      provider: payload.role === 'service_user' ? undefined : payload.role,
      email: payload.email || '',
      displayName: payload.name,
      serviceId: payload.serviceId,
      storeId: payload.storeId,
      tokenType: 'service',
    };
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error('[requireServiceUser] Token verification failed', {
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
 * Optional Service User Authentication
 *
 * Attempts to authenticate as Service User but doesn't fail if no token.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * ```typescript
 * router.get('/service/products', optionalServiceAuth, ProductController.list);
 * ```
 */
export const optionalServiceAuth = async (
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Only process if it's a service token
    if (!isServiceToken(token)) {
      return next();
    }

    const payload = verifyAccessToken(token);

    if (payload) {
      req.serviceUser = {
        providerUserId: payload.userId || payload.sub || '',
        provider: payload.role === 'service_user' ? undefined : payload.role,
        email: payload.email || '',
        displayName: payload.name,
        serviceId: payload.serviceId,
        storeId: payload.storeId,
        tokenType: 'service',
      };
      req.tokenPayload = payload;
    }

    next();
  } catch (error) {
    next();
  }
};

// ============================================================================
// Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
// ============================================================================

/**
 * Extended Request interface for Guest Users
 */
export interface GuestAuthRequest extends Request {
  guestUser?: {
    guestSessionId: string;
    serviceId?: string;
    storeId?: string;
    deviceId?: string;
    tokenType: 'guest';
  };
  tokenPayload?: AccessTokenPayload;
}

/**
 * Extended Request interface for Guest or Service Users
 */
export interface GuestOrServiceAuthRequest extends Request {
  guestUser?: {
    guestSessionId: string;
    serviceId?: string;
    storeId?: string;
    deviceId?: string;
    tokenType: 'guest';
  };
  serviceUser?: {
    providerUserId: string;
    provider?: string;
    email: string;
    displayName?: string;
    profileImage?: string;
    serviceId?: string;
    storeId?: string;
    tokenType: 'service';
  };
  tokenPayload?: AccessTokenPayload;
}

/**
 * Require Guest User Authentication
 *
 * Validates that the token is a Guest token (tokenType: 'guest').
 * Does NOT look up user in database - Guest Users are not stored.
 *
 * Attaches guestUser object to request with token payload data.
 *
 * Returns 401 if no token or invalid token.
 * Returns 403 if token is a Platform or Service User token.
 *
 * @example
 * ```typescript
 * router.get('/guest/activity', requireGuestUser, GuestController.getActivity);
 * ```
 */
export const requireGuestUser = async (
  req: GuestAuthRequest,
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

    // Phase 3: Check token type - reject Platform and Service tokens
    if (!isGuestToken(token)) {
      logger.warn('[requireGuestUser] Non-guest token rejected for guest-only endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Guest authentication required. Only guest tokens are allowed.',
        code: 'GUEST_TOKEN_REQUIRED',
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach guest user data from token (no DB lookup)
    req.guestUser = {
      guestSessionId: payload.guestSessionId || payload.userId || payload.sub || '',
      serviceId: payload.serviceId,
      storeId: payload.storeId,
      deviceId: payload.deviceId,
      tokenType: 'guest',
    };
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error('[requireGuestUser] Token verification failed', {
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
 * Require Guest or Service User Authentication
 *
 * Validates that the token is either a Guest (tokenType: 'guest')
 * or Service User token (tokenType: 'service').
 *
 * Does NOT look up user in database - Guest/Service Users are not stored.
 *
 * Attaches guestUser OR serviceUser object to request based on token type.
 *
 * Returns 401 if no token or invalid token.
 * Returns 403 if token is a Platform User token.
 *
 * Use case: Endpoints that should be accessible by both Guest and Service Users
 * (e.g., store browsing, product catalog, QR entry points)
 *
 * @example
 * ```typescript
 * router.get('/store/products', requireGuestOrServiceUser, StoreController.getProducts);
 * ```
 */
export const requireGuestOrServiceUser = async (
  req: GuestOrServiceAuthRequest,
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

    // Phase 3: Check token type - reject Platform tokens
    if (!isGuestOrServiceToken(token)) {
      logger.warn('[requireGuestOrServiceUser] Platform token rejected for guest/service endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Guest or Service authentication required. Platform tokens are not allowed.',
        code: 'GUEST_OR_SERVICE_TOKEN_REQUIRED',
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach appropriate user data based on token type
    if (payload.tokenType === 'guest') {
      req.guestUser = {
        guestSessionId: payload.guestSessionId || payload.userId || payload.sub || '',
        serviceId: payload.serviceId,
        storeId: payload.storeId,
        deviceId: payload.deviceId,
        tokenType: 'guest',
      };
    } else {
      req.serviceUser = {
        providerUserId: payload.userId || payload.sub || '',
        provider: payload.role === 'service_user' ? undefined : payload.role,
        email: payload.email || '',
        displayName: payload.name,
        serviceId: payload.serviceId,
        storeId: payload.storeId,
        tokenType: 'service',
      };
    }
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error('[requireGuestOrServiceUser] Token verification failed', {
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
 * Optional Guest or Service User Authentication
 *
 * Attempts to authenticate as Guest/Service User but doesn't fail if no token.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * ```typescript
 * router.get('/store/landing', optionalGuestOrServiceAuth, StoreController.getLanding);
 * ```
 */
export const optionalGuestOrServiceAuth = async (
  req: GuestOrServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Only process if it's a guest or service token
    if (!isGuestOrServiceToken(token)) {
      return next();
    }

    const payload = verifyAccessToken(token);

    if (payload) {
      if (payload.tokenType === 'guest') {
        req.guestUser = {
          guestSessionId: payload.guestSessionId || payload.userId || payload.sub || '',
          serviceId: payload.serviceId,
          storeId: payload.storeId,
          deviceId: payload.deviceId,
          tokenType: 'guest',
        };
      } else {
        req.serviceUser = {
          providerUserId: payload.userId || payload.sub || '',
          provider: payload.role === 'service_user' ? undefined : payload.role,
          email: payload.email || '',
          displayName: payload.name,
          serviceId: payload.serviceId,
          storeId: payload.storeId,
          tokenType: 'service',
        };
      }
      req.tokenPayload = payload;
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Backwards compatibility aliases
 */
export const authenticate = requireAuth;
export const authenticateToken = requireAuth;
export const authenticateCookie = requireAuth;
