/**
 * 서브도메인 전체 운영자 경계 — 공통 구성
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `supplier` · `funding` 의 경계는 키 이름만 다르고 구조가 같았다. 두 파일로 두면
 *   ① 같은 코드가 두 벌 남고(SonarCloud 중복)
 *   ② `scopeRoleMapping` 을 한쪽만 고쳐 **admin 전용 경로가 operator 에게 열리는** 종류의
 *      실수가 조용히 들어온다 — mapping 이 비면 `allowedRoles` 전체로 fallback 한다.
 * 그래서 구성을 한 곳에서 만든다.
 *
 * 커뮤니티 서비스도 Admin/Operator 계층을 공유한다. 개별 커뮤니티 운영 권한은 별도 개체 경계다.
 */
import type { ServiceKey, ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

/** 다른 서비스 접두를 차단하는 공통 목록 — 새 서브도메인이 늘어도 같은 값을 쓴다. */
const BLOCKED_PREFIXES = ['kpa', 'cosmetics', 'pharmacy-hub', 'lms', 'lecture', 'community'] as const;

/**
 * `{key}:admin` ⊃ `{key}:operator` 2계층 경계.
 *
 * `platformBypass: true` — 조직 격리형이 아니라 독립 서브도메인이므로 `platform:super_admin`
 * 은 통과한다. 그래서 역할을 부여하기 전에도 전면 잠금이 발생하지 않는다.
 */
export function createSubdomainOperatorScope(serviceKey: ServiceKey, blockedPrefixes: readonly string[] = BLOCKED_PREFIXES) {
  const config: ServiceScopeGuardConfig = {
    serviceKey,
    allowedRoles: [`${serviceKey}:admin`, `${serviceKey}:operator`],
    platformBypass: true,
    legacyRoles: [],
    blockedServicePrefixes: blockedPrefixes.filter((p) => p !== serviceKey),
    // 비우면 allowedRoles 전체로 fallback 하므로 항상 채운다.
    scopeRoleMapping: {
      [`${serviceKey}:admin`]: [`${serviceKey}:admin`],
      [`${serviceKey}:operator`]: [`${serviceKey}:operator`, `${serviceKey}:admin`],
    },
  };
  return { config, guard: createMembershipScopeGuard(config) };
}
