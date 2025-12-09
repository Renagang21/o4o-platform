/**
 * O4O Platform Role Definitions
 * Single Source of Truth (SSOT) for all user roles
 *
 * This file defines all valid roles in the O4O platform.
 * Both frontend and backend MUST use these definitions.
 */
/**
 * Role Constants
 * Use these constants instead of string literals
 */
export declare const ROLES: {
    readonly USER: "user";
    readonly MEMBER: "member";
    readonly CONTRIBUTOR: "contributor";
    readonly SELLER: "seller";
    readonly VENDOR: "vendor";
    readonly SUPPLIER: "supplier";
    readonly PARTNER: "partner";
    readonly AFFILIATE: "affiliate";
    readonly OPERATOR: "operator";
    readonly MANAGER: "manager";
    readonly ADMIN: "admin";
    readonly ADMINISTRATOR: "administrator";
    readonly SUPER_ADMIN: "super_admin";
    readonly CUSTOMER: "customer";
    readonly BUSINESS: "business";
};
/**
 * Role Type - Union of all valid role values
 */
export type Role = (typeof ROLES)[keyof typeof ROLES];
/**
 * Role Hierarchy Levels
 * Higher number = more privileges
 */
export declare const ROLE_HIERARCHY: Record<Role, number>;
/**
 * Role Display Names (Korean)
 */
export declare const ROLE_LABELS: Record<Role, string>;
/**
 * Role Display Names (English)
 */
export declare const ROLE_LABELS_EN: Record<Role, string>;
/**
 * Admin Roles - Roles with administrative privileges
 */
export declare const ADMIN_ROLES: Role[];
/**
 * Commerce Roles - Roles for e-commerce operations
 */
export declare const COMMERCE_ROLES: Role[];
/**
 * Partnership Roles - Roles for partnership programs
 */
export declare const PARTNERSHIP_ROLES: Role[];
/**
 * Check if a role is an admin role
 */
export declare function isAdminRole(role: string): boolean;
/**
 * Check if a role is a commerce role
 */
export declare function isCommerceRole(role: string): boolean;
/**
 * Check if roleA has higher or equal privileges than roleB
 */
export declare function hasHigherOrEqualPrivilege(roleA: string, roleB: string): boolean;
/**
 * Get role label by locale
 */
export declare function getRoleLabel(role: string, locale?: 'ko' | 'en'): string;
/**
 * Validate if a string is a valid role
 */
export declare function isValidRole(role: string): role is Role;
/**
 * Get all valid roles as an array
 */
export declare function getAllRoles(): Role[];
//# sourceMappingURL=roles.d.ts.map