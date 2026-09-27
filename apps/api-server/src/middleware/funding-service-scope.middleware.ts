/**
 * 유통참여형 펀딩 **서브도메인 전체 운영자** 경계 — `funding.neture.co.kr`
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4
 *
 * 「유통참여형 펀딩」은 플랫폼 공통 제품명(market-trial)이다. 종전에는 이 영역의 운영자
 * 경계가 `requireNetureScope('neture:operator')` 여서 **Neture 운영자 하나가 이 서브도메인까지
 * 열었다.** 주소가 독립이면 운영자 범위도 독립이어야 한다.
 *
 * 펀딩 참여자(매장)의 참여 자격은 이 축이 아니다 — 기존 market-trial 참여 계약 그대로다.
 * 여기서 분리하는 것은 **운영자 권한**뿐이다.
 */
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const FUNDING_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'funding',
  allowedRoles: ['funding:admin', 'funding:operator'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'cosmetics', 'pharmacy-hub', 'lms', 'lecture', 'community'],
  scopeRoleMapping: {
    'funding:admin': ['funding:admin'],
    'funding:operator': ['funding:operator', 'funding:admin'],
  },
};

export const requireFundingScope = createMembershipScopeGuard(FUNDING_SCOPE_CONFIG);
