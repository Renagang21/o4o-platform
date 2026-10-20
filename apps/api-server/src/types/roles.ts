/**
 * Role Type Definitions - Service-Specific Role Prefixes
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0
 *
 * Defines TypeScript types for the new service-prefixed role format.
 * Format: "{serviceKey}:{roleName}" (e.g., "kpa:admin", "platform:super_admin")
 *
 * IMPORTANT: These types will gradually replace legacy unprefixed roles.
 * During migration period, both formats coexist.
 */

/**
 * Valid service keys for role prefixes
 */
export type ServiceKey =
  | 'platform'      // Platform-wide roles
  | 'kpa'          // KPA 커뮤니티 서비스
  | 'neture'       // Neture service
  | 'cosmetics'    // K-Cosmetics service
  | 'lms'          // Legacy LMS role namespace (Phase 1에서는 유지)
  | 'lecture';     // O4O 강의 독립 서비스

/**
 * Platform-level roles (cross-service access)
 *
 * WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
 *   `platform:admin` · `platform:operator` 제거.
 *   두 역할은 접두 없는 legacy `admin`/`operator` 의 과도기 버킷이었고
 *   (20260205070000-Phase4MultiServiceRolePrefixMigration → 20260228000001-CleanupLegacyRoles),
 *   활성 보유자 0 · `platform:super_admin` 대비 독립 권한 0 으로 확정되었다.
 *   플랫폼 전역 관리는 `platform:super_admin`, 서비스 관리·운영은 `{service}:admin` / `{service}:operator` 를 쓴다.
 *   근거: WO-O4O-LEGACY-ADMIN-ROLE-AND-SCOPE-USAGE-AUDIT-V1 (CHECK 4f63b2844)
 */
export type PlatformRole = 'platform:super_admin';

/**
 * KPA-Society service roles
 *
 * WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1:
 *   kpa:district_admin / kpa:branch_admin / kpa:branch_operator 제거.
 *   KPA에는 kpa-society 운영자(kpa:operator) 만 존재한다.
 *   조직 단위 역할은 kpa_members.role(=user.membershipRole)로 관리.
 */
export type KpaRole =
  | 'kpa:admin'            // KPA service admin
  | 'kpa:operator'         // KPA service operator
  | 'kpa:store_owner';     // Pharmacy store workspace

/**
 * Neture service roles
 */
export type NetureRole =
  | 'neture:admin'    // Neture admin
  | 'neture:operator' // Neture operator
  | 'neture:supplier' // Neture supplier
  | 'neture:store_owner' // 내 매장(약국) 신청 승인 약국 매장 경영자 (WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1)
  | 'neture:user';    // Neture user

/**
 * 서비스 접두사 없는 legacy bare roles.
 *
 *   과거 특정 서비스 경계 안에 잘못 등록돼 있던 공용 역할이다.
 *   서비스 접두 역할은 서비스 삭제와 함께 제거했으나, 아래 bare role 은
 *   Neture(supplier)·플랫폼 전반이 실제 보유 중이므로 유지한다.
 *   ('partner' bare role 은 WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1 로 은퇴 — 보유자 0)
 */
export type LegacyBareRole =
  | 'pharmacy'                // 약국 (legacy bare role)
  | 'supplier'                // 공급자
  | 'customer';               // 당뇨인 (정규)

/**
 * K-Cosmetics service roles
 */
export type CosmeticsRole =
  | 'cosmetics:admin'        // K-Cosmetics admin
  | 'cosmetics:operator'     // K-Cosmetics operator
  | 'cosmetics:pharmacist'   // K-Cosmetics 약사
  | 'cosmetics:user'         // K-Cosmetics 사용자
  | 'cosmetics:supplier'     // K-Cosmetics supplier
  | 'cosmetics:store_owner'; // K-Cosmetics store owner

/** O4O Lecture service roles — 일반 학습자는 role이 아니라 service_memberships로 판정 */
export type LectureRole =
  | 'lecture:admin'
  | 'lecture:operator'
  | 'lecture:instructor';

/**
 * Union of all service-prefixed roles
 */
export type PrefixedRole =
  | PlatformRole
  | KpaRole
  | NetureRole
  | LegacyBareRole
  | CosmeticsRole
  | LectureRole;

/**
 * WO-OPERATOR-ROLE-CLEANUP-V1: All roles are now prefixed.
 * AnyRole is kept as an alias for backward compatibility.
 */
export type AnyRole = PrefixedRole;

/**
 * Role category for grouping and analysis
 */
export type RoleCategory =
  | 'platform'    // Platform-level roles
  | 'service'     // Service-specific roles
  | 'organization' // Organization-level roles (KpaMember, etc.)
  | 'commerce';   // Commerce-related roles

/**
 * Parsed service role components
 */
export interface ParsedServiceRole {
  /** Service key (e.g., 'kpa', 'platform') */
  service: ServiceKey;
  /** Role name without prefix (e.g., 'admin', 'operator') */
  role: string;
}

/**
 * Type guard: Check if a role is a prefixed role
 *
 * @param role - Role string to check
 * @returns true if role is PrefixedRole
 *
 * @example
 * isPrefixedRole('kpa:admin') // true
 * isPrefixedRole('admin') // false
 */
export function isPrefixedRoleType(role: string): role is PrefixedRole {
  return role.includes(':') && role.split(':').length === 2;
}

/**
 * Type guard: Check if a role is a platform role
 *
 * @param role - Role string to check
 * @returns true if role is PlatformRole
 *
 * @example
 * isPlatformRoleType('platform:super_admin') // true
 * isPlatformRoleType('kpa:admin') // false
 */
export function isPlatformRoleType(role: string): role is PlatformRole {
  return role.startsWith('platform:');
}

/**
 * Type guard: Check if a role is a KPA role
 *
 * @param role - Role string to check
 * @returns true if role is KpaRole
 *
 * @example
 * isKpaRoleType('kpa:admin') // true
 * isKpaRoleType('platform:super_admin') // false
 */
export function isKpaRoleType(role: string): role is KpaRole {
  return role.startsWith('kpa:');
}

/**
 * 운영 권한(operator / admin / super_admin) 성격의 role 인지 판정한다.
 * bare('operator', 'admin') 와 namespaced('neture:operator', 'platform:super_admin',
 * 'kpa:admin', 'cosmetics:operator') 를 모두 인식한다(마지막 세그먼트 기준).
 *
 * WO-O4O-MEMBER-ROLE-WRITE-PATH-HARDENING-V1:
 *   운영 권한은 role_assignments(canonical) 축에서만 관리한다. 참여 유형 축인
 *   service_memberships.role 에 운영 권한이 저장되는 것을 막는 write-path 가드에 사용.
 *
 * @example
 * isOperationalRole('operator')           // true
 * isOperationalRole('neture:operator')    // true
 * isOperationalRole('platform:super_admin') // true
 * isOperationalRole('supplier')           // false
 * isOperationalRole('kpa:store_owner') // false
 */
export function isOperationalRole(role: string): boolean {
  if (!role) return false;
  const seg = role.includes(':') ? role.slice(role.lastIndexOf(':') + 1) : role;
  return seg === 'operator' || seg === 'admin' || seg === 'super_admin';
}

/**
 * Role metadata for documentation and validation
 */
export interface RoleMetadata {
  /** The role string (e.g., 'kpa:admin') */
  role: PrefixedRole;
  /** Human-readable label */
  label: string;
  /** Role description */
  description: string;
  /** Service this role belongs to */
  service: ServiceKey;
  /** Role category */
  category: RoleCategory;
  /** Whether this role is deprecated */
  deprecated: boolean;
}

/**
 * Role registry: Map of all valid roles and their metadata
 *
 * Use this for validation, documentation, and UI display.
 */
export const ROLE_REGISTRY: Record<PrefixedRole, RoleMetadata> = {
  // Platform roles
  'platform:super_admin': {
    role: 'platform:super_admin',
    label: 'Platform Super Admin',
    description: 'Highest privilege, cross-service access',
    service: 'platform',
    category: 'platform',
    deprecated: false
  },
  // WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
  //   'platform:admin' / 'platform:operator' entries removed (활성 보유자 0, 독립 권한 0).

  // KPA roles
  'kpa:admin': {
    role: 'kpa:admin',
    label: 'KPA Admin',
    description: 'KPA service administrator',
    service: 'kpa',
    category: 'service',
    deprecated: false
  },
  'kpa:operator': {
    role: 'kpa:operator',
    label: 'KPA Operator',
    description: 'KPA service operator',
    service: 'kpa',
    category: 'service',
    deprecated: false
  },
  // WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1:
  //   kpa:district_admin / kpa:branch_admin / kpa:branch_operator entries removed.
  'kpa:store_owner': {
    role: 'kpa:store_owner',
    label: 'KPA Store Owner',
    description: 'KPA pharmacy store owner (WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1)',
    service: 'kpa',
    category: 'commerce',
    deprecated: false
  },

  // Neture roles
  'neture:admin': {
    role: 'neture:admin',
    label: 'Neture Admin',
    description: 'Neture administrator',
    service: 'neture',
    category: 'service',
    deprecated: false
  },
  'neture:operator': {
    role: 'neture:operator',
    label: 'Neture Operator',
    description: 'Neture operator',
    service: 'neture',
    category: 'service',
    deprecated: false
  },
  'neture:supplier': {
    role: 'neture:supplier',
    label: 'Neture Supplier',
    description: 'Neture supplier',
    service: 'neture',
    category: 'commerce',
    deprecated: false
  },
  'neture:store_owner': {
    role: 'neture:store_owner',
    label: 'Neture Pharmacy Store Owner',
    description: '내 매장(약국) 신청(자격 확인 · 운영자 승인)된 약국의 매장 경영자. 매장 판정 자체는 neture_pharmacy_memberships 원장 — role 은 role 기반 소비처용 (WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1)',
    service: 'neture',
    category: 'commerce',
    deprecated: false
  },
  'neture:user': {
    role: 'neture:user',
    label: 'Neture User',
    description: 'Neture user',
    service: 'neture',
    category: 'service',
    deprecated: false
  },

  //   아래 bare role 은 플랫폼 공용이므로 유지한다.
  'pharmacy': {
    role: 'pharmacy',
    label: '약국',
    description: '약국 (legacy bare role)',
    service: 'platform',
    category: 'service',
    deprecated: true
  },
  'customer': {
    role: 'customer',
    label: '고객',
    description: '고객 (legacy bare role)',
    service: 'platform',
    category: 'service',
    deprecated: false
  },
  'supplier': {
    role: 'supplier',
    label: '공급자',
    description: '공급자 (legacy bare role — Neture 는 neture:supplier 가 canonical)',
    service: 'platform',
    category: 'commerce',
    deprecated: false
  },

  // K-Cosmetics roles
  'cosmetics:admin': {
    role: 'cosmetics:admin',
    label: 'K-Cosmetics Admin',
    description: 'K-Cosmetics administrator',
    service: 'cosmetics',
    category: 'service',
    deprecated: true
  },
  'cosmetics:operator': {
    role: 'cosmetics:operator',
    label: 'K-Cosmetics Operator',
    description: 'K-Cosmetics operator',
    service: 'cosmetics',
    category: 'service',
    deprecated: true
  },
  'cosmetics:pharmacist': {
    role: 'cosmetics:pharmacist',
    label: 'K-Cosmetics Pharmacist',
    description: 'K-Cosmetics 약사',
    service: 'cosmetics',
    category: 'service',
    deprecated: true
  },
  'cosmetics:user': {
    role: 'cosmetics:user',
    label: 'K-Cosmetics User',
    description: 'K-Cosmetics 사용자',
    service: 'cosmetics',
    category: 'service',
    deprecated: true
  },
  'cosmetics:supplier': {
    role: 'cosmetics:supplier',
    label: 'K-Cosmetics Supplier',
    description: 'K-Cosmetics supplier',
    service: 'cosmetics',
    category: 'commerce',
    deprecated: true
  },
  'cosmetics:store_owner': {
    role: 'cosmetics:store_owner',
    label: 'K-Cosmetics Store Owner',
    description: 'K-Cosmetics store owner',
    service: 'cosmetics',
    category: 'commerce',
    deprecated: true
  },


  // O4O Lecture roles (WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1)
  'lecture:admin': {
    role: 'lecture:admin', label: 'O4O Lecture Admin', description: 'O4O 강의 서비스 관리자',
    service: 'lecture', category: 'service', deprecated: false
  },
  'lecture:operator': {
    role: 'lecture:operator', label: 'O4O Lecture Operator', description: 'O4O 강의 서비스 운영자',
    service: 'lecture', category: 'service', deprecated: false
  },
  'lecture:instructor': {
    role: 'lecture:instructor', label: 'O4O Lecture Instructor', description: 'O4O 강의 서비스 강사',
    service: 'lecture', category: 'service', deprecated: false
  },

};
/**
 * Helper: Get role metadata by role string
 *
 * @param role - Role string to look up
 * @returns RoleMetadata or undefined if not found
 *
 * @example
 * getRoleMetadata('kpa:admin')
 * // Returns: { role: 'kpa:admin', label: 'KPA Admin', ... }
 */
export function getRoleMetadata(role: string): RoleMetadata | undefined {
  return ROLE_REGISTRY[role as PrefixedRole];
}

/**
 * Helper: Get all roles for a specific service
 *
 * @param serviceKey - Service key to filter by
 * @returns Array of PrefixedRole for that service
 *
 * @example
 * getRolesByService('kpa')
 * // Returns: ['kpa:admin', 'kpa:operator', 'kpa:store_owner']
 */
export function getRolesByService(serviceKey: ServiceKey): PrefixedRole[] {
  return Object.values(ROLE_REGISTRY)
    .filter(meta => meta.service === serviceKey && !meta.deprecated)
    .map(meta => meta.role);
}