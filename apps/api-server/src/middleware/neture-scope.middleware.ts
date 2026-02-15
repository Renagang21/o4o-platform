/**
 * Neture Service Scope Guard Middleware
 *
 * WO-NETURE-GUARD-REALIGNMENT-V1 Phase 1
 *
 * Pattern: KPA requireKpaScope() adapted for Neture
 * - Accepts neture:* prefixed roles based on scope level
 * - Accepts platform:admin, platform:super_admin (platform bypass)
 * - Denies legacy unprefixed roles (admin, operator, seller, etc.)
 * - Denies cross-service roles (kpa:*, glycopharm:*, etc.)
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../utils/role.utils.js';

/**
 * Scope-level role mapping:
 * - neture:admin → neture:admin, platform:admin, platform:super_admin
 * - neture:operator → above + neture:operator
 * - neture:supplier → neture:supplier + admin bypass
 * - neture:partner → neture:partner + admin bypass
 */
function getScopeRoles(scope: string): string[] {
  const platformAdmins = ['platform:admin', 'platform:super_admin'];

  switch (scope) {
    case 'neture:admin':
      return ['neture:admin', ...platformAdmins];
    case 'neture:operator':
      return ['neture:operator', 'neture:admin', ...platformAdmins];
    case 'neture:supplier':
      return ['neture:supplier', 'neture:admin', ...platformAdmins];
    case 'neture:partner':
      return ['neture:partner', 'neture:admin', ...platformAdmins];
    default:
      return ['neture:admin', ...platformAdmins];
  }
}

export function requireNetureScope(scope: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const userId = user.id || 'unknown';
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    // Check JWT scopes
    const hasScope = userScopes.includes(scope) || userScopes.includes('neture:admin');

    // Priority 1: Check Neture-specific prefixed roles at required scope level
    const allowedRoles = getScopeRoles(scope);
    const hasNetureRole = hasAnyServiceRole(userRoles, allowedRoles as any);

    if (hasScope || hasNetureRole) {
      next();
      return;
    }

    // Priority 2: Detect legacy roles and DENY access
    const legacyRoles = ['admin', 'super_admin', 'operator', 'manager', 'seller', 'supplier', 'partner'];
    const detectedLegacyRoles = userRoles.filter(r => legacyRoles.includes(r));

    if (detectedLegacyRoles.length > 0) {
      detectedLegacyRoles.forEach(role => {
        logLegacyRoleUsage(userId, role, `neture-scope:requireNetureScope(${scope})`);
      });
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Required scope: ${scope}. Legacy roles are no longer supported. Please use neture:* prefixed roles.`,
        },
      });
      return;
    }

    // Priority 3: Detect cross-service roles and DENY
    const hasOtherServiceRole = userRoles.some(r =>
      r.startsWith('kpa:') ||
      r.startsWith('glycopharm:') ||
      r.startsWith('cosmetics:') ||
      r.startsWith('glucoseview:')
    );

    if (hasOtherServiceRole) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Required scope: ${scope}. Neture service requires neture:* roles.`,
        },
      });
      return;
    }

    // No valid role found
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: `Required scope: ${scope}` },
    });
  };
}
