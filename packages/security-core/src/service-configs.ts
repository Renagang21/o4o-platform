/**
 * Pre-built Service Scope Guard Configurations
 *
 * WO-OPERATOR-ROLE-CLEANUP-V1: Legacy roles removed, platformBypass = platform:super_admin only
 *
 * Each O4O service has its own security configuration based on its
 * role hierarchy and organizational isolation requirements.
 */

import type { ServiceScopeGuardConfig } from './types.js';

/**
 * Canonical mapping: role prefix → service_memberships.service_key
 *
 * WO-O4O-BACKFILL-MIGRATION-CANONICAL-KEY-CONSISTENCY-V1
 *
 * SSOT for all places that need to derive the canonical `service_memberships.service_key`
 * from a service-prefixed role's prefix (e.g., 'kpa:operator' → prefix 'kpa' → 'kpa-society').
 *
 * Used by:
 *   - apps/api-server/src/common/middleware/membership-guard.middleware.ts  (scope → membership key)
 *   - apps/api-server/src/controllers/admin/AdminUserController.ts          (role grant → SM upsert)
 *   - any future backfill / migration util that maps role prefix to service_memberships row
 *
 * ⚠️ Drift prevention rules (do NOT bypass):
 *   - NEVER use raw `SPLIT_PART(role, ':', 1)` for service_memberships.service_key writes.
 *     Always pass the prefix through `resolveCanonicalServiceKey(prefix)`.
 *   - Frontend MembershipGate uses literal canonical key ('kpa-society' etc.) directly.
 *     This map is only the prefix→canonical direction. Reverse (canonical→prefix) is
 *     not provided since each canonical key corresponds to exactly one prefix.
 *
 * Self-mapped services (prefix === canonical key):
 *   - neture   (no entry — fallback returns 'neture')
 *   - glycopharm (no entry — fallback returns 'glycopharm')
 *   - platform (no entry — fallback returns 'platform')
 *
 * Mapped (drift-prone) services:
 *   - kpa        → kpa-society
 *   - cosmetics  → k-cosmetics
 */
export const ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY: Readonly<Record<string, string>> = Object.freeze({
  kpa: 'kpa-society',
  cosmetics: 'k-cosmetics',
});

/**
 * Resolve a role prefix to its canonical `service_memberships.service_key`.
 *
 * Examples:
 *   resolveCanonicalServiceKey('kpa')        // 'kpa-society'
 *   resolveCanonicalServiceKey('cosmetics')  // 'k-cosmetics'
 *   resolveCanonicalServiceKey('neture')     // 'neture'   (self-map fallback)
 *   resolveCanonicalServiceKey('glycopharm') // 'glycopharm'(self-map fallback)
 *
 * Use this anywhere that derives membership key from a role prefix — never inline
 * `SPLIT_PART(role, ':', 1)` for service_memberships writes. See
 * WO-O4O-BACKFILL-MIGRATION-CANONICAL-KEY-CONSISTENCY-V1 for rationale.
 */
export function resolveCanonicalServiceKey(rolePrefix: string): string {
  return ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY[rolePrefix] || rolePrefix;
}

/**
 * KPA Service Configuration
 *
 * Organizational isolation: platform:super_admin does NOT bypass.
 * KPA organizations are fully isolated from platform-level access.
 *
 * WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1:
 *   kpa:district_admin / kpa:branch_admin / kpa:branch_operator 모두 제거.
 *   KPA에는 kpa-society 운영자(kpa:operator) / 관리자(kpa:admin) 만 존재.
 *   조직 단위 역할은 kpa_members.role(=user.membershipRole)로 관리.
 */
export const KPA_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'kpa',
  allowedRoles: [
    'kpa:admin',
    'kpa:operator',
  ],
  platformBypass: false,
  legacyRoles: [],
  blockedServicePrefixes: ['platform', 'neture', 'glycopharm', 'cosmetics'],
  // WO-KPA-SCOPE-HIERARCHY-FIX-V1: kpa:admin ⊃ kpa:operator (admin covers operator, not vice versa)
  scopeRoleMapping: {
    'kpa:admin': ['kpa:admin'],
    'kpa:operator': ['kpa:operator', 'kpa:admin'],
  },
};

/**
 * Neture Service Configuration
 *
 * Platform bypass enabled: platform:super_admin can access.
 * Scope-level role mapping for hierarchical access control.
 */
export const NETURE_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'neture',
  allowedRoles: [
    'neture:admin',
    'neture:operator',
    'neture:supplier',
    'neture:partner',
  ],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'glycopharm', 'cosmetics'],
  scopeRoleMapping: {
    'neture:admin': ['neture:admin'],
    'neture:operator': ['neture:operator', 'neture:admin'],
    'neture:supplier': ['neture:supplier', 'neture:admin'],
    'neture:partner': ['neture:partner', 'neture:admin'],
  },
};

/**
 * Platform Service Configuration
 *
 * Platform-level scope guard.
 * Only platform:super_admin has access.
 * No platform bypass (self-referencing).
 */
export const PLATFORM_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'platform',
  allowedRoles: [
    'platform:super_admin',
  ],
  platformBypass: false,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'glycopharm', 'cosmetics'],
};

/**
 * GlycoPharm Service Configuration
 *
 * Platform bypass enabled: platform:super_admin can access.
 * Medical data service with pharmacy-level isolation.
 */
export const GLYCOPHARM_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'glycopharm',
  allowedRoles: [
    'glycopharm:admin',
    'glycopharm:operator',
  ],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'cosmetics'],
};

/**
 * K-Cosmetics Service Configuration
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1: Extracted from inline cosmetics.routes.ts
 *
 * Platform bypass enabled: platform:super_admin can access.
 * Scope-level role mapping for hierarchical access control.
 */
export const COSMETICS_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'cosmetics',
  allowedRoles: [
    'cosmetics:admin',
    'cosmetics:operator',
  ],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'glycopharm'],
  scopeRoleMapping: {
    'cosmetics:admin': ['cosmetics:admin'],
    'cosmetics:operator': ['cosmetics:operator', 'cosmetics:admin'],
  },
};
