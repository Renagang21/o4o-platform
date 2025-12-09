/**
 * Auth React Hooks
 *
 * React hooks for authentication and authorization.
 * Uses the SSOT from @o4o/types for consistent RBAC.
 */
import { useMemo, useCallback } from 'react';
import { hasRole, hasAnyRole, hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, getActiveRoles, getPrimaryRole, getUserPermissions, checkPermission, checkRole, } from './rbac.js';
/**
 * useRole Hook
 *
 * Check if the current user has a specific role.
 *
 * @param role - Role to check
 * @param user - Current user (from auth context)
 * @returns boolean - True if user has the role
 *
 * @example
 * ```tsx
 * const isSeller = useRole('seller', user);
 * if (isSeller) {
 *   // Show seller dashboard
 * }
 * ```
 */
export function useRole(role, user) {
    return useMemo(() => hasRole(user, role), [user, role]);
}
/**
 * useRoles Hook
 *
 * Check if the current user has any of the specified roles.
 *
 * @param roles - Array of roles to check
 * @param user - Current user (from auth context)
 * @returns boolean - True if user has any of the roles
 *
 * @example
 * ```tsx
 * const canManageProducts = useRoles(['seller', 'admin'], user);
 * ```
 */
export function useRoles(roles, user) {
    return useMemo(() => hasAnyRole(user, roles), [user, roles]);
}
/**
 * usePermission Hook
 *
 * Check if the current user has a specific permission.
 *
 * @param permission - Permission key to check
 * @param user - Current user (from auth context)
 * @returns boolean - True if user has the permission
 *
 * @example
 * ```tsx
 * const canEditTemplate = usePermission('cms.templates.edit', user);
 * if (canEditTemplate) {
 *   // Show edit button
 * }
 * ```
 */
export function usePermission(permission, user) {
    return useMemo(() => hasPermission(user, permission), [user, permission]);
}
/**
 * usePermissions Hook
 *
 * Check if the current user has any of the specified permissions.
 *
 * @param permissions - Array of permission keys to check
 * @param user - Current user (from auth context)
 * @returns boolean - True if user has any of the permissions
 *
 * @example
 * ```tsx
 * const canViewReports = usePermissions(['analytics.view', 'reports.view'], user);
 * ```
 */
export function usePermissions(permissions, user) {
    return useMemo(() => hasAnyPermission(user, permissions), [user, permissions]);
}
/**
 * useAllPermissions Hook
 *
 * Check if the current user has ALL of the specified permissions.
 *
 * @param permissions - Array of permission keys to check
 * @param user - Current user (from auth context)
 * @returns boolean - True if user has all permissions
 */
export function useAllPermissions(permissions, user) {
    return useMemo(() => hasAllPermissions(user, permissions), [user, permissions]);
}
/**
 * useIsAdmin Hook
 *
 * Check if the current user has admin privileges.
 *
 * @param user - Current user (from auth context)
 * @returns boolean - True if user is admin
 *
 * @example
 * ```tsx
 * const isAdminUser = useIsAdmin(user);
 * if (isAdminUser) {
 *   // Show admin panel
 * }
 * ```
 */
export function useIsAdmin(user) {
    return useMemo(() => isAdmin(user), [user]);
}
/**
 * useActiveRoles Hook
 *
 * Get all active roles for the current user.
 *
 * @param user - Current user (from auth context)
 * @returns string[] - Array of active role names
 */
export function useActiveRoles(user) {
    return useMemo(() => getActiveRoles(user), [user]);
}
/**
 * usePrimaryRole Hook
 *
 * Get the primary (highest privilege) role for the current user.
 *
 * @param user - Current user (from auth context)
 * @returns string | null - Primary role name or null
 */
export function usePrimaryRole(user) {
    return useMemo(() => getPrimaryRole(user), [user]);
}
/**
 * useUserPermissions Hook
 *
 * Get all permissions for the current user based on their roles.
 *
 * @param user - Current user (from auth context)
 * @returns string[] - Array of permission keys
 */
export function useUserPermissions(user) {
    return useMemo(() => getUserPermissions(user), [user]);
}
/**
 * usePermissionCheck Hook
 *
 * Detailed permission check with reason.
 *
 * @param permission - Permission key to check
 * @param user - Current user (from auth context)
 * @returns PermissionCheckResult - Detailed result with allowed flag and reason
 */
export function usePermissionCheck(permission, user) {
    return useMemo(() => checkPermission(user, permission), [user, permission]);
}
/**
 * useRoleCheck Hook
 *
 * Detailed role check with reason.
 *
 * @param roles - Role(s) to check
 * @param user - Current user (from auth context)
 * @returns PermissionCheckResult - Detailed result with allowed flag and reason
 */
export function useRoleCheck(roles, user) {
    return useMemo(() => checkRole(user, roles), [user, roles]);
}
/**
 * useRBAC Hook
 *
 * Comprehensive RBAC hook that provides all authorization utilities.
 *
 * @param user - Current user (from auth context)
 * @returns Object with all RBAC check functions bound to the user
 *
 * @example
 * ```tsx
 * const { hasRole, hasPermission, isAdmin, activeRoles } = useRBAC(user);
 *
 * if (hasPermission('cms.templates.edit')) {
 *   // User can edit templates
 * }
 * ```
 */
export function useRBAC(user) {
    const activeRoles = useMemo(() => getActiveRoles(user), [user]);
    const primaryRole = useMemo(() => getPrimaryRole(user), [user]);
    const permissions = useMemo(() => getUserPermissions(user), [user]);
    const isAdminUser = useMemo(() => isAdmin(user), [user]);
    const checkHasRole = useCallback((role) => hasRole(user, role), [user]);
    const checkHasAnyRole = useCallback((roles) => hasAnyRole(user, roles), [user]);
    const checkHasPermission = useCallback((permission) => hasPermission(user, permission), [user]);
    const checkHasAnyPermission = useCallback((perms) => hasAnyPermission(user, perms), [user]);
    const checkHasAllPermissions = useCallback((perms) => hasAllPermissions(user, perms), [user]);
    return {
        // State
        activeRoles,
        primaryRole,
        permissions,
        isAdmin: isAdminUser,
        // Role checks
        hasRole: checkHasRole,
        hasAnyRole: checkHasAnyRole,
        // Permission checks
        hasPermission: checkHasPermission,
        hasAnyPermission: checkHasAnyPermission,
        hasAllPermissions: checkHasAllPermissions,
    };
}
/**
 * Type-safe role constants for hook usage
 */
export { ROLES, ADMIN_ROLES, PERMISSIONS } from '@o4o/types';
//# sourceMappingURL=hooks.js.map