/**
 * Tenant Context Middleware
 * Phase 6: Extract tenant identifier from request and inject into context
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string | null;
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
