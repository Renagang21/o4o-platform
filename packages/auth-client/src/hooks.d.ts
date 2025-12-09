/**
 * Auth React Hooks
 *
 * React hooks for authentication and authorization.
 * Uses the SSOT from @o4o/types for consistent RBAC.
 */
import type { MeResponse } from './types.js';
import { PermissionCheckResult } from './rbac.js';
/**
 * Hook context interface - to be provided by auth context
 */
export interface AuthHookContext {
    user: MeResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
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
export declare function useRole(role: string, user: MeResponse | null): boolean;
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
export declare function useRoles(roles: string[], user: MeResponse | null): boolean;
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
export declare function usePermission(permission: string, user: MeResponse | null): boolean;
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
export declare function usePermissions(permissions: string[], user: MeResponse | null): boolean;
/**
 * useAllPermissions Hook
 *
 * Check if the current user has ALL of the specified permissions.
 *
 * @param permissions - Array of permission keys to check
 * @param user - Current user (from auth context)
 * @returns boolean - True if user has all permissions
 */
export declare function useAllPermissions(permissions: string[], user: MeResponse | null): boolean;
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
export declare function useIsAdmin(user: MeResponse | null): boolean;
/**
 * useActiveRoles Hook
 *
 * Get all active roles for the current user.
 *
 * @param user - Current user (from auth context)
 * @returns string[] - Array of active role names
 */
export declare function useActiveRoles(user: MeResponse | null): string[];
/**
 * usePrimaryRole Hook
 *
 * Get the primary (highest privilege) role for the current user.
 *
 * @param user - Current user (from auth context)
 * @returns string | null - Primary role name or null
 */
export declare function usePrimaryRole(user: MeResponse | null): string | null;
/**
 * useUserPermissions Hook
 *
 * Get all permissions for the current user based on their roles.
 *
 * @param user - Current user (from auth context)
 * @returns string[] - Array of permission keys
 */
export declare function useUserPermissions(user: MeResponse | null): string[];
/**
 * usePermissionCheck Hook
 *
 * Detailed permission check with reason.
 *
 * @param permission - Permission key to check
 * @param user - Current user (from auth context)
 * @returns PermissionCheckResult - Detailed result with allowed flag and reason
 */
export declare function usePermissionCheck(permission: string, user: MeResponse | null): PermissionCheckResult;
/**
 * useRoleCheck Hook
 *
 * Detailed role check with reason.
 *
 * @param roles - Role(s) to check
 * @param user - Current user (from auth context)
 * @returns PermissionCheckResult - Detailed result with allowed flag and reason
 */
export declare function useRoleCheck(roles: string | string[], user: MeResponse | null): PermissionCheckResult;
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
export declare function useRBAC(user: MeResponse | null): {
    activeRoles: string[];
    primaryRole: string;
    permissions: string[];
    isAdmin: boolean;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (perms: string[]) => boolean;
    hasAllPermissions: (perms: string[]) => boolean;
};
/**
 * Type-safe role constants for hook usage
 */
export { ROLES, ADMIN_ROLES, PERMISSIONS } from '@o4o/types';
//# sourceMappingURL=hooks.d.ts.map