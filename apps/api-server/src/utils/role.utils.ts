/**
 * Role Utilities - Service-Specific Role Prefix Support
 *
 * WO-OPERATOR-ROLE-CLEANUP-V1: Legacy compatibility helpers removed.
 * All roles are now in prefixed format: "service:role" (e.g., "kpa:admin", "platform:super_admin")
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
 * hasAnyServiceRole(['kpa:pharmacist'], ['kpa:admin', 'platform:super_admin']) // false
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
 * Check if user has admin access for a specific service
 *
 * Checks for:
 * - Service-specific admin (e.g., "kpa:admin")
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
    'platform:super_admin'
  ]);
}

/**
 * Check if user has operator access for a specific service
 *
 * Checks for:
 * - Service-specific operator (e.g., "kpa:operator")
 * - Service-specific admin (e.g., "kpa:admin")
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
 * isPlatformSuperAdmin(['kpa:admin']) // false
 */
export function isPlatformSuperAdmin(userRoles: string[]): boolean {
  return hasServiceRole(userRoles, 'platform:super_admin');
}

/**
 * Check if user has platform-wide admin authority
 *
 * WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
 *   allow-list 에서 legacy 'platform:admin' 제거 → `platform:super_admin` 단독.
 *   해당 역할 보유자는 0 이고 `platform:super_admin` 대비 독립 권한도 0 이었으므로
 *   판정 결과 변화는 없다. 서비스 단위 관리는 `isServiceAdmin`/`isServiceOperator` 를 쓴다.
 *   (helper 이름은 `serviceScope.isPlatformAdmin` 계약 필드명과 짝을 이루므로 유지한다.)
 *
 * @param userRoles - Array of user roles
 * @returns true if user is platform super admin
 *
 * @example
 * isPlatformAdmin(['platform:super_admin']) // true
 * isPlatformAdmin(['kpa:admin']) // false
 */
export function isPlatformAdmin(userRoles: string[]): boolean {
  return hasServiceRole(userRoles, 'platform:super_admin');
}

/**
 * Check if user has a specific platform-level role
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 2
 *
 * Strict platform role checking - only accepts `platform:*` format.
 * Service roles (e.g., `kpa:admin`) and legacy roles (e.g., `admin`) are rejected.
 *
 * WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
 *   'platform:admin' 제거로 선택지가 'super_admin' 하나만 남았다.
 *
 * @param userRoles - Array of user roles
 * @param role - Platform role name ('super_admin')
 * @returns true if user has the platform role
 *
 * @example
 * hasPlatformRole(['platform:super_admin'], 'super_admin') // true
 * hasPlatformRole(['kpa:admin'], 'super_admin') // false (service role, not platform)
 * hasPlatformRole(['super_admin'], 'super_admin') // false (legacy, not prefixed)
 */
export function hasPlatformRole(
  userRoles: string[],
  role: 'super_admin'
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
 * Check if user has any admin role across all services
 * WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2
 *
 * Matches: platform:super_admin, kpa:admin, neture:admin, etc.
 * Use for cross-service features (CPT, tenant-isolation, entities).
 */
export function isAnyAdmin(userRoles: string[]): boolean {
  return userRoles.some(r => r === 'platform:super_admin' || r.endsWith(':admin'));
}

/**
 * Check if user has admin, manager, or business role across all services
 * WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2
 *
 * Matches: any :admin, :manager, or :business suffixed role, plus platform:super_admin.
 * Use for CPT form/taxonomy management where managers and business users also have access.
 */
export function isAnyManagerOrAbove(userRoles: string[]): boolean {
  return isAnyAdmin(userRoles) || userRoles.some(r =>
    r.endsWith(':manager') || r.endsWith(':business')
  );
}

// WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1 (F축):
//   `logLegacyRoleUsage` 제거 — 마지막 호출부였던 signage-role.middleware 의
//   dbRoles dead branch 를 E축에서 제거해 소비처가 0 이 되었다.
//   (원래 주석부터 "MONITORING ONLY · @deprecated Remove after migration complete")

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
