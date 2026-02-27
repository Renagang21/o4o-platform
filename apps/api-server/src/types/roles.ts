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
  | 'kpa'          // KPA-a 커뮤니티 서비스
  | 'kpa-b'        // KPA-b 데모 서비스
  | 'kpa-c'        // KPA-c 분회서비스
  | 'neture'       // Neture service
  | 'glycopharm'   // GlycoPharm service
  | 'cosmetics'    // K-Cosmetics service
  | 'glucoseview'; // GlucoseView service

/**
 * Platform-level roles (cross-service access)
 */
export type PlatformRole =
  | 'platform:super_admin'  // Highest privilege, cross-service access
  | 'platform:admin'        // Platform administrator
  | 'platform:operator'     // Platform operator
  | 'platform:manager'      // Platform manager
  | 'platform:vendor'       // Platform vendor
  | 'platform:member'       // Platform member
  | 'platform:contributor'; // Platform contributor

/**
 * KPA-Society service roles
 */
export type KpaRole =
  | 'kpa:admin'            // KPA service admin
  | 'kpa:operator'         // KPA service operator
  | 'kpa:district_admin'   // District-level admin
  | 'kpa:branch_admin'     // Branch-level admin
  | 'kpa:branch_operator'  // Branch-level operator
  | 'kpa:pharmacist';      // General pharmacist/member

/**
 * KPA-b 데모 서비스 roles
 */
export type KpaBRole =
  | 'kpa-b:district'  // 지부 운영자
  | 'kpa-b:branch';   // 분회 운영자

/**
 * KPA-c 분회서비스 roles
 */
export type KpaCRole =
  | 'kpa-c:admin'       // 분회서비스 관리자
  | 'kpa-c:operator'    // 분회서비스 운영자
  | 'kpa-c:pharmacist'; // 분회서비스 약사

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
  | 'glycopharm:admin'    // GlycoPharm admin
  | 'glycopharm:operator' // GlycoPharm operator
  | 'glycopharm:pharmacy' // Pharmacy user
  | 'glycopharm:supplier' // GlycoPharm supplier
  | 'glycopharm:partner'  // GlycoPharm partner
  | 'glycopharm:consumer'; // Consumer/patient

/**
 * K-Cosmetics service roles
 */
export type CosmeticsRole =
  | 'cosmetics:admin'      // K-Cosmetics admin
  | 'cosmetics:operator'   // K-Cosmetics operator
  | 'cosmetics:pharmacist' // K-Cosmetics 약사
  | 'cosmetics:user'       // K-Cosmetics 사용자
  | 'cosmetics:supplier'   // K-Cosmetics supplier
  | 'cosmetics:seller'     // K-Cosmetics seller/retailer
  | 'cosmetics:partner';   // K-Cosmetics partner

/**
 * GlucoseView service roles
 */
export type GlucoseViewRole =
  | 'glucoseview:admin'      // GlucoseView admin
  | 'glucoseview:operator'   // GlucoseView operator
  | 'glucoseview:pharmacist' // GlucoseView 약사
  | 'glucoseview:user';      // GlucoseView 사용자

/**
 * Union of all service-prefixed roles
 */
export type PrefixedRole =
  | PlatformRole
  | KpaRole
  | KpaBRole
  | KpaCRole
  | NetureRole
  | GlycoPharmRole
  | CosmeticsRole
  | GlucoseViewRole;

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
 * isPlatformRoleType('platform:admin') // true
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
 * isKpaRoleType('platform:admin') // false
 */
export function isKpaRoleType(role: string): role is KpaRole {
  return role.startsWith('kpa:');
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
  'platform:admin': {
    role: 'platform:admin',
    label: 'Platform Admin',
    description: 'Platform administrator (deprecated — use service-specific admin)',
    service: 'platform',
    category: 'platform',
    deprecated: true
  },
  'platform:operator': {
    role: 'platform:operator',
    label: 'Platform Operator',
    description: 'Platform operator (deprecated — use service-specific operator)',
    service: 'platform',
    category: 'platform',
    deprecated: true
  },
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
  'kpa:district_admin': {
    role: 'kpa:district_admin',
    label: 'District Admin',
    description: 'District-level administrator',
    service: 'kpa',
    category: 'service',
    deprecated: false
  },
  'kpa:branch_admin': {
    role: 'kpa:branch_admin',
    label: 'Branch Admin',
    description: 'Branch-level administrator',
    service: 'kpa',
    category: 'service',
    deprecated: false
  },
  'kpa:branch_operator': {
    role: 'kpa:branch_operator',
    label: 'Branch Operator',
    description: 'Branch-level operator',
    service: 'kpa',
    category: 'service',
    deprecated: false
  },
  'kpa:pharmacist': {
    role: 'kpa:pharmacist',
    label: 'Pharmacist',
    description: 'General pharmacist/member',
    service: 'kpa',
    category: 'service',
    deprecated: false
  },

  // KPA-b 데모 roles
  'kpa-b:district': {
    role: 'kpa-b:district',
    label: 'District Operator',
    description: '데모 서비스 지부 운영자',
    service: 'kpa-b',
    category: 'service',
    deprecated: false
  },
  'kpa-b:branch': {
    role: 'kpa-b:branch',
    label: 'Branch Operator',
    description: '데모 서비스 분회 운영자',
    service: 'kpa-b',
    category: 'service',
    deprecated: false
  },

  // KPA-c 분회서비스 roles
  'kpa-c:admin': {
    role: 'kpa-c:admin',
    label: 'KPA-c Admin',
    description: '분회서비스 관리자',
    service: 'kpa-c',
    category: 'service',
    deprecated: false
  },
  'kpa-c:operator': {
    role: 'kpa-c:operator',
    label: 'KPA-c Operator',
    description: '분회서비스 운영자',
    service: 'kpa-c',
    category: 'service',
    deprecated: false
  },
  'kpa-c:pharmacist': {
    role: 'kpa-c:pharmacist',
    label: 'KPA-c Pharmacist',
    description: '분회서비스 약사',
    service: 'kpa-c',
    category: 'service',
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
  'glycopharm:pharmacy': {
    role: 'glycopharm:pharmacy',
    label: 'Pharmacy',
    description: 'Pharmacy user',
    service: 'glycopharm',
    category: 'service',
    deprecated: false
  },
  'glycopharm:supplier': {
    role: 'glycopharm:supplier',
    label: 'GlycoPharm Supplier',
    description: 'GlycoPharm supplier',
    service: 'glycopharm',
    category: 'commerce',
    deprecated: false
  },
  'glycopharm:partner': {
    role: 'glycopharm:partner',
    label: 'GlycoPharm Partner',
    description: 'GlycoPharm partner',
    service: 'glycopharm',
    category: 'commerce',
    deprecated: false
  },
  'glycopharm:consumer': {
    role: 'glycopharm:consumer',
    label: 'Consumer',
    description: 'Consumer/patient',
    service: 'glycopharm',
    category: 'service',
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
  'cosmetics:seller': {
    role: 'cosmetics:seller',
    label: 'K-Cosmetics Seller',
    description: 'K-Cosmetics seller/retailer',
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

  // GlucoseView roles
  'glucoseview:admin': {
    role: 'glucoseview:admin',
    label: 'GlucoseView Admin',
    description: 'GlucoseView administrator',
    service: 'glucoseview',
    category: 'service',
    deprecated: false
  },
  'glucoseview:operator': {
    role: 'glucoseview:operator',
    label: 'GlucoseView Operator',
    description: 'GlucoseView operator',
    service: 'glucoseview',
    category: 'service',
    deprecated: false
  },
  'glucoseview:pharmacist': {
    role: 'glucoseview:pharmacist',
    label: 'GlucoseView Pharmacist',
    description: 'GlucoseView 약사',
    service: 'glucoseview',
    category: 'service',
    deprecated: false
  },
  'glucoseview:user': {
    role: 'glucoseview:user',
    label: 'GlucoseView User',
    description: 'GlucoseView 사용자',
    service: 'glucoseview',
    category: 'service',
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
 * // Returns: ['kpa:admin', 'kpa:operator', 'kpa:district_admin', ...]
 */
export function getRolesByService(serviceKey: ServiceKey): PrefixedRole[] {
  return Object.values(ROLE_REGISTRY)
    .filter(meta => meta.service === serviceKey)
    .map(meta => meta.role);
}
