/**
 * RoleGuard — GlycoPharm 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed JWT roles 직접 사용
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   판정 순서를 @o4o/auth-react 의 createRouteGuard 로 위임. GlycoPharm 고유분은
 *   로딩 스피너 · MembershipGate · OperatorRoute 의 역할 술어뿐이다.
 *
 * GlycoPharm 전용 Guard(GlycoHubGuard / PharmacyStoreGuard)는 이번 WO 범위 밖이며 그대로 둔다.
 */

import type { ReactNode } from 'react';
import { isOperatorOrAbove } from '@o4o/auth-utils';
import { createRouteGuard } from '@o4o/auth-react';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';
import { AccessDenied } from './AccessDenied';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

export const RoleGuard = createRouteGuard({
  useAuth,
  renderLoading: () => <LoadingSpinner />,
  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   기존 무안내 '/' redirect 를 안내 화면으로 교체(판정 무변경).
  renderDenied: ({ message }) => <AccessDenied message={message} />,
  deniedRedirect: '/',
  MembershipGate,
});

/**
 * OperatorRoute — service_memberships 기반 Operator 접근 제어
 *
 * WO-O4O-OPERATOR-VISIBILITY-UNIFICATION-V1
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed JWT roles 직접 사용
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
 *   - 기존 missing-membership 시 Navigate("/") 동작을 MembershipGate 의
 *     상태별 안내 화면으로 대체 (none/pending/rejected/suspended/withdrawn 별 메시지).
 *   - Platform super_admin 만 bypass — service-prefixed role(glycopharm:admin 등) 도
 *     membership 검사를 거친다 (role 만 있고 membership 없는 케이스 차단).
 *
 * role 체크: glycopharm:admin / glycopharm:operator / platform:super_admin 중 하나 필요.
 * WO-O4O-ROLEGUARD-RUNTIME-CANONICALIZATION-V1: isOperatorOrAbove(@o4o/auth-utils) 사용 —
 * canonical 화 규칙이 들어간 술어라 배열로 펼치지 않고 isAllowed 로 주입한다.
 */
export function OperatorRoute({ children, fallback = '/login' }: { children: ReactNode; fallback?: string }) {
  return (
    <RoleGuard isAllowed={(roles) => isOperatorOrAbove(roles, 'glycopharm')} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
