/**
 * KPA Society — Post-Login Redirect Config
 *
 * WO-O4O-KPA-DASHBOARD-REDIRECT-UNIFICATION-V1
 * WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1
 * WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1 (현행)
 *
 * 로그인 후 역할 기반 기본 진입 화면 정의.
 *
 * KPA PRIORITY 정책 (높은 권한 우선):
 *   platform:super_admin / kpa:admin → /admin
 *   kpa:operator                     → /operator
 *   kpa:store_owner                  → /store (내 약국 — O4O 공통 철학 정렬)
 *   그 외 (lms:instructor, kpa:pharmacist, kpa:student, 없음)
 *     → null (메인/커뮤니티 유지)
 *
 * O4O 공통 철학 정렬 (WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1):
 *   KPA 는 O4O 의 예외 서비스가 아니다. 약국 경영자(store_owner)는 GlycoPharm/K-Cosmetics
 *   와 동일하게 로그인 직후 내 약국(/store)을 기본 시작 화면으로 본다.
 *   본 변경은 WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1 의 "store_owner 도 커뮤니티 Home 유지"
 *   결정을 supersede 한다. (선행 IR: IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1,
 *   IR-O4O-KPA-STOREOWNER-AUTO-STORE-ACCESS-FLOW-AUDIT-V1 — 별도 사용승인 게이트 없음 확인.)
 *   강사 대시보드(/instructor)는 여전히 메뉴에서 직접 진입한다.
 *   일반 회원/약사/약대생은 기존처럼 메인/커뮤니티를 유지한다.
 *   공개 Home("/") 구조는 변경하지 않는다.
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
 *   - kpa:admin / kpa:operator 는 운영 화면 자동 진입 정책 유지.
 *
 * WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1 (현행):
 *   - kpa:store_owner 재포함 — 로그인 직후 /store(내 약국) 자동 진입.
 *     우선순위는 운영 역할(super_admin/admin/operator)보다 낮게 둔다.
 *     → 운영자/관리자 겸 약국주는 기존대로 /operator·/admin 우선(다중역할 안전).
 *     → 일반 회원/약사/약대생보다는 높다(PRIORITY 미포함 역할은 자동 이동 없음).
 */
export const KPA_ROLE_PRIORITY = [
  'platform:super_admin',
  'kpa:admin',
  'kpa:operator',
  'kpa:store_owner',
] as const;

/**
 * 역할 → 진입 경로 매핑.
 *
 * PRIORITY 에 포함된 역할만 자동 redirect 대상.
 * 그 외 역할(instructor, pharmacist, student)은 메뉴에서 직접 진입.
 */
export const KPA_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'kpa:admin':            '/admin',
  'kpa:operator':         '/operator',
  'kpa:store_owner':      '/store',
};

/**
 * 로그인 직후 이동해야 할 경로를 반환.
 * null → 현재 화면 유지 (커뮤니티 철학 — 일반 회원/약사/약대생은 메인/커뮤니티 유지)
 *
 * super_admin/admin → /admin, operator → /operator, store_owner → /store.
 * PRIORITY 미포함 역할(instructor/pharmacist/student/없음)은 null.
 */
export function getKpaPostLoginRoute(user: User): string | null {
  const roles = user.roles ?? [];

  // PRIORITY+MAP 기반 redirect 결정 — 운영자/관리자/약국 경영자만 자동 이동.
  const route = getPrimaryDashboardRoute(roles, KPA_ROLE_PRIORITY, KPA_DASHBOARD_MAP);

  // 자동 이동 대상 역할 없음 → 현재 화면 유지 (메인/커뮤니티).
  // instructor / pharmacist / student 는 모두 이 경로로 진입한다.
  if (!route || route === '/') {
    return null;
  }

  return route;
}
