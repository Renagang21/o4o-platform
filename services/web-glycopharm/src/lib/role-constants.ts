/**
 * GlycoPharm Role Constants
 *
 * WO-O4O-GLYCOPHARM-MENU-KPA-ALIGNMENT-V1:
 * AuthContext에서 분리 — 역할 상수만 담당
 */

// GlycoPharm role constants — DB에 실제 저장되는 값과 일치
// WO-GLYCOPHARM-PHARMACY-ROLE-FINAL-CLEANUP-V1: PHARMACY 제거, PHARMACIST 단일 기준
//
// WO-GLYCOPHARM-STORE-GUARD-SERVICE-AWARE-FIX-V1:
//   GlycoPharm 도메인에서 매장 경영자 = 약사(PHARMACIST). backend store_owner 가드도
//   glycopharm 서비스에서는 PHARMACIST 와 STORE_OWNER 둘 다 인정한다 (store-owner.utils.ts 참조).
//   STORE_OWNER alias 는 향후 명시적 store_owner role 운영 시 사용. 현 시점 alias 만 추가.
export const GLYCOPHARM_ROLES = {
  ADMIN: 'glycopharm:admin',
  OPERATOR: 'glycopharm:operator',
  PHARMACIST: 'glycopharm:pharmacist',
  /** Backend STORE_OWNER_ROLES_BY_SERVICE['glycopharm'] 와 정합 — alias for forward compat */
  STORE_OWNER: 'glycopharm:store_owner',
  SUPPLIER: 'supplier',
  CONSUMER: 'customer',
  PLATFORM_SUPER_ADMIN: 'platform:super_admin',
  // WO-O4O-INSTRUCTOR-DASHBOARD-ENTRY-V1
  LMS_INSTRUCTOR: 'lms:instructor',
} as const;

/** 약사 역할 확인 헬퍼 — glycopharm:pharmacist 단일 기준 */
export function isPharmacistRole(role: string): boolean {
  return role === GLYCOPHARM_ROLES.PHARMACIST;
}

export const ROLE_LABELS: Record<string, string> = {
  [GLYCOPHARM_ROLES.ADMIN]: '관리자',
  [GLYCOPHARM_ROLES.PHARMACIST]: '약사',
  [GLYCOPHARM_ROLES.SUPPLIER]: '공급자',
  [GLYCOPHARM_ROLES.OPERATOR]: '운영자',
  [GLYCOPHARM_ROLES.CONSUMER]: '소비자',
  [GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN]: '슈퍼관리자',
};

export const ROLE_ICONS: Record<string, string> = {
  [GLYCOPHARM_ROLES.ADMIN]: '👑',
  [GLYCOPHARM_ROLES.PHARMACIST]: '💊',
  [GLYCOPHARM_ROLES.SUPPLIER]: '📦',
  [GLYCOPHARM_ROLES.OPERATOR]: '🛡️',
  [GLYCOPHARM_ROLES.CONSUMER]: '👤',
  [GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN]: '👑',
};
