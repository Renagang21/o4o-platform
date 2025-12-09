/**
 * O4O Platform Auth Types
 * Single Source of Truth (SSOT) for authentication and authorization
 */
export { ROLES, ROLE_HIERARCHY, ROLE_LABELS, ROLE_LABELS_EN, ADMIN_ROLES, COMMERCE_ROLES, PARTNERSHIP_ROLES, isAdminRole, isCommerceRole, hasHigherOrEqualPrivilege, getRoleLabel, isValidRole, getAllRoles, } from './roles.js';
export type { Role } from './roles.js';
export { PERMISSION_CATEGORIES, PERMISSION_ACTIONS, PERMISSIONS, ROLE_PERMISSIONS, roleHasPermission, anyRoleHasPermission, getPermissionsForRole, getPermissionsForRoles, parsePermission, getPermissionsByCategory, isValidPermission, getAllPermissions, } from './permissions.js';
export type { PermissionCategory, PermissionAction, Permission } from './permissions.js';
export declare const USER_STATUS: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly SUSPENDED: "suspended";
    readonly REJECTED: "rejected";
};
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export declare const AUTH_ERROR_CODES: {
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN";
    readonly NO_REFRESH_TOKEN: "NO_REFRESH_TOKEN";
    readonly AUTH_REQUIRED: "AUTH_REQUIRED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly INVALID_USER: "INVALID_USER";
    readonly SOCIAL_LOGIN_REQUIRED: "SOCIAL_LOGIN_REQUIRED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly ACCOUNT_NOT_ACTIVE: "ACCOUNT_NOT_ACTIVE";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED";
    readonly EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED";
    readonly ROLE_REQUIRED: "ROLE_REQUIRED";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS";
    readonly EMAIL_EXISTS: "EMAIL_EXISTS";
    readonly PASSWORD_VALIDATION_FAILED: "PASSWORD_VALIDATION_FAILED";
    readonly INVALID_RESET_TOKEN: "INVALID_RESET_TOKEN";
    readonly INVALID_VERIFICATION_TOKEN: "INVALID_VERIFICATION_TOKEN";
};
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
export interface RoleAssignment {
    id: string;
    userId: string;
    role: string;
    isActive: boolean;
    validFrom: string | Date | null;
    validUntil: string | Date | null;
    assignedAt?: string | Date;
    assignedBy?: string | null;
}
export interface User {
    id: string;
    email: string;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    status: UserStatus;
    isEmailVerified?: boolean;
    lastLoginAt?: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    role?: string;
    assignments?: RoleAssignment[];
    permissions?: string[];
    metadata?: Record<string, unknown>;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface AuthResponse {
    ok: boolean;
    data?: {
        user: User;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        sessionId?: string;
    };
    error?: AuthErrorCode;
    message?: string;
}
export interface MeResponse {
    id: string;
    email: string;
    name: string | null;
    status: UserStatus;
    assignments: RoleAssignment[];
    avatar?: string | null;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}
export interface LoginCredentials {
    email: string;
    password: string;
    deviceId?: string;
}
export interface RegisterData {
    email: string;
    password: string;
    passwordConfirm: string;
    name: string;
    role?: string;
    tos: boolean;
    privacyAccepted?: boolean;
    marketingAccepted?: boolean;
}
export interface JWTPayload {
    id: string;
    userId: string;
    email: string;
    role: string;
    status: UserStatus;
    name?: string;
    iat?: number;
    exp?: number;
    tokenFamily?: string;
}
export interface SessionInfo {
    id: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: string | Date;
    expiresAt: string | Date;
    isActive: boolean;
}
//# sourceMappingURL=index.d.ts.map