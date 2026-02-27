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
 * KPA Service Configuration
 *
 * Organizational isolation: platform:super_admin does NOT bypass.
 * KPA organizations are fully isolated from platform-level access.
 */
export const KPA_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'kpa',
  allowedRoles: [
    'kpa:admin',
    'kpa:operator',
    'kpa:district_admin',
    'kpa:branch_admin',
    'kpa:branch_operator',
  ],
  platformBypass: false,
  legacyRoles: [],
  blockedServicePrefixes: ['platform', 'neture', 'glycopharm', 'cosmetics', 'glucoseview'],
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
  blockedServicePrefixes: ['kpa', 'glycopharm', 'cosmetics', 'glucoseview'],
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
  blockedServicePrefixes: ['kpa', 'neture', 'glycopharm', 'cosmetics', 'glucoseview'],
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
  blockedServicePrefixes: ['kpa', 'neture', 'cosmetics', 'glucoseview'],
};
