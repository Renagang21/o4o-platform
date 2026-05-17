/**
 * KPA Society — Post-Login Redirect Config
 *
 * WO-O4O-KPA-DASHBOARD-REDIRECT-UNIFICATION-V1
 *
 * 로그인 후 역할 기반 기본 진입 화면 정의.
 *
 * KPA PRIORITY 정책 (높은 권한 우선):
 *   platform:super_admin / kpa:admin → /admin
 *   kpa:operator            → /operator
 *   kpa:store_owner         → /store
 *   kpa:pharmacist / kpa:student / 없음 → null (현재 화면 유지, 커뮤니티 철학)
 *
 * 참고: GlycoPharm/K-Cosmetics는 LoginPage.tsx에서 getXxxDashboardRoute()로 처리 완료.
 *       KPA만 모달 로그인 구조여서 별도 처리 필요.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import type { User } from '../contexts/AuthContext';

/** 역할 우선순위 — 다중 역할 보유 시 첫 번째 매칭 역할이 redirect 결정 */
export const KPA_ROLE_PRIORITY = [
  'platform:super_admin',
  'kpa:admin',
  'kpa:operator',
  'lms:instructor',   // operator 다음, store_owner 전 (전문직 역할)
  'kpa:store_owner',
  'kpa:pharmacist',
  'kpa:student',
] as const;

/** 역할 → 진입 경로 매핑 */
export const KPA_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'kpa:admin':            '/admin',
  'kpa:operator':         '/operator',
  'lms:instructor':       '/instructor',
  'kpa:store_owner':      '/store',
  'kpa:pharmacist':       '/mypage',
  'kpa:student':          '/mypage',
};

/**
 * 로그인 직후 이동해야 할 경로를 반환.
 * null → 현재 화면 유지 (커뮤니티 철학 — 일반 회원은 보던 화면에서 계속)
 */
export function getKpaPostLoginRoute(user: User): string | null {
  const roles = user.roles ?? [];

  // PRIORITY+MAP 기반 redirect 결정 (operator+store_owner 동시 보유 시 operator 우선)
  const route = getPrimaryDashboardRoute(roles, KPA_ROLE_PRIORITY, KPA_DASHBOARD_MAP);

  // 매핑 없음(빈 배열 등) → '/' 반환됨 → null로 통일 (현재 화면 유지)
  if (!route || route === '/') {
    // WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1 (Phase 2):
    //   store_owner 활성 여부 canonical source = role_assignments (user.isStoreOwner 로 파생).
    //   activity_type === 'pharmacy_owner' 단독 판단 제거 — 직역 (profile metadata) 은
    //   capability 가 아님. JWT roles stale 시 isStoreOwner (me-context) 가 safety net.
    if (user.isStoreOwner) {
      return '/store';
    }
    return null;
  }

  // /mypage는 명시적 이동보다 현재 화면 유지가 커뮤니티 철학에 맞음
  if (route === '/mypage') return null;

  return route;
}
