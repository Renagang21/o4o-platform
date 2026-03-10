/**
 * Membership-aware Service Scope Guard
 * WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1
 *
 * Wraps createServiceScopeGuard to add membership status verification.
 * Drop-in replacement: same API surface, same behavior + membership check.
 *
 * Chain: requireAuth → [membership check → scope check] → handler
 *
 * - security-core 수정 없음 (Frozen F1 준수)
 * - platform:super_admin은 platformBypass 설정에 따라 멤버십 검사 생략
 * - 멤버십 없음 → 403 MEMBERSHIP_NOT_FOUND
 * - 멤버십 비활성 → 403 MEMBERSHIP_NOT_ACTIVE
 * - 멤버십 active → 기존 scope guard로 위임
 */

import type { RequestHandler } from 'express';
import { createServiceScopeGuard } from '@o4o/security-core';
import type { ServiceScopeGuardConfig } from '@o4o/security-core';

// Scope guard serviceKey → service_memberships.service_key 매핑
// 대부분 동일하지만, 일부 서비스는 다른 키를 사용
const SCOPE_TO_MEMBERSHIP_KEY: Record<string, string> = {
  'kpa': 'kpa-society',
  'cosmetics': 'k-cosmetics',
};

function resolveMembershipKey(scopeServiceKey: string): string {
  return SCOPE_TO_MEMBERSHIP_KEY[scopeServiceKey] || scopeServiceKey;
}

/**
 * Create a membership-aware scope guard factory.
 *
 * Same signature as createServiceScopeGuard: returns (scope: string) => RequestHandler
 * Adds membership status check before delegating to the original scope guard.
 */
export function createMembershipScopeGuard(
  config: ServiceScopeGuardConfig
): (scope: string) => RequestHandler {
  const originalGuard = createServiceScopeGuard(config);
  const membershipKey = resolveMembershipKey(config.serviceKey);

  return function requireScope(scope: string): RequestHandler {
    const scopeHandler = originalGuard(scope);

    return (req, res, next) => {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          success: false, error: 'Authentication required', code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Platform super_admin bypass (if config allows)
      if (config.platformBypass && user.roles?.includes('platform:super_admin')) {
        return scopeHandler(req, res, next);
      }

      // Check service membership from JWT payload
      const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
      const membership = memberships.find((m: { serviceKey: string }) => m.serviceKey === membershipKey);

      if (!membership) {
        res.status(403).json({
          success: false,
          error: `No membership found for service: ${config.serviceKey}`,
          code: 'MEMBERSHIP_NOT_FOUND',
        });
        return;
      }

      if (membership.status !== 'active') {
        res.status(403).json({
          success: false,
          error: `Service membership is ${membership.status}. Active membership required.`,
          code: 'MEMBERSHIP_NOT_ACTIVE',
        });
        return;
      }

      // Membership active → delegate to original scope guard
      return scopeHandler(req, res, next);
    };
  };
}
