/**
 * Signage Role Middleware
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 2)
 *
 * Role-based access control for Digital Signage API routes.
 *
 * Role Hierarchy (Role Reform V1):
 * - Admin: System-wide management (settings, extensions, suppliers, analytics)
 * - Operator (HQ): Global content production per service
 * - Store: Store-specific content management
 *
 * See: ROLE-STRUCTURE-V3.md for full role definitions
 */

import { Request, Response, NextFunction } from 'express';
import { hasPlatformRole, logLegacyRoleUsage } from '../utils/role.utils.js';

// Extend Express Request interface
declare module 'express' {
  interface Request {
    signageContext?: {
      role: 'admin' | 'operator' | 'store';
      serviceKey?: string;
      organizationId?: string;
      permissions: string[];
    };
  }
}

/**
 * Check if user has Admin permission for Signage
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 2
 * - Only platform:admin or platform:super_admin allowed
 * - Legacy roles (admin, super_admin) logged and denied
 */
export function hasSignageAdminPermission(user: any): boolean {
  if (!user) return false;

  const userId = user.id || 'unknown';
  const userRoles: string[] = user.roles || [];

  // Check for platform-level admin roles (Priority 1)
  if (hasPlatformRole(userRoles, 'super_admin') || hasPlatformRole(userRoles, 'admin')) {
    return true;
  }

  // Check for specific signage admin permission
  if (user.permissions?.includes('signage:admin')) {
    return true;
  }

  // Check database roles for signage-specific admin
  if (user.dbRoles?.some((r: any) => r.name === 'signage-admin')) {
    return true;
  }

  // Legacy role detection - log but deny access
  if (user.role === 'admin' || user.role === 'super_admin') {
    logLegacyRoleUsage(userId, user.role, 'signage-role.middleware:hasSignageAdminPermission');
    return false; // Deny access for legacy roles
  }

  if (user.dbRoles?.some((r: any) => r.name === 'admin')) {
    logLegacyRoleUsage(userId, 'admin', 'signage-role.middleware:hasSignageAdminPermission (dbRoles)');
    return false; // Deny access for legacy dbRoles
  }

  return false;
}

/**
 * Check if user has Operator (HQ) permission for a specific service
 */
export function hasSignageOperatorPermission(user: any, serviceKey: string): boolean {
  if (!user) return false;

  // Admin can always act as operator
  if (hasSignageAdminPermission(user)) {
    return true;
  }

  // Check for specific service operator permission
  const operatorPermission = `signage:${serviceKey}:operator`;
  if (user.permissions?.includes(operatorPermission)) {
    return true;
  }

  // Check database roles for operator role
  if (user.dbRoles?.some((r: any) =>
    r.name === `signage-${serviceKey}-operator` ||
    r.permissions?.includes(operatorPermission)
  )) {
    return true;
  }

  return false;
}

/**
 * Check if user has Store permission for a specific organization
 */
export function hasSignageStorePermission(
  user: any,
  organizationId: string
): boolean {
  if (!user) return false;

  // Admin can access any store
  if (hasSignageAdminPermission(user)) {
    return true;
  }

  // Check if user belongs to the organization
  if (user.organizationId === organizationId) {
    return true;
  }

  // Check if user has access to multiple organizations
  if (user.organizations?.includes(organizationId)) {
    return true;
  }

  // Check for specific store permission
  const storePermission = `signage:store:${organizationId}`;
  if (user.permissions?.includes(storePermission)) {
    return true;
  }

  return false;
}

/**
 * Middleware: Require Signage Admin permission
 *
 * Use for:
 * - /api/signage/admin/* routes
 * - System settings, extensions, suppliers management
 */
export const requireSignageAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  if (!hasSignageAdminPermission(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_ADMIN_REQUIRED',
      message: 'Signage admin permission required',
    });
  }

  // Set context
  req.signageContext = {
    role: 'admin',
    permissions: ['signage:admin'],
  };

  next();
};

/**
 * Middleware: Require Signage Operator (HQ) permission
 *
 * Use for:
 * - /api/signage/:serviceKey/hq/* routes
 * - HQ playlist/media CRUD
 * - Community approval
 * - Forced content management
 */
export const requireSignageOperator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const { serviceKey } = req.params;

  if (!serviceKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'SERVICE_KEY_REQUIRED',
      message: 'Service key is required',
    });
  }

  if (!hasSignageOperatorPermission(req.user, serviceKey)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_OPERATOR_REQUIRED',
      message: `Operator permission required for service: ${serviceKey}`,
    });
  }

  // Set context
  req.signageContext = {
    role: 'operator',
    serviceKey,
    permissions: [`signage:${serviceKey}:operator`],
  };

  next();
};

/**
 * Middleware: Require Signage Store permission
 *
 * Use for:
 * - /api/signage/:serviceKey/store/* routes
 * - Store playlist/media CRUD
 * - Schedule management
 * - Device management
 */
export const requireSignageStore = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const { serviceKey } = req.params;
  // Organization ID can come from header, query, or body
  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    req.body?.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'ORGANIZATION_ID_REQUIRED',
      message: 'Organization ID is required. Provide via X-Organization-Id header or organizationId parameter.',
    });
  }

  if (!hasSignageStorePermission(req.user, organizationId)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_STORE_REQUIRED',
      message: 'You do not have access to this store',
    });
  }

  // Set context
  req.signageContext = {
    role: 'store',
    serviceKey,
    organizationId,
    permissions: [`signage:store:${organizationId}`],
  };

  next();
};

/**
 * Middleware: Allow Signage Store Read (for global content)
 *
 * Less strict than requireSignageStore - allows read access
 * to global content without full store permission.
 *
 * Use for:
 * - /api/signage/:serviceKey/global/* routes (read-only)
 */
export const allowSignageStoreRead = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const { serviceKey } = req.params;
  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    (req.user as any)?.organizationId;

  // For read access, we're more lenient
  // Just need to be authenticated and have some organization context
  if (!organizationId && !hasSignageAdminPermission(req.user) && !hasSignageOperatorPermission(req.user, serviceKey)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'ORGANIZATION_CONTEXT_REQUIRED',
      message: 'Organization context required for store users',
    });
  }

  // Set context based on highest permission level
  if (hasSignageAdminPermission(req.user)) {
    req.signageContext = {
      role: 'admin',
      serviceKey,
      permissions: ['signage:admin'],
    };
  } else if (hasSignageOperatorPermission(req.user, serviceKey)) {
    req.signageContext = {
      role: 'operator',
      serviceKey,
      permissions: [`signage:${serviceKey}:operator`],
    };
  } else {
    req.signageContext = {
      role: 'store',
      serviceKey,
      organizationId,
      permissions: [`signage:store:${organizationId}:read`],
    };
  }

  next();
};

/**
 * Middleware: Require Operator OR Store permission
 *
 * Use for shared routes that both Operator and Store can access
 * but with different data scopes.
 */
export const requireSignageOperatorOrStore = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const { serviceKey } = req.params;
  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    req.body?.organizationId;

  // Check operator permission first
  if (hasSignageOperatorPermission(req.user, serviceKey)) {
    req.signageContext = {
      role: 'operator',
      serviceKey,
      permissions: [`signage:${serviceKey}:operator`],
    };
    return next();
  }

  // Check store permission
  if (organizationId && hasSignageStorePermission(req.user, organizationId)) {
    req.signageContext = {
      role: 'store',
      serviceKey,
      organizationId,
      permissions: [`signage:store:${organizationId}`],
    };
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    code: 'SIGNAGE_ACCESS_DENIED',
    message: 'Operator or Store permission required',
  });
};

/**
 * Middleware: Validate service key from params
 *
 * Use as a pre-check before other role middlewares.
 */
export const validateServiceKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { serviceKey } = req.params;

  if (!serviceKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'SERVICE_KEY_REQUIRED',
      message: 'Service key is required in URL path',
    });
  }

  // Add validation for allowed service keys if needed
  const validServiceKeys = ['pharmacy', 'cosmetics', 'tourism', 'common', 'kpa-society', 'neture', 'glycopharm'];
  if (!validServiceKeys.includes(serviceKey) && serviceKey !== 'test') {
    // Log warning but don't block - allow for future services
    console.warn(`[Signage] Unrecognized service key: ${serviceKey}`);
  }

  next();
};
