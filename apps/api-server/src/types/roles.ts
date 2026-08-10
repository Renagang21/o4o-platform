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
  | 'glycopharm'   // GlycoPharm service
  | 'cosmetics'    // K-Cosmetics service
  | 'lms'          // LMS service
  | 'pharmacy-hub'; // Pharmacy-Hub (파머시 허브) — WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1

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
export type PlatformRole =
  | 'platform:super_admin'  // Highest privilege, cross-service access
  | 'platform:manager'      // Platform manager
  | 'platform:vendor'       // Platform vendor
  | 'platform:member'       // Platform member
  | 'platform:contributor'; // Platform contributor

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
  | 'kpa:store_owner'      // KPA pharmacy store owner (WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1)
  | 'kpa:pharmacist'       // General pharmacist/member
  | 'kpa:student';         // Student member

/**
 * Neture service roles
 */
export type NetureRole =
  | 'neture:admin'    // Neture admin
  | 'neture:operator' // Neture operator
  | 'neture:supplier' // Neture supplier
  | 'neture:partner'  // Neture partner
  | 'neture:user';    // Neture user

/**
 * GlycoPharm service roles
 */
export type GlycoPharmRole =
  | 'glycopharm:admin'        // GlycoPharm admin
  | 'glycopharm:operator'     // GlycoPharm operator
  | 'glycopharm:pharmacist'   // GlycoPharm 약사 (WO-GLYCOPHARM-ROLE-PREFIX-MIGRATION-V1)
  | 'glycopharm:store_owner'  // GlycoPharm pharmacy store owner (WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1)
  | 'pharmacy'                // DEPRECATED → glycopharm:pharmacist (호환용 유지)
  | 'supplier'                // 공급자
  | 'partner'                 // 파트너
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
  | 'cosmetics:store_owner'  // K-Cosmetics store owner
  | 'cosmetics:partner';     // K-Cosmetics partner

/**
 * LMS roles
 */
export type LmsRole =
  | 'lms:instructor';     // LMS 강사

/**
 * Pharmacy-Hub service roles
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * - admin       : 서비스 관리 책임자 (WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1)
 * - operator    : 서비스 운영자 (가입 승인 · 회원 관리 · 커뮤니티 · 공지/운영자 콘텐츠)
 * - store_owner : 약국 경영자 (기존 store_owner 계열과 동일 의미, 서비스 경계만 분리)
 * - supplier    : 공급자 (기존 공통 공급자 원장을 재사용, Pharmacy-Hub 노출 경계만 분리)
 *
 * 역할 계층 (WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1):
 *   admin ⊃ operator — KPA/Neture/K-Cosmetics 와 동일한 표준 계층.
 *   admin 은 운영 권한만 포괄하며 store_owner/supplier 의 **사업자 신분 권한은 포함하지 않는다.**
 *   (Foundation 단계에서는 admin 을 두지 않고 platform 축에 맡겼으나, 서비스 관리 책임자와
 *    일상 운영 담당자를 구분할 수 없어 표준 계층으로 정렬했다.)
 */
export type PharmacyHubRole =
  | 'pharmacy-hub:admin'
  | 'pharmacy-hub:operator'
  | 'pharmacy-hub:store_owner'
  | 'pharmacy-hub:supplier';

/**
 * Union of all service-prefixed roles
 */
export type PrefixedRole =
  | PlatformRole
  | KpaRole
  | NetureRole
  | GlycoPharmRole
  | CosmeticsRole
  | LmsRole
  | PharmacyHubRole;

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
 * 'glycopharm:admin', 'cosmetics:operator') 를 모두 인식한다(마지막 세그먼트 기준).
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
 * isOperationalRole('glycopharm:store_owner') // false
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
  'platform:manager': {
    role: 'platform:manager',
    label: 'Platform Manager',
    description: 'Platform manager',
    service: 'platform',
    category: 'platform',
    deprecated: false
  },
  'platform:vendor': {
    role: 'platform:vendor',
    label: 'Platform Vendor',
    description: 'Platform vendor',
    service: 'platform',
    category: 'commerce',
    deprecated: false
  },
  'platform:member': {
    role: 'platform:member',
    label: 'Platform Member',
    description: 'Platform member',
    service: 'platform',
    category: 'platform',
    deprecated: false
  },
  'platform:contributor': {
    role: 'platform:contributor',
    label: 'Platform Contributor',
    description: 'Platform contributor',
    service: 'platform',
    category: 'platform',
    deprecated: false
  },

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
  'kpa:pharmacist': {
    role: 'kpa:pharmacist',
    label: 'Pharmacist',
    description: 'General pharmacist/member — WO-KPA-A-ROLE-CLEANUP-V1: profile 기반 전환. 신규 할당 중단.',
    service: 'kpa',
    category: 'service',
    deprecated: true
  },
  'kpa:student': {
    role: 'kpa:student',
    label: 'Student',
    description: 'Student member — WO-KPA-A-ROLE-CLEANUP-V1: profile 기반 전환. 신규 할당 중단.',
    service: 'kpa',
    category: 'service',
    deprecated: true
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
  'neture:partner': {
    role: 'neture:partner',
    label: 'Neture Partner',
    description: 'Neture partner',
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

  // GlycoPharm roles
  'glycopharm:admin': {
    role: 'glycopharm:admin',
    label: 'GlycoPharm Admin',
    description: 'GlycoPharm administrator',
    service: 'glycopharm',
    category: 'service',
    deprecated: false
  },
  'glycopharm:operator': {
    role: 'glycopharm:operator',
    label: 'GlycoPharm Operator',
    description: 'GlycoPharm operator',
    service: 'glycopharm',
    category: 'service',
    deprecated: false
  },
  'glycopharm:pharmacist': {
    role: 'glycopharm:pharmacist',
    label: '약사',
    description: 'GlycoPharm 약사 (WO-GLYCOPHARM-ROLE-PREFIX-MIGRATION-V1)',
    service: 'glycopharm',
    category: 'service',
    deprecated: false
  },
  'glycopharm:store_owner': {
    role: 'glycopharm:store_owner',
    label: 'GlycoPharm Store Owner',
    description: 'GlycoPharm pharmacy store owner (WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1)',
    service: 'glycopharm',
    category: 'commerce',
    deprecated: false
  },
  'pharmacy': {
    role: 'pharmacy',
    label: '약국',
    description: 'GlycoPharm 약국 — DEPRECATED → glycopharm:pharmacist',
    service: 'glycopharm',
    category: 'service',
    deprecated: true
  },
  'customer': {
    role: 'customer',
    label: '당뇨인',
    description: '당뇨인 (정규)',
    service: 'glycopharm',
    category: 'service',
    deprecated: false
  },
  'supplier': {
    role: 'supplier',
    label: '공급자',
    description: 'Neture/GlycoPharm 공급자',
    service: 'glycopharm',
    category: 'commerce',
    deprecated: false
  },
  'partner': {
    role: 'partner',
    label: '파트너',
    description: 'Neture/GlycoPharm 파트너',
    service: 'glycopharm',
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
    deprecated: false
  },
  'cosmetics:operator': {
    role: 'cosmetics:operator',
    label: 'K-Cosmetics Operator',
    description: 'K-Cosmetics operator',
    service: 'cosmetics',
    category: 'service',
    deprecated: false
  },
  'cosmetics:pharmacist': {
    role: 'cosmetics:pharmacist',
    label: 'K-Cosmetics Pharmacist',
    description: 'K-Cosmetics 약사',
    service: 'cosmetics',
    category: 'service',
    deprecated: false
  },
  'cosmetics:user': {
    role: 'cosmetics:user',
    label: 'K-Cosmetics User',
    description: 'K-Cosmetics 사용자',
    service: 'cosmetics',
    category: 'service',
    deprecated: false
  },
  'cosmetics:supplier': {
    role: 'cosmetics:supplier',
    label: 'K-Cosmetics Supplier',
    description: 'K-Cosmetics supplier',
    service: 'cosmetics',
    category: 'commerce',
    deprecated: false
  },
  'cosmetics:store_owner': {
    role: 'cosmetics:store_owner',
    label: 'K-Cosmetics Store Owner',
    description: 'K-Cosmetics store owner',
    service: 'cosmetics',
    category: 'commerce',
    deprecated: false
  },
  'cosmetics:partner': {
    role: 'cosmetics:partner',
    label: 'K-Cosmetics Partner',
    description: 'K-Cosmetics partner',
    service: 'cosmetics',
    category: 'commerce',
    deprecated: false
  },


  // LMS roles
  'lms:instructor': {
    role: 'lms:instructor',
    label: 'LMS Instructor',
    description: 'LMS 강사',
    service: 'lms',
    category: 'service',
    deprecated: false
  },

  // Pharmacy-Hub roles (WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1)
  // admin: WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1 (admin ⊃ operator)
  'pharmacy-hub:admin': {
    role: 'pharmacy-hub:admin',
    label: 'Pharmacy-Hub Admin',
    description: '파머시 허브 서비스 관리 책임자 (운영 권한 포괄, 약국·공급자 사업자 권한은 제외)',
    service: 'pharmacy-hub',
    category: 'service',
    deprecated: false
  },
  'pharmacy-hub:operator': {
    role: 'pharmacy-hub:operator',
    label: 'Pharmacy-Hub Operator',
    description: '파머시 허브 서비스 운영자 (가입 승인 · 회원 관리 · 커뮤니티 · 공지)',
    service: 'pharmacy-hub',
    category: 'service',
    deprecated: false
  },
  'pharmacy-hub:store_owner': {
    role: 'pharmacy-hub:store_owner',
    label: 'Pharmacy-Hub Store Owner',
    description: '파머시 허브 약국 경영자',
    service: 'pharmacy-hub',
    category: 'commerce',
    deprecated: false
  },
  'pharmacy-hub:supplier': {
    role: 'pharmacy-hub:supplier',
    label: 'Pharmacy-Hub Supplier',
    description: '파머시 허브 공급자 (공통 공급자 원장 재사용, 노출 경계만 분리)',
    service: 'pharmacy-hub',
    category: 'commerce',
    deprecated: false
  }
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
 * // Returns: ['kpa:admin', 'kpa:operator', 'kpa:store_owner', 'kpa:pharmacist', 'kpa:student']
 */
export function getRolesByService(serviceKey: ServiceKey): PrefixedRole[] {
  return Object.values(ROLE_REGISTRY)
    .filter(meta => meta.service === serviceKey)
    .map(meta => meta.role);
}
