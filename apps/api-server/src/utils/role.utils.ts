/**
 * Role Utilities - Service-Specific Role Prefix Support
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0
 *
 * Supports dual-format role checking during migration period:
 * - Legacy format: "admin", "operator", etc.
 * - Prefixed format: "service:role" (e.g., "kpa:admin", "platform:super_admin")
 *
 * IMPORTANT: This utility provides backward compatibility.
 * After migration complete, remove hasRoleCompat() and use only prefixed format.
 */

import type { ServiceKey, PrefixedRole } from '../types/roles.js';

/**
 * Check if user has a specific service-prefixed role
 *
 * @param userRoles - Array of user roles (from User.roles)
 * @param serviceRole - Service-prefixed role (e.g., "kpa:admin", "platform:super_admin")
 * @returns true if user has the role
 *
 * @example
 * hasServiceRole(['kpa:admin', 'kpa:pharmacist'], 'kpa:admin') // true
 * hasServiceRole(['neture:user'], 'kpa:admin') // false
 */
export function hasServiceRole(userRoles: string[], serviceRole: PrefixedRole): boolean {
  return userRoles.includes(serviceRole);
}

/**
 * Check if user has any of the specified service-prefixed roles
 *
 * @param userRoles - Array of user roles
 * @param serviceRoles - Array of service-prefixed roles to check
 * @returns true if user has at least one of the roles
 *
 * @example
 * hasAnyServiceRole(['kpa:pharmacist'], ['kpa:admin', 'platform:admin']) // false
 * hasAnyServiceRole(['platform:super_admin'], ['kpa:admin', 'platform:super_admin']) // true
 */
export function hasAnyServiceRole(userRoles: string[], serviceRoles: PrefixedRole[]): boolean {
  return serviceRoles.some(role => userRoles.includes(role));
}

/**
 * Check if user has all of the specified service-prefixed roles
 *
 * @param userRoles - Array of user roles
 * @param serviceRoles - Array of service-prefixed roles to check
 * @returns true if user has all of the roles
 *
 * @example
 * hasAllServiceRoles(['kpa:admin', 'kpa:operator'], ['kpa:admin', 'kpa:operator']) // true
 * hasAllServiceRoles(['kpa:admin'], ['kpa:admin', 'kpa:operator']) // false
 */
export function hasAllServiceRoles(userRoles: string[], serviceRoles: PrefixedRole[]): boolean {
  return serviceRoles.every(role => userRoles.includes(role));
}

/**
 * Backward compatibility helper: Check both old and new role formats
 *
 * ⚠️ MIGRATION PERIOD ONLY - Remove after migration complete
 *
 * @param userRoles - Array of user roles
 * @param legacyRole - Old unprefixed role (e.g., "admin", "district_admin")
 * @param prefixedRole - New service-prefixed role (e.g., "kpa:admin")
 * @returns true if user has either format
 *
 * @example
 * // During migration, user might have old or new format
 * hasRoleCompat(['admin'], 'admin', 'kpa:admin') // true (legacy)
 * hasRoleCompat(['kpa:admin'], 'admin', 'kpa:admin') // true (new)
 * hasRoleCompat(['pharmacist'], 'admin', 'kpa:admin') // false (neither)
 *
 * @deprecated Remove after migration complete (Phase 7)
 */
export function hasRoleCompat(
  userRoles: string[],
  legacyRole: string,
  prefixedRole: PrefixedRole
): boolean {
  return userRoles.includes(legacyRole) || userRoles.includes(prefixedRole);
}

/**
 * Check if user has admin access for a specific service
 *
 * Checks for:
 * - Service-specific admin (e.g., "kpa:admin")
 * - Platform-level admin ("platform:admin")
 * - Platform super admin ("platform:super_admin")
 *
 * @param userRoles - Array of user roles
 * @param serviceKey - Service key (e.g., "kpa", "neture")
 * @returns true if user is admin for the service
 *
 * @example
 * isServiceAdmin(['kpa:admin'], 'kpa') // true
 * isServiceAdmin(['platform:super_admin'], 'kpa') // true
 * isServiceAdmin(['neture:admin'], 'kpa') // false
 */
export function isServiceAdmin(userRoles: string[], serviceKey: ServiceKey): boolean {
  const serviceAdmin = `${serviceKey}:admin` as PrefixedRole;
  return hasAnyServiceRole(userRoles, [
    serviceAdmin,
    'platform:admin',
    'platform:super_admin'
  ]);
}

/**
 * Check if user has operator access for a specific service
 *
 * Checks for:
 * - Service-specific operator (e.g., "kpa:operator")
 * - Service-specific admin (e.g., "kpa:admin")
 * - Platform-level admin ("platform:admin")
 * - Platform super admin ("platform:super_admin")
 *
 * @param userRoles - Array of user roles
 * @param serviceKey - Service key (e.g., "kpa", "neture")
 * @returns true if user is operator for the service
 *
 * @example
 * isServiceOperator(['kpa:operator'], 'kpa') // true
 * isServiceOperator(['kpa:admin'], 'kpa') // true
 * isServiceOperator(['platform:super_admin'], 'kpa') // true
 * isServiceOperator(['neture:operator'], 'kpa') // false
 */
export function isServiceOperator(userRoles: string[], serviceKey: ServiceKey): boolean {
  const serviceOperator = `${serviceKey}:operator` as PrefixedRole;
  const serviceAdmin = `${serviceKey}:admin` as PrefixedRole;
  return hasAnyServiceRole(userRoles, [
    serviceOperator,
    serviceAdmin,
    'platform:admin',
    'platform:super_admin'
  ]);
}

/**
 * Check if user has platform-level super admin role
 *
 * @param userRoles - Array of user roles
 * @returns true if user is platform super admin
 *
 * @example
 * isPlatformSuperAdmin(['platform:super_admin']) // true
 * isPlatformSuperAdmin(['platform:admin']) // false
 * isPlatformSuperAdmin(['kpa:admin']) // false
 */
export function isPlatformSuperAdmin(userRoles: string[]): boolean {
  return hasServiceRole(userRoles, 'platform:super_admin');
}

/**
 * Check if user has platform-level admin role (admin or super admin)
 *
 * @param userRoles - Array of user roles
 * @returns true if user is platform admin or super admin
 *
 * @example
 * isPlatformAdmin(['platform:admin']) // true
 * isPlatformAdmin(['platform:super_admin']) // true
 * isPlatformAdmin(['kpa:admin']) // false
 */
export function isPlatformAdmin(userRoles: string[]): boolean {
  return hasAnyServiceRole(userRoles, ['platform:admin', 'platform:super_admin']);
}

/**
 * Check if user has a specific platform-level role
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 2
 *
 * Strict platform role checking - only accepts `platform:*` format.
 * Service roles (e.g., `kpa:admin`) and legacy roles (e.g., `admin`) are rejected.
 *
 * @param userRoles - Array of user roles
 * @param role - Platform role name ('admin' or 'super_admin')
 * @returns true if user has the platform role
 *
 * @example
 * hasPlatformRole(['platform:super_admin'], 'super_admin') // true
 * hasPlatformRole(['platform:admin'], 'admin') // true
 * hasPlatformRole(['kpa:admin'], 'admin') // false (service role, not platform)
 * hasPlatformRole(['admin'], 'admin') // false (legacy, not prefixed)
 */
export function hasPlatformRole(
  userRoles: string[],
  role: 'admin' | 'super_admin'
): boolean {
  return userRoles.includes(`platform:${role}`);
}

/**
 * Parse a service-prefixed role into its components
 *
 * @param role - Service-prefixed role (e.g., "kpa:admin")
 * @returns Object with service and role, or null if invalid format
 *
 * @example
 * parseServiceRole('kpa:admin') // { service: 'kpa', role: 'admin' }
 * parseServiceRole('platform:super_admin') // { service: 'platform', role: 'super_admin' }
 * parseServiceRole('admin') // null (invalid format)
 */
export function parseServiceRole(role: string): { service: ServiceKey; role: string } | null {
  const parts = role.split(':');
  if (parts.length !== 2) {
    return null;
  }
  const [service, roleName] = parts;
  return { service: service as ServiceKey, role: roleName };
}

/**
 * Get all roles for a specific service from user's role array
 *
 * @param userRoles - Array of user roles
 * @param serviceKey - Service key to filter by
 * @returns Array of roles for that service (unprefixed)
 *
 * @example
 * getServiceRoles(['kpa:admin', 'kpa:pharmacist', 'neture:user'], 'kpa')
 * // Returns: ['admin', 'pharmacist']
 */
export function getServiceRoles(userRoles: string[], serviceKey: ServiceKey): string[] {
  const prefix = `${serviceKey}:`;
  return userRoles
    .filter(role => role.startsWith(prefix))
    .map(role => role.substring(prefix.length));
}

/**
 * Migration helper: Log when legacy role format is used
 *
 * ⚠️ MONITORING ONLY - Remove after migration complete
 *
 * @param userId - User ID for tracking
 * @param legacyRole - Legacy role that was checked
 * @param context - Where the check occurred (controller/middleware name)
 *
 * @example
 * if (userRoles.includes('admin')) {
 *   logLegacyRoleUsage(userId, 'admin', 'organization-join-request.controller');
 * }
 *
 * @deprecated Remove after migration complete (Phase 7)
 */
export function logLegacyRoleUsage(
  userId: string,
  legacyRole: string,
  context: string
): void {
  console.warn(
    `[ROLE_MIGRATION] Legacy role format used: "${legacyRole}" | User: ${userId} | Context: ${context}`
  );
}

/**
 * Migration helper: Check if a role string is prefixed format
 *
 * @param role - Role string to check
 * @returns true if role is in "service:role" format
 *
 * @example
 * isPrefixedRole('kpa:admin') // true
 * isPrefixedRole('platform:super_admin') // true
 * isPrefixedRole('admin') // false
 */
export function isPrefixedRole(role: string): boolean {
  return role.includes(':') && role.split(':').length === 2;
}

/**
 * Migration helper: Get migration status for a user's roles
 *
 * @param userRoles - Array of user roles
 * @returns Object with counts of prefixed vs legacy roles
 *
 * @example
 * getRoleMigrationStatus(['kpa:admin', 'admin', 'district_admin', 'platform:super_admin'])
 * // Returns: { prefixed: 2, legacy: 2, total: 4, migrationComplete: false }
 */
export function getRoleMigrationStatus(userRoles: string[]): {
  prefixed: number;
  legacy: number;
  total: number;
  migrationComplete: boolean;
} {
  const prefixed = userRoles.filter(isPrefixedRole).length;
  const legacy = userRoles.length - prefixed;
  return {
    prefixed,
    legacy,
    total: userRoles.length,
    migrationComplete: legacy === 0
  };
}
