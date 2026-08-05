/**
 * Service Scope Guard Factory
 *
 * WO-OPERATOR-ROLE-CLEANUP-V1: Legacy detection removed, platformBypass = platform:super_admin only
 *
 * Creates Express middleware that enforces service-specific role-based access control.
 *
 * Security model (2-priority):
 * 1. Check service-prefixed roles (+ platform:super_admin bypass) → ALLOW
 * 2. Detect cross-service roles → DENY
 * 3. Default → DENY
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
 *   legacyRoles: [],
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

      const userRoles: string[] = user.roles || [];

      // WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
      //   기존의 `user.scopes` 기반 허용 분기를 제거했다. 인증 미들웨어가 JWT 의
      //   scopes claim 을 req.user 로 전달한 적이 없어 항상 false 로만 평가되던
      //   미완성 축이다. 판정은 아래 role 기반 경로가 전담한다 (동작 불변).

      // --- Priority 1: Check service-prefixed roles ---
      let rolesToCheck: string[];

      if (scopeRoleMapping && scopeRoleMapping[scope]) {
        // Use scope-level mapping (e.g., Neture's hierarchy)
        rolesToCheck = scopeRoleMapping[scope];
      } else {
        // Fall back to full allowed roles list
        rolesToCheck = allowedRoles;
      }

      // platform:super_admin bypass if enabled
      if (platformBypass) {
        rolesToCheck = [...rolesToCheck, 'platform:super_admin'];
      }

      const hasServiceRole = userRoles.some(r => rolesToCheck.includes(r));

      if (hasServiceRole) {
        next();
        return;
      }

      // --- Priority 2: Detect cross-service roles → DENY ---
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
