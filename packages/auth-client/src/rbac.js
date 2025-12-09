/**
 * RBAC Utilities for Frontend
 *
 * Permission and role checking utilities that use the SSOT
 * from @o4o/types for consistent authorization across FE/BE.
 */
import { ROLES, ADMIN_ROLES, ROLE_PERMISSIONS, roleHasPermission, anyRoleHasPermission, getPermissionsForRole, getPermissionsForRoles, isAdminRole, hasHigherOrEqualPrivilege, getRoleLabel, } from '@o4o/types';
// Re-export SSOT constants for convenience
export { ROLES, ADMIN_ROLES, ROLE_PERMISSIONS, roleHasPermission, anyRoleHasPermission, getPermissionsForRole, getPermissionsForRoles, isAdminRole, hasHigherOrEqualPrivilege, getRoleLabel, };
/**
 * Get active roles from user's role assignments
 */
export function getActiveRoles(user) {
    if (!user?.assignments)
        return [];
    const now = new Date();
    return user.assignments
        .filter((assignment) => {
        if (!assignment.isActive)
            return false;
        // Check validFrom
        if (assignment.validFrom && new Date(assignment.validFrom) > now) {
            return false;
        }
        // Check validUntil
        if (assignment.validUntil && new Date(assignment.validUntil) < now) {
            return false;
        }
        return true;
    })
        .map((assignment) => assignment.role);
}
/**
 * Get the primary role (highest privilege) from user's assignments
 */
export function getPrimaryRole(user) {
    const roles = getActiveRoles(user);
    if (roles.length === 0)
        return null;
    // Sort by hierarchy (highest first)
    const sorted = [...roles].sort((a, b) => {
        const levelA = ROLE_HIERARCHY[a] ?? 0;
        const levelB = ROLE_HIERARCHY[b] ?? 0;
        return levelB - levelA;
    });
    return sorted[0];
}
// Import hierarchy for internal use
const ROLE_HIERARCHY = {
    [ROLES.USER]: 1,
    [ROLES.CUSTOMER]: 1,
    [ROLES.MEMBER]: 2,
    [ROLES.CONTRIBUTOR]: 3,
    [ROLES.SELLER]: 10,
    [ROLES.VENDOR]: 11,
    [ROLES.BUSINESS]: 11,
    [ROLES.SUPPLIER]: 12,
    [ROLES.AFFILIATE]: 20,
    [ROLES.PARTNER]: 25,
    [ROLES.MANAGER]: 50,
    [ROLES.OPERATOR]: 55,
    [ROLES.ADMIN]: 90,
    [ROLES.ADMINISTRATOR]: 90,
    [ROLES.SUPER_ADMIN]: 100,
};
/**
 * Check if user has a specific role (active)
 */
export function hasRole(user, role) {
    const activeRoles = getActiveRoles(user);
    return activeRoles.includes(role);
}
/**
 * Check if user has any of the specified roles (active)
 */
export function hasAnyRole(user, roles) {
    const activeRoles = getActiveRoles(user);
    return roles.some((role) => activeRoles.includes(role));
}
/**
 * Check if user has all of the specified roles (active)
 */
export function hasAllRoles(user, roles) {
    const activeRoles = getActiveRoles(user);
    return roles.every((role) => activeRoles.includes(role));
}
/**
 * Check if user is an admin (any admin role)
 */
export function isAdmin(user) {
    const activeRoles = getActiveRoles(user);
    return activeRoles.some((role) => ADMIN_ROLES.includes(role));
}
/**
 * Check if user has a specific permission
 */
export function hasPermission(user, permission) {
    // Admin roles have all permissions
    if (isAdmin(user))
        return true;
    const activeRoles = getActiveRoles(user);
    // Check if any active role has the permission
    return anyRoleHasPermission(activeRoles, permission);
}
/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user, permissions) {
    // Admin roles have all permissions
    if (isAdmin(user))
        return true;
    return permissions.some((permission) => hasPermission(user, permission));
}
/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user, permissions) {
    // Admin roles have all permissions
    if (isAdmin(user))
        return true;
    return permissions.every((permission) => hasPermission(user, permission));
}
/**
 * Get all permissions for the current user
 */
export function getUserPermissions(user) {
    const activeRoles = getActiveRoles(user);
    return getPermissionsForRoles(activeRoles);
}
/**
 * Detailed permission check with reasons
 */
export function checkPermission(user, permission) {
    if (!user) {
        return {
            allowed: false,
            reason: 'Not authenticated',
        };
    }
    if (isAdmin(user)) {
        return { allowed: true };
    }
    const activeRoles = getActiveRoles(user);
    if (activeRoles.length === 0) {
        return {
            allowed: false,
            reason: 'No active roles',
        };
    }
    if (anyRoleHasPermission(activeRoles, permission)) {
        return { allowed: true };
    }
    return {
        allowed: false,
        reason: 'Permission not granted',
        missingPermissions: [permission],
    };
}
/**
 * Detailed role check with reasons
 */
export function checkRole(user, roles) {
    if (!user) {
        return {
            allowed: false,
            reason: 'Not authenticated',
        };
    }
    const roleList = Array.isArray(roles) ? roles : [roles];
    const activeRoles = getActiveRoles(user);
    if (activeRoles.length === 0) {
        return {
            allowed: false,
            reason: 'No active roles',
            missingRoles: roleList,
        };
    }
    const hasRequiredRole = roleList.some((role) => activeRoles.includes(role));
    if (hasRequiredRole) {
        return { allowed: true };
    }
    return {
        allowed: false,
        reason: 'Required role not assigned',
        missingRoles: roleList,
    };
}
/**
 * Create a permission guard function for route protection
 */
export function createPermissionGuard(permission) {
    return (user) => hasPermission(user, permission);
}
/**
 * Create a role guard function for route protection
 */
export function createRoleGuard(roles) {
    return (user) => {
        const roleList = Array.isArray(roles) ? roles : [roles];
        return hasAnyRole(user, roleList);
    };
}
//# sourceMappingURL=rbac.js.map