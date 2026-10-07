/**
 * Community **서비스 전체** 운영 경계 — 개설 신청 심사 주체
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3-3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 개체 경계(`community-scope.middleware.ts`)와 다른 축이다.
 *
 *   requireCommunityScope        개별 커뮤니티 안의 권한 — `community_memberships`
 *   requireCommunityServiceScope 커뮤니티 **서비스 전체** 권한 — `role_assignments`
 *
 * 개설 신청 심사는 아직 어떤 커뮤니티에도 속하지 않은 요청을 다루므로 개체 경계로 판정할 수
 * 없다. 그래서 서비스 전체 역할(`community:admin`)이 심사한다.
 *
 * `community:operator` 를 **만들지 않았다**. 개별 커뮤니티 운영은 개체 역할(operator
 * membership)로만 하며, 전역 operator 를 두면 A 커뮤니티 운영자가 B 커뮤니티를 운영하게 된다
 * (분회에서 `kpa-branch:operator` 가 전역 역할이어서 생긴 문제와 같다 — WO §5).
 */
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const COMMUNITY_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'community',
  allowedRoles: ['community:admin'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'cosmetics', 'pharmacy-hub', 'lms', 'lecture'],
  // mapping 이 비면 allowedRoles 전체로 fallback 하므로 명시한다.
  scopeRoleMapping: {
    'community:admin': ['community:admin'],
  },
};

export const requireCommunityServiceScope = createMembershipScopeGuard(COMMUNITY_SCOPE_CONFIG);
