/**
 * Security Core Types
 *
 * Platform-wide security type definitions.
 */

/** All known service keys in the O4O platform */
export type ServiceKey =
  | 'kpa'
  | 'neture'
  | 'cosmetics'
  | 'platform'
  // WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1: Pharmacy-Hub (파머시 허브).
  //   type-only 확장(union 확대). 기존 5 키의 동작·설정은 변경하지 않는다.
  //   role prefix === service_memberships.service_key (self-map) 이므로
  //   ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY 항목 추가는 불필요하다.
  | 'pharmacy-hub'
  // WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 1: self-map service type-only 확장.
  | 'lecture'
  // WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1: 약사회 분회 서비스.
  //   type-only 확장(union 확대). 기존 키의 동작·설정은 변경하지 않는다.
  //   role prefix === service_memberships.service_key (self-map) 이므로
  //   ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY 항목 추가는 불필요하다.
  | 'kpa-branch'
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: 독립 서비스 3개.
  //   type-only 확장(union 확대). 기존 키의 동작·설정은 변경하지 않는다.
  //   role prefix === service_memberships.service_key (self-map) 이므로
  //   ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY 항목 추가는 불필요하다.
  //
  //   `supplier` · `funding` 도 독립 키다. 착수 중 "기존 neture 키로 충분하다" 고 판정했다가
  //   **철회했다**(§4-0). 철회 이유: FROZEN O4O-SUPPLIER-DOMAIN-BOUNDARY-V1 §7 이 고정한 것은
  //   "이 사용자가 **어느 공급자 조직을 소유**하는가"이고, 여기서 필요한 것은 "누가 그
  //   **서브도메인 영역을 운영**하는가"다. 서로 다른 질문이므로 두 번째 인가 축이 아니다 —
  //   조직 소유권 검사(organization_members)는 그대로 두고 운영자 범위만 분리한다.
  | 'community'
  | 'supplier'
  | 'funding';

/** Service-prefixed role format: "service:role" */
export type PrefixedRole = `${ServiceKey}:${string}`;

/**
 * Configuration for creating a service-specific scope guard.
 *
 * Each service defines:
 * - Which prefixed roles grant access
 * - Whether platform:super_admin can bypass
 * - Which legacy roles to detect and deny
 * - Which other service prefixes to block
 */
export interface ServiceScopeGuardConfig {
  /** Service identifier (e.g., 'kpa', 'neture', 'cosmetics') */
  serviceKey: ServiceKey;

  /**
   * All service-prefixed roles that may grant access.
   * The guard checks if the requested scope is in this list.
   * e.g., ['kpa:admin', 'kpa:operator']
   */
  allowedRoles: string[];

  /**
   * Whether platform:super_admin bypasses this guard.
   * - true: platform super admin can access (typical for non-organizational services)
   * - false: KPA-style organizational isolation (platform admin denied)
   */
  platformBypass: boolean;

  /**
   * Legacy unprefixed roles (deprecated, kept for interface compatibility).
   * WO-OPERATOR-ROLE-CLEANUP-V1: All configs now use empty arrays.
   */
  legacyRoles: string[];

  /**
   * Other service prefixes to explicitly block.
   * e.g., ['neture', 'cosmetics'] for KPA service
   */
  blockedServicePrefixes: string[];

  /**
   * Optional scope-level role mapping.
   * Maps a requested scope to the set of roles that satisfy it.
   * If not provided, falls back to checking allowedRoles directly.
   *
   * Example (Neture):
   * {
   *   'neture:admin': ['neture:admin'],
   *   'neture:operator': ['neture:operator', 'neture:admin'],
   *   'neture:supplier': ['neture:supplier', 'neture:admin'],
   * }
   */
  scopeRoleMapping?: Record<string, string[]>;
}

/** User object shape expected by security guards */
export interface SecurityUser {
  id: string;
  // WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
  //   scopes 필드 제거 — 인증 미들웨어가 채운 적이 없는 값이다.
  //   guard 판정은 roles + membership 으로만 이루어진다.
  roles?: string[];
}