/**
 * RoleGuard — KPA Society 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * WO-KPA-OPERATOR-AUTH-QUICK-FIX-PHASE1-V1: accessDeniedMessage prop 추가
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   판정 순서(로딩 → 미인증 → 역할 → membership)를 @o4o/auth-react 의 createRouteGuard 로 위임.
 *   KPA 고유분(로딩 문구 · 권한없음 안내 · MembershipGate)만 주입으로 남는다.
 *
 * KPA는 user.roles[] 배열 기반 역할 체크.
 * 단순 역할 체크용 — 분회 소유권 검증은 KPA 전용 Guard 를 사용한다.
 * (KPA 전용 Guard: AdminAuthGuard / HubGuard / PharmacyGuard / PharmacyOwnerOnlyGuard /
 *  PharmacistOnlyGuard — 이번 WO 에서 통합하지 않는다.)
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   KPA 로컬 AccessDeniedCard 를 공통 @o4o/ui AccessDenied 로 교체. 표시 계약만 변경한다.
 *
 * accessDeniedMessage가 지정되면 역할 불일치 시 에러 카드를 표시.
 * 미지정이면 기존처럼 `/`로 리다이렉트 (하위호환).
 */

import { createRouteGuard } from '@o4o/auth-react';
import { AccessDenied, ACCESS_DENIED_MESSAGE } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';

export { ACCESS_DENIED_MESSAGE };

export const RoleGuard = createRouteGuard({
  useAuth,
  renderLoading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
    </div>
  ),
  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   기존에는 message 가 없으면 null 을 돌려 Core 가 무안내 deniedRedirect('/') 로 보냈다.
  //   accessDeniedMessage 미지정 route(법무/감사로그/역할관리 등)도 안내 화면을 받도록
  //   기본 문구로 대체한다. 판정 순서·권한 계약은 변경하지 않는다.
  renderDenied: ({ message }) => <AccessDenied message={message || ACCESS_DENIED_MESSAGE} />,
  deniedRedirect: '/',
  MembershipGate,
});
