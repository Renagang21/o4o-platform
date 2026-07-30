/**
 * Pharmacy-Hub Service Scope Guard
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 구조는 기존 서비스(glycopharm / cosmetics)와 동일하다:
 *   requireAuth → createMembershipScopeGuard(config)
 *     = service_memberships(user_id, 'pharmacy-hub').status = 'active'
 *       + prefixed role/scope 검사 (기본 DENY)
 *
 * 왜 config 를 @o4o/security-core/service-configs.ts 가 아니라 여기에 두는가:
 *   security-core 는 F1 (Operator OS) Freeze 대상이다. 본 Foundation 에서 shared
 *   패키지 변경은 `ServiceKey` union 확장(type-only) 하나로 제한했다. 이 config 의
 *   유일한 소비처는 api-server 이므로 로컬 정의로 충분하며, 향후 다른 패키지가
 *   소비하게 되면 그때 별도 WO 로 security-core 로 승격한다.
 *
 * 기존 서비스 guard 는 수정하지 않는다:
 *   scope guard 는 기본 DENY 이므로 다른 서비스의 blockedServicePrefixes 에
 *   'pharmacy-hub' 를 추가하지 않아도 pharmacy-hub 역할로 타 서비스에 접근할 수 없다.
 *   (WO §5 stop condition — 기존 서비스 의미 변경 회피)
 */

import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

/**
 * Pharmacy-Hub scope 설정
 *
 * platformBypass: true — 조직 격리(KPA 스타일)가 아닌 서비스이므로
 *   platform:super_admin 은 접근 가능하다.
 *
 * scopeRoleMapping: operator 는 store_owner/supplier scope 를 대신 통과하지 않는다.
 *   운영자는 가입 승인·회원 관리·커뮤니티·공지 담당이며, 공급자 ↔ 약국 간
 *   일반 상품 거래에 개입하지 않는다 (WO §3 구조 원칙).
 */
export const PHARMACY_HUB_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'pharmacy-hub',
  allowedRoles: [
    'pharmacy-hub:operator',
    'pharmacy-hub:store_owner',
    'pharmacy-hub:supplier',
  ],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'glycopharm', 'cosmetics'],
  scopeRoleMapping: {
    'pharmacy-hub:operator': ['pharmacy-hub:operator'],
    'pharmacy-hub:store_owner': ['pharmacy-hub:store_owner'],
    'pharmacy-hub:supplier': ['pharmacy-hub:supplier'],
  },
};

/**
 * Pharmacy-Hub scope guard
 *
 * @example
 * router.get('/operator/ping', requireAuth, requirePharmacyHubScope('pharmacy-hub:operator'), handler);
 */
export const requirePharmacyHubScope = createMembershipScopeGuard(PHARMACY_HUB_SCOPE_CONFIG);
