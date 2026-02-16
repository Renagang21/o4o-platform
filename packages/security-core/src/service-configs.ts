/**
 * Pre-built Service Scope Guard Configurations
 *
 * Each O4O service has its own security configuration based on its
 * role hierarchy, organizational isolation requirements, and legacy roles.
 */

import type { ServiceScopeGuardConfig } from './types.js';

/**
 * KPA Service Configuration
 *
 * Organizational isolation: platform:admin does NOT bypass.
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
  legacyRoles: [
    'admin',
    'super_admin',
    'operator',
    'district_admin',
    'branch_admin',
    'branch_operator',
  ],
  blockedServicePrefixes: ['platform', 'neture', 'glycopharm', 'cosmetics', 'glucoseview'],
};

/**
 * Neture Service Configuration
 *
 * Platform bypass enabled: platform:admin can access.
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
  legacyRoles: [
    'admin',
    'super_admin',
    'operator',
    'manager',
    'seller',
    'supplier',
    'partner',
  ],
  blockedServicePrefixes: ['kpa', 'glycopharm', 'cosmetics', 'glucoseview'],
  scopeRoleMapping: {
    'neture:admin': ['neture:admin'],
    'neture:operator': ['neture:operator', 'neture:admin'],
    'neture:supplier': ['neture:supplier', 'neture:admin'],
    'neture:partner': ['neture:partner', 'neture:admin'],
  },
};

/**
 * GlycoPharm Service Configuration
 *
 * Platform bypass enabled: platform:admin can access.
 * Medical data service with pharmacy-level isolation.
 */
export const GLYCOPHARM_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'glycopharm',
  allowedRoles: [
    'glycopharm:admin',
    'glycopharm:operator',
  ],
  platformBypass: true,
  legacyRoles: [
    'admin',
    'super_admin',
    'operator',
    'administrator',
  ],
  blockedServicePrefixes: ['kpa', 'neture', 'cosmetics', 'glucoseview'],
};
