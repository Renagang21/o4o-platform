/**
 * Tenant Context Middleware
 * Phase 6: Extract tenant identifier from request and inject into context
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// Service Group Types
export type ServiceGroup =
  | 'cosmetics'    // 화장품 서비스
  | 'yaksa'        // 약사회 서비스
  | 'tourist'      // 관광객 서비스
  | 'sellerops'    // 판매자 운영
  | 'supplierops'  // 공급자 운영
  | 'global';      // 모든 서비스 공통

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  serviceGroup?: ServiceGroup;
  config?: Record<string, any>;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string | null;
      tenant?: TenantContext | null;
      serviceGroup?: ServiceGroup;
    }
  }
}

/**
 * Extract tenant ID from request headers or domain mapping
 * Sets req.tenantId for use in downstream services
 */
export function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Strategy 1: Explicit X-Tenant-Id header (highest priority)
    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;

    if (headerTenantId) {
      req.tenantId = headerTenantId;
      logger.debug(`[Tenant Context] Set from header: ${headerTenantId}`);
      return next();
    }

    // Strategy 2: Subdomain mapping (e.g., branch1.neture.co.kr → branch1)
    const host = req.headers.host;

    if (host) {
      const subdomain = extractSubdomain(host);

      if (subdomain && isTenantSubdomain(subdomain)) {
        req.tenantId = subdomain;
        logger.debug(`[Tenant Context] Set from subdomain: ${subdomain}`);
        return next();
      }
    }

    // Strategy 3: JWT token claim (future enhancement)
    // const user = req.user;
    // if (user && user.tenantId) {
    //   req.tenantId = user.tenantId;
    //   return next();
    // }

    // Default: No tenant (global context)
    req.tenantId = null;
    logger.debug('[Tenant Context] No tenant (global context)');
    next();
  } catch (error) {
    logger.error('[Tenant Context] Middleware error:', error);
    // Don't fail the request, just default to null
    req.tenantId = null;
    next();
  }
}

/**
 * Extract subdomain from host header
 * Examples:
 *   - branch1.neture.co.kr → branch1
 *   - www.neture.co.kr → www
 *   - neture.co.kr → null
 *   - localhost:4000 → null
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];

  // Skip localhost and IP addresses
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split('.');

  // Need at least 3 parts for subdomain (e.g., branch1.neture.co.kr)
  if (parts.length < 3) {
    return null;
  }

  // Return first part as subdomain
  return parts[0];
}

/**
 * Check if subdomain should be treated as tenant identifier
 * Exclude common subdomains like www, api, admin, etc.
 */
function isTenantSubdomain(subdomain: string): boolean {
  const nonTenantSubdomains = [
    'www',
    'api',
    'admin',
    'auth',
    'cdn',
    'static',
    'assets',
    'media',
    'shop',
    'forum',
    'signage',
    'funding',
  ];

  return !nonTenantSubdomains.includes(subdomain.toLowerCase());
}

/**
 * Optional: Require tenant context (reject requests without tenant)
 * Use for tenant-specific endpoints
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenantId) {
    res.status(400).json({
      success: false,
      error: 'TENANT_REQUIRED',
      message: 'This endpoint requires a tenant context. Provide X-Tenant-Id header or use tenant subdomain.',
    });
    return;
  }

  next();
}

// ==================== Service Group Mapping ====================

/**
 * Map subdomain to service group
 */
const SUBDOMAIN_SERVICE_MAP: Record<string, ServiceGroup> = {
  'cosmetics': 'cosmetics',
  'beauty': 'cosmetics',
  'yaksa': 'yaksa',
  'pharmacy': 'yaksa',
  'tourist': 'tourist',
  'travel': 'tourist',
  'seller': 'sellerops',
  'supplier': 'supplierops',
};

/**
 * Extract service group from subdomain or path
 */
function extractServiceGroup(req: Request): ServiceGroup | undefined {
  // Strategy 1: X-Service-Group header
  const headerServiceGroup = req.headers['x-service-group'] as string | undefined;
  if (headerServiceGroup && isValidServiceGroup(headerServiceGroup)) {
    return headerServiceGroup as ServiceGroup;
  }

  // Strategy 2: Subdomain mapping
  const host = req.headers.host;
  if (host) {
    const subdomain = extractSubdomain(host);
    if (subdomain && SUBDOMAIN_SERVICE_MAP[subdomain]) {
      return SUBDOMAIN_SERVICE_MAP[subdomain];
    }
  }

  // Strategy 3: Path prefix (e.g., /api/v1/cosmetics-seller-extension/...)
  const pathMatch = req.path.match(/^\/api\/v1\/(cosmetics|yaksa|tourist|seller|supplier)/);
  if (pathMatch) {
    const prefix = pathMatch[1];
    if (prefix === 'cosmetics') return 'cosmetics';
    if (prefix === 'yaksa') return 'yaksa';
    if (prefix === 'tourist') return 'tourist';
    if (prefix === 'seller') return 'sellerops';
    if (prefix === 'supplier') return 'supplierops';
  }

  return undefined;
}

function isValidServiceGroup(value: string): value is ServiceGroup {
  return ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops', 'global'].includes(value);
}

// ==================== Enhanced Tenant Context ====================

/**
 * Enhanced tenant context middleware with service group support
 */
export function tenantContextEnhanced(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // First run basic tenant extraction
    tenantContext(req, res, () => {
      // Then extract service group
      req.serviceGroup = extractServiceGroup(req);

      // Build full tenant context if tenant exists
      if (req.tenantId) {
        req.tenant = {
          tenantId: req.tenantId,
          tenantSlug: req.tenantId,
          serviceGroup: req.serviceGroup,
        };
      }

      logger.debug(`[Tenant Context Enhanced] tenant=${req.tenantId}, service=${req.serviceGroup}`);
      next();
    });
  } catch (error) {
    logger.error('[Tenant Context Enhanced] Error:', error);
    next();
  }
}

// ==================== Route Protection ====================

/**
 * Protect routes to specific service groups
 * Usage: app.use('/api/v1/cosmetics', requireServiceGroup('cosmetics'))
 */
export function requireServiceGroup(...allowedGroups: ServiceGroup[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentService = req.serviceGroup;

    // Allow 'global' if no specific service detected
    if (!currentService) {
      if (allowedGroups.includes('global')) {
        return next();
      }
      res.status(403).json({
        success: false,
        error: 'SERVICE_GROUP_REQUIRED',
        message: `This endpoint requires service group: ${allowedGroups.join(' or ')}`,
      });
      return;
    }

    // Check if current service is allowed
    if (allowedGroups.includes(currentService) || allowedGroups.includes('global')) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: 'SERVICE_GROUP_MISMATCH',
      message: `This endpoint is not available for service group: ${currentService}`,
      allowedGroups,
    });
  };
}

/**
 * Protect routes for specific tenants
 * Usage: app.use('/api/v1/branch1', requireTenantMatch('branch1'))
 */
export function requireTenantMatch(...allowedTenants: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentTenant = req.tenantId;

    if (!currentTenant) {
      res.status(403).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'Tenant context required for this endpoint',
      });
      return;
    }

    if (allowedTenants.includes(currentTenant)) {
      return next();
    }

    res.status(404).json({
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'Route not found for this tenant',
    });
  };
}
