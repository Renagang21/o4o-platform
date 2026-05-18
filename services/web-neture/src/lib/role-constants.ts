/**
 * Neture Role Constants — SSOT
 *
 * WO-NETURE-ROLE-CONSTANTS-SEPARATION-V1
 *
 * 기존 RoleGuard.tsx 내 inline 정의를 분리한 것.
 * 기능 동작 변경 없음.
 */

// ─── Role Strings ──────────────────────────────────────────────────────────

export const NETURE_ROLES = {
  PLATFORM_SUPER_ADMIN: 'platform:super_admin',
  ADMIN: 'neture:admin',
  OPERATOR: 'neture:operator',
  SUPPLIER: 'neture:supplier',
  PARTNER: 'neture:partner',
  SELLER: 'neture:seller',
} as const;

/**
 * Legacy 미접두사 역할 — 가입 시 접두사 없이 저장됨.
 * 후속 WO-NETURE-LEGACY-ROLE-MIGRATION-V1에서 neture: 접두사로 전환 예정.
 * 이번 작업에서는 제거하지 않고 상수로만 명시한다.
 */
export const LEGACY_ROLES = {
  SUPPLIER: 'supplier',
  PARTNER: 'partner',
  SELLER: 'seller',
} as const;

// ─── Role Group Arrays ─────────────────────────────────────────────────────

/** Admin 역할 집합 (admin + platform:super_admin) */
export const ADMIN_ROLES: string[] = [NETURE_ROLES.ADMIN, NETURE_ROLES.PLATFORM_SUPER_ADMIN];

/** Operator route guard 역할 집합 */
export const OPERATOR_ROLES: string[] = [NETURE_ROLES.OPERATOR];

/**
 * Operator-or-above 역할 집합 — UI 가시성 체크용.
 * operator + admin + platform:super_admin
 */
export const OPERATOR_OR_ABOVE_ROLES: string[] = [
  NETURE_ROLES.OPERATOR,
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
];

/**
 * Supplier route guard 역할 집합.
 * legacy 미접두사(supplier/partner/seller) 포함 — SupplierRoute는 B2B 전체 커버.
 */
export const SUPPLIER_ROLES: string[] = [
  NETURE_ROLES.SUPPLIER,
  LEGACY_ROLES.SUPPLIER,
  LEGACY_ROLES.PARTNER,
  LEGACY_ROLES.SELLER,
];

/** Supplier-only 역할 집합 — UI 가시성용 (isSupplier 체크) */
export const SUPPLIER_ONLY_ROLES: string[] = [NETURE_ROLES.SUPPLIER, LEGACY_ROLES.SUPPLIER];

/** Partner-only 역할 집합 — UI 가시성용 (isPartner 체크) */
export const PARTNER_ONLY_ROLES: string[] = [NETURE_ROLES.PARTNER, LEGACY_ROLES.PARTNER];

/** Supplier 레이아웃 접근 역할 (supplier + admin) */
export const SUPPLIER_ACCESS_ROLES: string[] = [
  NETURE_ROLES.SUPPLIER,
  LEGACY_ROLES.SUPPLIER,
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
];

/** Partner 레이아웃 접근 역할 (partner + admin) */
export const PARTNER_ACCESS_ROLES: string[] = [
  NETURE_ROLES.PARTNER,
  LEGACY_ROLES.PARTNER,
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
];

/** Supplier Hub 접근 역할 (supplier + partner + admin) */
export const SUPPLIER_HUB_ACCESS_ROLES: string[] = [
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
  NETURE_ROLES.SUPPLIER,
  LEGACY_ROLES.SUPPLIER,
  NETURE_ROLES.PARTNER,
  LEGACY_ROLES.PARTNER,
];

/** Dashboard B2B 역할 — legacy 미접두사 (AccountMenu hasDashboardRole 체크용) */
export const DASHBOARD_B2B_ROLES: string[] = [
  LEGACY_ROLES.SUPPLIER,
  LEGACY_ROLES.PARTNER,
  LEGACY_ROLES.SELLER,
];
