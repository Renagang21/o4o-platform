/**
 * @o4o/auth-react — 서비스 프런트 공통 React 인증 계층
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * 계층 분리:
 *   @o4o/auth-client  — transport (AuthClient, 토큰 저장/갱신)
 *   @o4o/auth-utils   — 순수 판정·정규화 함수 (hasAnyRole, parseAuthResponse, buildPlatformUser …)
 *   @o4o/auth-react   — **React 런타임** (세션 복구/로그인 상태 전환/RouteGuard)   ← 이 패키지
 *   @o4o/auth-context — admin-dashboard 전용 (AdminProtectedRoute·SSO/Cookie Provider). 건드리지 않는다.
 *
 * 계약은 KPA-Society ∩ Neture 최소 공통집합이며, 서비스 고유 상태·행동은 주입/합성으로 표현한다.
 * 이 패키지 안에 서비스명 조건문을 두지 않는다.
 */

export { useServiceAuth } from './useServiceAuth';
export { createRouteGuard } from './createRouteGuard';
export { useRoleSelection } from './useRoleSelection';
export type {
  AuthLoginResult,
  AuthClientLike,
  ServiceAuthConfig,
  ServiceAuthCore,
} from './types';
export type { RouteGuardDeps, RouteGuardProps, GuardAuthState } from './createRouteGuard';
export type { RoleSelection } from './useRoleSelection';
