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
 * 없다. 그래서 서비스 전체 역할(`community:operator` 또는 `community:admin`)이 심사한다.
 *
 * 서비스 Admin/Operator는 개설 심사와 독립 커뮤니티 운영을 담당한다. 개체 운영자 역할도 유지한다.
 */
import { createSubdomainOperatorScope } from './subdomain-operator-scope.js';

const { config, guard } = createSubdomainOperatorScope('community', [
  'kpa', 'neture', 'cosmetics', 'pharmacy-hub', 'lms', 'lecture',
]);

export const COMMUNITY_SCOPE_CONFIG = config;
export const requireCommunityServiceScope = guard;
