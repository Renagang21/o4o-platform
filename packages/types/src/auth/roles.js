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
export const ROLES = {
    // Base roles
    USER: 'user',
    MEMBER: 'member',
    CONTRIBUTOR: 'contributor',
    // Commerce roles
    SELLER: 'seller',
    VENDOR: 'vendor',
    SUPPLIER: 'supplier',
    // Partnership roles
    PARTNER: 'partner',
    AFFILIATE: 'affiliate',
    // Management roles
    OPERATOR: 'operator',
    MANAGER: 'manager',
    // Admin roles
    ADMIN: 'admin',
    ADMINISTRATOR: 'administrator',
    SUPER_ADMIN: 'super_admin',
    // Legacy aliases (for backward compatibility)
    CUSTOMER: 'customer', // Deprecated: use USER
    BUSINESS: 'business', // Deprecated: use VENDOR
};
/**
 * Role Hierarchy Levels
 * Higher number = more privileges
 */
export const ROLE_HIERARCHY = {
    // Base roles (1-10)
    [ROLES.USER]: 1,
    [ROLES.CUSTOMER]: 1, // Deprecated alias
    [ROLES.MEMBER]: 2,
    [ROLES.CONTRIBUTOR]: 3,
    // Commerce roles (10-20)
    [ROLES.SELLER]: 10,
    [ROLES.VENDOR]: 11,
    [ROLES.BUSINESS]: 11, // Deprecated alias
    [ROLES.SUPPLIER]: 12,
    // Partnership roles (20-30)
    [ROLES.AFFILIATE]: 20,
    [ROLES.PARTNER]: 25,
    // Management roles (50-60)
    [ROLES.MANAGER]: 50,
    [ROLES.OPERATOR]: 55,
    // Admin roles (90-100)
    [ROLES.ADMIN]: 90,
    [ROLES.ADMINISTRATOR]: 90,
    [ROLES.SUPER_ADMIN]: 100,
};
/**
 * Role Display Names (Korean)
 */
export const ROLE_LABELS = {
    [ROLES.USER]: '사용자',
    [ROLES.CUSTOMER]: '고객',
    [ROLES.MEMBER]: '멤버',
    [ROLES.CONTRIBUTOR]: '기여자',
    [ROLES.SELLER]: '판매자',
    [ROLES.VENDOR]: '벤더',
    [ROLES.BUSINESS]: '비즈니스',
    [ROLES.SUPPLIER]: '공급자',
    [ROLES.AFFILIATE]: '제휴회원',
    [ROLES.PARTNER]: '파트너',
    [ROLES.MANAGER]: '매니저',
    [ROLES.OPERATOR]: '운영자',
    [ROLES.ADMIN]: '관리자',
    [ROLES.ADMINISTRATOR]: '관리자',
    [ROLES.SUPER_ADMIN]: '최고관리자',
};
/**
 * Role Display Names (English)
 */
export const ROLE_LABELS_EN = {
    [ROLES.USER]: 'User',
    [ROLES.CUSTOMER]: 'Customer',
    [ROLES.MEMBER]: 'Member',
    [ROLES.CONTRIBUTOR]: 'Contributor',
    [ROLES.SELLER]: 'Seller',
    [ROLES.VENDOR]: 'Vendor',
    [ROLES.BUSINESS]: 'Business',
    [ROLES.SUPPLIER]: 'Supplier',
    [ROLES.AFFILIATE]: 'Affiliate',
    [ROLES.PARTNER]: 'Partner',
    [ROLES.MANAGER]: 'Manager',
    [ROLES.OPERATOR]: 'Operator',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.ADMINISTRATOR]: 'Administrator',
    [ROLES.SUPER_ADMIN]: 'Super Admin',
};
/**
 * Admin Roles - Roles with administrative privileges
 */
export const ADMIN_ROLES = [
    ROLES.ADMIN,
    ROLES.ADMINISTRATOR,
    ROLES.SUPER_ADMIN,
    ROLES.OPERATOR,
];
/**
 * Commerce Roles - Roles for e-commerce operations
 */
export const COMMERCE_ROLES = [
    ROLES.SELLER,
    ROLES.VENDOR,
    ROLES.SUPPLIER,
    ROLES.BUSINESS,
];
/**
 * Partnership Roles - Roles for partnership programs
 */
export const PARTNERSHIP_ROLES = [
    ROLES.PARTNER,
    ROLES.AFFILIATE,
];
/**
 * Check if a role is an admin role
 */
export function isAdminRole(role) {
    return ADMIN_ROLES.includes(role);
}
/**
 * Check if a role is a commerce role
 */
export function isCommerceRole(role) {
    return COMMERCE_ROLES.includes(role);
}
/**
 * Check if roleA has higher or equal privileges than roleB
 */
export function hasHigherOrEqualPrivilege(roleA, roleB) {
    const levelA = ROLE_HIERARCHY[roleA] ?? 0;
    const levelB = ROLE_HIERARCHY[roleB] ?? 0;
    return levelA >= levelB;
}
/**
 * Get role label by locale
 */
export function getRoleLabel(role, locale = 'ko') {
    const labels = locale === 'ko' ? ROLE_LABELS : ROLE_LABELS_EN;
    return labels[role] ?? role;
}
/**
 * Validate if a string is a valid role
 */
export function isValidRole(role) {
    return Object.values(ROLES).includes(role);
}
/**
 * Get all valid roles as an array
 */
export function getAllRoles() {
    return Object.values(ROLES);
}
//# sourceMappingURL=roles.js.map