/**
 * createRouteGuard — 서비스 프런트 일반 RouteGuard Core
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * KPA·Neture·K-Cosmetics·GlycoPharm 의 일반 RoleGuard 는 판정 순서가 **동일**했다:
 *
 *   1) isLoading            → 로딩 표시
 *   2) !isAuthenticated     → Navigate(fallback, state.from)   ← 로그인 후 복귀 경로 보존
 *   3) allowedRoles 불충족  → 접근 거부 처리
 *   4) membership 강제      → MembershipGate 위임
 *
 * 다른 것은 **렌더링과 정책**뿐이라 전부 주입으로 뺐다:
 *   - 로딩 UI (서비스 테마: 스피너 vs 텍스트)
 *   - 접근 거부 렌더 (`/` 리다이렉트 vs 카드) — KPA `accessDeniedMessage` 계약 보존
 *   - MembershipGate 컴포넌트 (이번 WO 에서 통합하지 않는다 — 주입만)
 *   - redirectMap (Neture 전용: 역할별 선행 리다이렉트)
 *
 * KPA 전용 Guard(PharmacyGuard/HubGuard 등)와 GlycoPharm 전용 Guard 는 이 WO 범위 밖이며
 * 여기서 대체하지 않는다.
 */

import type { ComponentType, ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasAnyRole } from '@o4o/auth-utils';

/** Guard 가 useAuth() 에서 읽는 최소 표면. */
export interface GuardAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { roles?: string[] } | null;
}

export interface RouteGuardDeps {
  /** 서비스의 useAuth 훅. */
  useAuth: () => GuardAuthState;
  /** 로딩 중 렌더. 미지정 시 아무것도 그리지 않는다(레이아웃 점프 방지는 서비스 책임). */
  renderLoading?: () => ReactElement | null;
  /**
   * role 불충족 시 렌더. 미지정 시 `deniedRedirect`(기본 '/')로 이동.
   * KPA 는 `accessDeniedMessage` 가 있을 때 카드로 그리므로 여기에 그 분기를 넣는다.
   */
  renderDenied?: (opts: { message?: string }) => ReactElement | null;
  /** role 불충족 기본 이동 경로. */
  deniedRedirect?: string;
  /**
   * membership 강제용 래퍼. 미지정 시 membership 검사를 하지 않는다.
   * 서비스별 MembershipGate 를 그대로 주입한다(이번 WO 에서 통합하지 않음).
   */
  MembershipGate?: ComponentType<{ serviceKey?: string; children: ReactNode }>;
}

export interface RouteGuardProps {
  children: ReactNode;
  /** 하나라도 포함하면 통과. 미지정 시 role 검사를 건너뛴다(인증만 요구). */
  allowedRoles?: string[];
  /** 미인증 시 이동 경로. */
  fallback?: string;
  /** 지정 시 role 불충족에서 리다이렉트 대신 안내 렌더(KPA 계약). */
  accessDeniedMessage?: string;
  /** membership 강제 여부(기본 true — MembershipGate 주입 시에만 의미). */
  enforceMembership?: boolean;
  /** MembershipGate 에 전달할 canonical serviceKey(Neture `requireMembership` 계약). */
  membershipServiceKey?: string;
  /** 역할별 선행 리다이렉트(Neture 계약). allowedRoles 검사 **전에** 실행된다. */
  redirectMap?: Record<string, string>;
}

/**
 * 서비스별 RouteGuard 를 만든다.
 * 반환된 컴포넌트가 곧 그 서비스의 `RoleGuard`/`RouteGuard` 본체가 된다.
 */
export function createRouteGuard(deps: RouteGuardDeps) {
  const {
    useAuth,
    renderLoading,
    renderDenied,
    deniedRedirect = '/',
    MembershipGate,
  } = deps;

  return function RouteGuard({
    children,
    allowedRoles,
    fallback = '/login',
    accessDeniedMessage,
    enforceMembership = true,
    membershipServiceKey,
    redirectMap,
  }: RouteGuardProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
      return renderLoading ? renderLoading() : null;
    }

    if (!isAuthenticated || !user) {
      // 로그인 후 원래 가려던 곳으로 돌아갈 수 있도록 from 을 유지한다(4개 서비스 공통 동작).
      return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
    }

    const userRoles = user.roles ?? [];

    // 역할별 선행 리다이렉트 — role 검사보다 먼저(예: admin 이 /operator 진입 시 /admin 으로).
    if (redirectMap) {
      for (const [role, path] of Object.entries(redirectMap)) {
        if (userRoles.includes(role)) {
          return <Navigate to={path} replace />;
        }
      }
    }

    if (allowedRoles && !hasAnyRole(userRoles, allowedRoles)) {
      if (renderDenied) {
        const denied = renderDenied({ message: accessDeniedMessage });
        if (denied !== null) return denied;
      }
      return <Navigate to={deniedRedirect} replace />;
    }

    if (enforceMembership && MembershipGate) {
      return <MembershipGate serviceKey={membershipServiceKey}>{children}</MembershipGate>;
    }

    return <>{children}</>;
  };
}
