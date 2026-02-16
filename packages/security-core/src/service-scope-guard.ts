/**
 * Service Scope Guard Factory
 *
 * Creates Express middleware that enforces service-specific role-based access control.
 *
 * Security model (3-priority):
 * 1. Check service-prefixed roles → ALLOW
 * 2. Detect legacy unprefixed roles → LOG + DENY
 * 3. Detect cross-service roles → DENY
 * 4. Default → DENY
 *
 * Usage:
 *   const requireScope = createServiceScopeGuard(kpaConfig);
 *   router.get('/admin', authenticate, requireScope('kpa:admin'), handler);
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ServiceScopeGuardConfig, SecurityUser } from './types.js';

/**
 * Create a scope guard factory for a specific service.
 *
 * Returns a function that accepts a scope string and returns Express middleware.
 *
 * @example
 * const requireKpaScope = createServiceScopeGuard({
 *   serviceKey: 'kpa',
 *   allowedRoles: ['kpa:admin', 'kpa:operator'],
 *   platformBypass: false,
 *   legacyRoles: ['admin', 'operator'],
 *   blockedServicePrefixes: ['neture', 'glycopharm', 'cosmetics', 'glucoseview'],
 * });
 *
 * router.get('/admin', authenticate, requireKpaScope('kpa:admin'), handler);
 */
export function createServiceScopeGuard(
  config: ServiceScopeGuardConfig
): (scope: string) => RequestHandler {
  const {
    serviceKey,
    allowedRoles,
    platformBypass,
    legacyRoles,
    blockedServicePrefixes,
    scopeRoleMapping,
  } = config;

  return function requireScope(scope: string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user as SecurityUser | undefined;

      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const userId = user.id || 'unknown';
      const userScopes: string[] = user.scopes || [];
      const userRoles: string[] = user.roles || [];

      // --- Check JWT scopes ---
      const adminScope = `${serviceKey}:admin`;
      const hasScope = userScopes.includes(scope) || userScopes.includes(adminScope);

      // --- Priority 1: Check service-prefixed roles ---
      let rolesToCheck: string[];

      if (scopeRoleMapping && scopeRoleMapping[scope]) {
        // Use scope-level mapping (e.g., Neture's hierarchy)
        rolesToCheck = scopeRoleMapping[scope];
      } else {
        // Fall back to full allowed roles list
        rolesToCheck = allowedRoles;
      }

      // Add platform bypass if enabled
      if (platformBypass) {
        rolesToCheck = [...rolesToCheck, 'platform:admin', 'platform:super_admin'];
      }

      const hasServiceRole = userRoles.some(r => rolesToCheck.includes(r));

      if (hasScope || hasServiceRole) {
        next();
        return;
      }

      // --- Priority 2: Detect legacy roles → LOG + DENY ---
      const detectedLegacyRoles = userRoles.filter(r => legacyRoles.includes(r));

      if (detectedLegacyRoles.length > 0) {
        detectedLegacyRoles.forEach(role => {
          console.warn(
            `[ROLE_MIGRATION] Legacy role format used: "${role}" | User: ${userId} | Context: ${serviceKey}:requireScope(${scope})`
          );
        });
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Required scope: ${scope}. Legacy roles are no longer supported. Please use ${serviceKey}:* prefixed roles.`,
          },
        });
        return;
      }

      // --- Priority 3: Detect cross-service roles → DENY ---
      const hasBlockedServiceRole = userRoles.some(r => {
        for (const prefix of blockedServicePrefixes) {
          if (r.startsWith(`${prefix}:`)) return true;
        }
        return false;
      });

      if (hasBlockedServiceRole) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Required scope: ${scope}. ${serviceKey} service requires ${serviceKey}:* roles.`,
          },
        });
        return;
      }

      // --- Default: DENY ---
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: `Required scope: ${scope}` },
      });
    };
  };
}
