/**
 * Security Core Types
 *
 * Platform-wide security type definitions.
 */

/** All known service keys in the O4O platform */
export type ServiceKey =
  | 'kpa'
  | 'neture'
  | 'glycopharm'
  | 'cosmetics'
  | 'glucoseview'
  | 'platform';

/** Service-prefixed role format: "service:role" */
export type PrefixedRole = `${ServiceKey}:${string}`;

/**
 * Configuration for creating a service-specific scope guard.
 *
 * Each service defines:
 * - Which prefixed roles grant access
 * - Whether platform:admin can bypass
 * - Which legacy roles to detect and deny
 * - Which other service prefixes to block
 */
export interface ServiceScopeGuardConfig {
  /** Service identifier (e.g., 'kpa', 'neture', 'glycopharm') */
  serviceKey: ServiceKey;

  /**
   * All service-prefixed roles that may grant access.
   * The guard checks if the requested scope is in this list.
   * e.g., ['kpa:admin', 'kpa:operator', 'kpa:district_admin']
   */
  allowedRoles: string[];

  /**
   * Whether platform:admin and platform:super_admin bypass this guard.
   * - true: platform admins can access (typical for non-organizational services)
   * - false: KPA-style organizational isolation (platform admins denied)
   */
  platformBypass: boolean;

  /**
   * Legacy unprefixed roles to detect and deny.
   * When detected, logged via logLegacyRoleUsage and access denied.
   * e.g., ['admin', 'operator', 'super_admin']
   */
  legacyRoles: string[];

  /**
   * Other service prefixes to explicitly block.
   * e.g., ['neture', 'glycopharm', 'cosmetics'] for KPA service
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
  scopes?: string[];
  roles?: string[];
}
