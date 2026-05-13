/**
 * KPA Society — Post-Login Redirect Config
 *
 * WO-O4O-ROLE-BASED-POST-LOGIN-REDIRECT-V1
 *
 * 로그인 후 역할 기반 기본 진입 화면 정의.
 *
 * KPA 정책:
 *   - 약국 경영자(isStoreOwner / activityType=pharmacy_owner) → /store
 *   - 운영자/관리자(kpa:operator / kpa:admin / platform:super_admin) → 기존 흐름 유지 (redirect 없음)
 *   - 일반 회원 → 현재 화면 유지 (커뮤니티 철학 보존)
 *
 * 참고: GlycoPharm/K-Cosmetics는 LoginPage.tsx에서 getXxxDashboardRoute()로 처리 완료.
 *       KPA만 모달 로그인 구조여서 별도 처리 필요.
 */

import type { User } from '../contexts/AuthContext';

/** 운영자/관리자 권한 여부 */
export function isKpaPrivilegedUser(user: User): boolean {
  return user.roles?.some((r) =>
    r.includes(':operator') || r.includes(':admin') || r === 'platform:super_admin',
  ) ?? false;
}

/**
 * 로그인 직후 이동해야 할 경로를 반환.
 * null → 현재 화면 유지 (redirect 없음)
 */
export function getKpaPostLoginRoute(user: User): string | null {
  // 운영자/관리자: 기존 흐름 유지
  if (isKpaPrivilegedUser(user)) return null;

  // 약국 경영자: 내 약국(매장) 화면으로
  if (user.isStoreOwner || user.activityType === 'pharmacy_owner') {
    return '/store';
  }

  // 일반 회원: 현재 화면 유지
  return null;
}
