/**
 * RBAC Utilities for Frontend
 *
 * Permission and role checking utilities that use the SSOT
 * from @o4o/types for consistent authorization across FE/BE.
 */
import { ROLES, ADMIN_ROLES, ROLE_PERMISSIONS, roleHasPermission, anyRoleHasPermission, getPermissionsForRole, getPermissionsForRoles, isAdminRole, hasHigherOrEqualPrivilege, getRoleLabel } from '@o4o/types';
import type { MeResponse } from './types.js';
export { ROLES, ADMIN_ROLES, ROLE_PERMISSIONS, roleHasPermission, anyRoleHasPermission, getPermissionsForRole, getPermissionsForRoles, isAdminRole, hasHigherOrEqualPrivilege, getRoleLabel, };
/**
 * Get active roles from user's role assignments
 */
export declare function getActiveRoles(user: MeResponse | null): string[];
/**
 * Get the primary role (highest privilege) from user's assignments
 */
export declare function getPrimaryRole(user: MeResponse | null): string | null;
/**
 * Check if user has a specific role (active)
 */
export declare function hasRole(user: MeResponse | null, role: string): boolean;
/**
 * Check if user has any of the specified roles (active)
 */
export declare function hasAnyRole(user: MeResponse | null, roles: string[]): boolean;
/**
 * Check if user has all of the specified roles (active)
 */
export declare function hasAllRoles(user: MeResponse | null, roles: string[]): boolean;
/**
 * Check if user is an admin (any admin role)
 */
export declare function isAdmin(user: MeResponse | null): boolean;
/**
 * Check if user has a specific permission
 */
export declare function hasPermission(user: MeResponse | null, permission: string): boolean;
/**
 * Check if user has any of the specified permissions
 */
export declare function hasAnyPermission(user: MeResponse | null, permissions: string[]): boolean;
/**
 * Check if user has all of the specified permissions
 */
export declare function hasAllPermissions(user: MeResponse | null, permissions: string[]): boolean;
/**
 * Get all permissions for the current user
 */
export declare function getUserPermissions(user: MeResponse | null): string[];
/**
 * Permission check result with reason
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    missingPermissions?: string[];
    missingRoles?: string[];
}
/**
 * Detailed permission check with reasons
 */
export declare function checkPermission(user: MeResponse | null, permission: string): PermissionCheckResult;
/**
 * Detailed role check with reasons
 */
export declare function checkRole(user: MeResponse | null, roles: string | string[]): PermissionCheckResult;
/**
 * Create a permission guard function for route protection
 */
export declare function createPermissionGuard(permission: string): (user: MeResponse | null) => boolean;
/**
 * Create a role guard function for route protection
 */
export declare function createRoleGuard(roles: string | string[]): (user: MeResponse | null) => boolean;
//# sourceMappingURL=rbac.d.ts.map