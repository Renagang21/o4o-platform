/**
 * Tenant Isolation Middleware
 * Phase 8 — Multi-Tenant Data Isolation Enhancement
 *
 * Enhanced middleware for enforcing tenant isolation at the route level.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '../utils/logger.js';
import type { ServiceGroup } from './tenant-context.middleware.js';

/**
 * Tenant isolation error codes
 */
export enum TenantIsolationError {
  TENANT_REQUIRED = 'TENANT_REQUIRED',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  SERVICE_GROUP_MISMATCH = 'SERVICE_GROUP_MISMATCH',
  CROSS_TENANT_ACCESS = 'CROSS_TENANT_ACCESS',
  INVALID_TENANT = 'INVALID_TENANT',
}

/**
 * Enhanced tenant isolation options
 */
export interface TenantIsolationOptions {
  /** Require tenant ID */
  requireTenant?: boolean;

  /** Allowed service groups */
  allowedServiceGroups?: ServiceGroup[];

  /** Allow global access (admin) */
  allowGlobalAccess?: boolean;

  /** Custom tenant validator */
  validateTenant?: (tenantId: string, req: Request) => Promise<boolean>;

  /** Log access attempts */
  logAccess?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: TenantIsolationOptions = {
  requireTenant: true,
  allowGlobalAccess: false,
  logAccess: false,
};

/**
 * Create tenant isolation middleware with options
 */
export function tenantIsolation(options: TenantIsolationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    const serviceGroup = req.serviceGroup;

    // Log access if enabled
    if (opts.logAccess) {
      logger.debug(`[TenantIsolation] Access: tenant=${tenantId}, service=${serviceGroup}, path=${req.path}`);
    }

    // Check if tenant is required
    if (opts.requireTenant && !tenantId) {
      if (opts.allowGlobalAccess && isAdminRequest(req)) {
        // Allow admin global access
        return next();
      }

      res.status(400).json({
        success: false,
        error: TenantIsolationError.TENANT_REQUIRED,
        message: 'Tenant context is required for this endpoint',
      });
      return;
    }

    // Check service group restrictions
    if (opts.allowedServiceGroups && opts.allowedServiceGroups.length > 0) {
      if (!serviceGroup) {
        if (!opts.allowedServiceGroups.includes('global')) {
          res.status(403).json({
            success: false,
            error: TenantIsolationError.SERVICE_GROUP_MISMATCH,
            message: 'Service group is required for this endpoint',
            allowedGroups: opts.allowedServiceGroups,
          });
          return;
        }
      } else if (!opts.allowedServiceGroups.includes(serviceGroup) && !opts.allowedServiceGroups.includes('global')) {
        res.status(403).json({
          success: false,
          error: TenantIsolationError.SERVICE_GROUP_MISMATCH,
          message: `This endpoint is not available for service group: ${serviceGroup}`,
          allowedGroups: opts.allowedServiceGroups,
        });
        return;
      }
    }

    // Custom tenant validation
    if (tenantId && opts.validateTenant) {
      try {
        const isValid = await opts.validateTenant(tenantId, req);
        if (!isValid) {
          res.status(403).json({
            success: false,
            error: TenantIsolationError.INVALID_TENANT,
            message: 'Tenant validation failed',
          });
          return;
        }
      } catch (error) {
        logger.error(`[TenantIsolation] Tenant validation error:`, error);
        res.status(500).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Failed to validate tenant',
        });
        return;
      }
    }

    next();
  };
}

/**
 * Check if request is from admin context
 */
function isAdminRequest(req: Request): boolean {
  // Check for admin-specific headers or auth
  const isAdmin = req.headers['x-admin-access'] === 'true';
  const user = (req as any).user;
  // Phase3-D: user.roles는 RoleAssignment 데이터로 오버라이드됨
  const hasAdminRole = user?.roles?.includes('admin') || user?.roles?.includes('super_admin');

  return isAdmin || hasAdminRole;
}

/**
 * Strict tenant enforcement middleware
 * Blocks all requests without valid tenant context
 */
export function strictTenantEnforcement(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenantId) {
    logger.warn(`[TenantIsolation] Blocked request without tenant: ${req.method} ${req.path}`);

    res.status(403).json({
      success: false,
      error: TenantIsolationError.TENANT_REQUIRED,
      message: 'This endpoint requires tenant context',
    });
    return;
  }

  next();
}

/**
 * Cross-tenant access prevention middleware
 * Verifies that resources belong to the requesting tenant
 */
export function preventCrossTenantAccess(
  tenantIdExtractor: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestTenantId = req.tenantId;
    const resourceTenantId = tenantIdExtractor(req);

    if (!requestTenantId) {
      // No tenant context - let other middleware handle
      return next();
    }

    if (resourceTenantId && resourceTenantId !== requestTenantId) {
      logger.warn(
        `[TenantIsolation] Cross-tenant access blocked: request=${requestTenantId}, resource=${resourceTenantId}`
      );

      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Resource not found',
      });
      return;
    }

    next();
  };
}

/**
 * Tenant scope validator for body data
 * Ensures submitted data matches tenant context
 */
export function validateBodyTenant(tenantIdField: string = 'tenantId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestTenantId = req.tenantId;
    const bodyTenantId = req.body?.[tenantIdField];

    // If body has tenant ID, it must match request tenant
    if (bodyTenantId && requestTenantId && bodyTenantId !== requestTenantId) {
      logger.warn(
        `[TenantIsolation] Body tenant mismatch: request=${requestTenantId}, body=${bodyTenantId}`
      );

      res.status(400).json({
        success: false,
        error: TenantIsolationError.TENANT_MISMATCH,
        message: 'Tenant ID in request body does not match current tenant context',
      });
      return;
    }

    // Auto-inject tenant ID if missing
    if (requestTenantId && !bodyTenantId && req.body) {
      req.body[tenantIdField] = requestTenantId;
    }

    next();
  };
}

/**
 * Service group route guard factory
 */
export function serviceGroupGuard(...allowedGroups: ServiceGroup[]): RequestHandler {
  return tenantIsolation({
    requireTenant: false,
    allowedServiceGroups: allowedGroups,
    logAccess: true,
  }) as RequestHandler;
}

/**
 * Tenant-only route guard (no global access)
 */
export const tenantOnlyGuard = tenantIsolation({
  requireTenant: true,
  allowGlobalAccess: false,
  logAccess: true,
});

/**
 * Tenant-preferred route guard (global access allowed for admins)
 */
export const tenantPreferredGuard = tenantIsolation({
  requireTenant: true,
  allowGlobalAccess: true,
  logAccess: true,
});
