/**
 * KPA Society — Post-Login Redirect Config
 *
 * WO-O4O-KPA-DASHBOARD-REDIRECT-UNIFICATION-V1
 * WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1
 *
 * 로그인 후 역할 기반 기본 진입 화면 정의.
 *
 * KPA PRIORITY 정책 (높은 권한 우선):
 *   platform:super_admin / kpa:admin → /admin
 *   kpa:operator                     → /operator
 *   그 외 (lms:instructor, kpa:store_owner, kpa:pharmacist, kpa:student, 없음)
 *     → null (메인/커뮤니티 유지)
 *
 * 강사 대시보드(/instructor)·약국 운영(/store) 등은 메뉴에서 직접 진입한다.
 * 자동 리다이렉트는 운영자/관리자 권한에만 적용된다.
 *
 * 참고: GlycoPharm/K-Cosmetics는 LoginPage.tsx에서 getXxxDashboardRoute()로 처리 완료.
 *       KPA만 모달 로그인 구조여서 별도 처리 필요.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import type { User } from '../contexts/AuthContext';

/**
 * 역할 우선순위 — 다중 역할 보유 시 첫 번째 매칭 역할이 redirect 결정.
 *
 * WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1:
 *   - lms:instructor 제거 — 강사 대시보드는 메뉴에서 직접 진입한다.
 *     (약국 경영자 + 강사 / 일반 강사 모두 메인/커뮤니티 유지)
 *   - kpa:store_owner 제거 — 약국 경영자도 메인/커뮤니티 유지.
 *     /store 는 GlobalHeader/StoreHub 메뉴에서 직접 진입.
 *   - kpa:admin / kpa:operator 는 운영 화면 자동 진입 정책 유지.
 */
export const KPA_ROLE_PRIORITY = [
  'platform:super_admin',
  'kpa:admin',
  'kpa:operator',
] as const;

/**
 * 역할 → 진입 경로 매핑.
 *
 * PRIORITY 에 포함된 운영 역할만 자동 redirect 대상.
 * 그 외 역할(instructor, store_owner, pharmacist, student)은 메뉴에서 직접 진입.
 */
export const KPA_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'kpa:admin':            '/admin',
  'kpa:operator':         '/operator',
};

/**
 * 로그인 직후 이동해야 할 경로를 반환.
 * null → 현재 화면 유지 (커뮤니티 철학 — 일반 회원/강사/약국 경영자는 메인/커뮤니티 유지)
 */
export function getKpaPostLoginRoute(user: User): string | null {
  const roles = user.roles ?? [];

  // PRIORITY+MAP 기반 redirect 결정 — 운영자/관리자만 자동 이동.
  const route = getPrimaryDashboardRoute(roles, KPA_ROLE_PRIORITY, KPA_DASHBOARD_MAP);

  // 운영 역할 없음 → 현재 화면 유지 (메인/커뮤니티).
  // store_owner / instructor / pharmacist / student 는 모두 이 경로로 진입한다.
  if (!route || route === '/') {
    return null;
  }

  return route;
}
