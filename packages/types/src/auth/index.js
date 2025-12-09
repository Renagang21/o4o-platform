/**
 * O4O Platform Auth Types
 * Single Source of Truth (SSOT) for authentication and authorization
 */
// Role definitions - values
export { ROLES, ROLE_HIERARCHY, ROLE_LABELS, ROLE_LABELS_EN, ADMIN_ROLES, COMMERCE_ROLES, PARTNERSHIP_ROLES, isAdminRole, isCommerceRole, hasHigherOrEqualPrivilege, getRoleLabel, isValidRole, getAllRoles, } from './roles.js';
// Permission definitions - values
export { PERMISSION_CATEGORIES, PERMISSION_ACTIONS, PERMISSIONS, ROLE_PERMISSIONS, roleHasPermission, anyRoleHasPermission, getPermissionsForRole, getPermissionsForRoles, parsePermission, getPermissionsByCategory, isValidPermission, getAllPermissions, } from './permissions.js';
// User status enum
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    APPROVED: 'approved',
    SUSPENDED: 'suspended',
    REJECTED: 'rejected',
};
// Auth error codes (for FE handling)
export const AUTH_ERROR_CODES = {
    // Token errors (401)
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
    NO_REFRESH_TOKEN: 'NO_REFRESH_TOKEN',
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    // Credential errors (401)
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INVALID_USER: 'INVALID_USER',
    SOCIAL_LOGIN_REQUIRED: 'SOCIAL_LOGIN_REQUIRED',
    // Authorization errors (403)
    FORBIDDEN: 'FORBIDDEN',
    ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    ROLE_REQUIRED: 'ROLE_REQUIRED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    // Rate limit (429)
    TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
    // Validation errors (400)
    EMAIL_EXISTS: 'EMAIL_EXISTS',
    PASSWORD_VALIDATION_FAILED: 'PASSWORD_VALIDATION_FAILED',
    INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
    INVALID_VERIFICATION_TOKEN: 'INVALID_VERIFICATION_TOKEN',
};
//# sourceMappingURL=index.js.map