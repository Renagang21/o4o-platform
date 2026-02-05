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
  | 'kpa'          // KPA-Society service
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
 * Neture service roles
 */
export type NetureRole =
  | 'neture:admin'    // Neture admin
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
  | 'cosmetics:admin'    // K-Cosmetics admin
  | 'cosmetics:operator' // K-Cosmetics operator
  | 'cosmetics:supplier' // K-Cosmetics supplier
  | 'cosmetics:seller'   // K-Cosmetics seller/retailer
  | 'cosmetics:partner'; // K-Cosmetics partner

/**
 * GlucoseView service roles
 */
export type GlucoseViewRole =
  | 'glucoseview:admin'     // GlucoseView admin
  | 'glucoseview:operator'; // GlucoseView operator

/**
 * Union of all service-prefixed roles
 */
export type PrefixedRole =
  | PlatformRole
  | KpaRole
  | NetureRole
  | GlycoPharmRole
  | CosmeticsRole
  | GlucoseViewRole;

/**
 * Legacy unprefixed roles (to be deprecated)
 *
 * ⚠️ MIGRATION PERIOD ONLY - Remove after migration complete
 *
 * These are the old role formats that will be replaced by PrefixedRole.
 * Kept for backward compatibility during migration.
 *
 * @deprecated Use PrefixedRole instead
 */
export type LegacyRole =
  // Platform roles (legacy)
  | 'super_admin'
  | 'admin'
  | 'operator'
  | 'manager'
  | 'administrator'
  | 'vendor'
  | 'member'
  | 'contributor'
  // KPA roles (legacy)
  | 'district_admin'
  | 'branch_admin'
  | 'branch_operator'
  | 'pharmacist'
  // Commerce roles (legacy)
  | 'seller'
  | 'supplier'
  | 'partner'
  | 'business'
  // Base user roles (legacy)
  | 'user'
  | 'customer'
  // Service-specific (legacy)
  | 'pharmacy'
  | 'consumer';

/**
 * Combined role type for migration period
 *
 * ⚠️ MIGRATION PERIOD ONLY - Remove after migration complete
 *
 * During migration, a user's roles array may contain both prefixed and legacy formats.
 * After migration complete, use only PrefixedRole.
 *
 * @deprecated Use PrefixedRole after migration complete
 */
export type AnyRole = PrefixedRole | LegacyRole;

/**
 * Role category for grouping and analysis
 */
export type RoleCategory =
  | 'platform'    // Platform-level roles
  | 'service'     // Service-specific roles
  | 'organization' // Organization-level roles (KpaMember, etc.)
  | 'commerce'    // Commerce-related roles
  | 'legacy';     // Deprecated roles

/**
 * Role migration status
 */
export interface RoleMigrationStatus {
  /** Number of roles in prefixed format */
  prefixed: number;
  /** Number of roles in legacy format */
  legacy: number;
  /** Total number of roles */
  total: number;
  /** True if all roles are in prefixed format */
  migrationComplete: boolean;
}

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
    description: 'Platform administrator',
    service: 'platform',
    category: 'platform',
    deprecated: false
  },
  'platform:operator': {
    role: 'platform:operator',
    label: 'Platform Operator',
    description: 'Platform operator',
    service: 'platform',
    category: 'platform',
    deprecated: false
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

  // Neture roles
  'neture:admin': {
    role: 'neture:admin',
    label: 'Neture Admin',
    description: 'Neture administrator',
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
