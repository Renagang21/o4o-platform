/**
 * O4O Platform Permission Definitions
 * Single Source of Truth (SSOT) for all permissions
 *
 * Permission format: {category}.{action}
 * Categories align with platform modules/features
 */
import { Role } from './roles.js';
/**
 * Permission Categories
 */
export declare const PERMISSION_CATEGORIES: {
    readonly SYSTEM: "system";
    readonly USERS: "users";
    readonly ROLES: "roles";
    readonly CONTENT: "content";
    readonly POSTS: "posts";
    readonly PAGES: "pages";
    readonly MEDIA: "media";
    readonly TEMPLATES: "templates";
    readonly MENUS: "menus";
    readonly CATEGORIES: "categories";
    readonly CMS: "cms";
    readonly BLOCKS: "blocks";
    readonly SHORTCODES: "shortcodes";
    readonly PRODUCTS: "products";
    readonly ORDERS: "orders";
    readonly CUSTOMERS: "customers";
    readonly INVENTORY: "inventory";
    readonly DROPSHIPPING: "dropshipping";
    readonly SUPPLIERS: "suppliers";
    readonly PARTNERS: "partners";
    readonly SETTINGS: "settings";
    readonly APPEARANCE: "appearance";
    readonly ANALYTICS: "analytics";
    readonly REPORTS: "reports";
    readonly APPS: "apps";
    readonly APPSTORE: "appstore";
};
export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES];
/**
 * Permission Actions
 */
export declare const PERMISSION_ACTIONS: {
    readonly VIEW: "view";
    readonly CREATE: "create";
    readonly EDIT: "edit";
    readonly DELETE: "delete";
    readonly MANAGE: "manage";
    readonly PUBLISH: "publish";
    readonly EXPORT: "export";
    readonly IMPORT: "import";
};
export type PermissionAction = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];
/**
 * All Platform Permissions
 */
export declare const PERMISSIONS: {
    readonly 'system.admin': "system.admin";
    readonly 'system.settings': "system.settings";
    readonly 'users.view': "users.view";
    readonly 'users.create': "users.create";
    readonly 'users.edit': "users.edit";
    readonly 'users.delete': "users.delete";
    readonly 'users.manage': "users.manage";
    readonly 'roles.view': "roles.view";
    readonly 'roles.manage': "roles.manage";
    readonly 'roles.assign': "roles.assign";
    readonly 'content.view': "content.view";
    readonly 'content.create': "content.create";
    readonly 'content.edit': "content.edit";
    readonly 'content.delete': "content.delete";
    readonly 'content.publish': "content.publish";
    readonly 'posts.view': "posts.view";
    readonly 'posts.create': "posts.create";
    readonly 'posts.edit': "posts.edit";
    readonly 'posts.delete': "posts.delete";
    readonly 'posts.publish': "posts.publish";
    readonly 'pages.view': "pages.view";
    readonly 'pages.create': "pages.create";
    readonly 'pages.edit': "pages.edit";
    readonly 'pages.delete': "pages.delete";
    readonly 'pages.publish': "pages.publish";
    readonly 'media.view': "media.view";
    readonly 'media.upload': "media.upload";
    readonly 'media.edit': "media.edit";
    readonly 'media.delete': "media.delete";
    readonly 'templates.view': "templates.view";
    readonly 'templates.create': "templates.create";
    readonly 'templates.edit': "templates.edit";
    readonly 'templates.delete': "templates.delete";
    readonly 'templates.publish': "templates.publish";
    readonly 'menus.view': "menus.view";
    readonly 'menus.manage': "menus.manage";
    readonly 'categories.view': "categories.view";
    readonly 'categories.manage': "categories.manage";
    readonly 'cms.dashboard.view': "cms.dashboard.view";
    readonly 'cms.templates.edit': "cms.templates.edit";
    readonly 'cms.blocks.manage': "cms.blocks.manage";
    readonly 'cms.shortcodes.manage': "cms.shortcodes.manage";
    readonly 'products.view': "products.view";
    readonly 'products.create': "products.create";
    readonly 'products.edit': "products.edit";
    readonly 'products.delete': "products.delete";
    readonly 'products.manage': "products.manage";
    readonly 'orders.view': "orders.view";
    readonly 'orders.create': "orders.create";
    readonly 'orders.edit': "orders.edit";
    readonly 'orders.manage': "orders.manage";
    readonly 'customers.view': "customers.view";
    readonly 'customers.manage': "customers.manage";
    readonly 'inventory.view': "inventory.view";
    readonly 'inventory.manage': "inventory.manage";
    readonly 'dropshipping.dashboard.view': "dropshipping.dashboard.view";
    readonly 'dropshipping.products.view': "dropshipping.products.view";
    readonly 'dropshipping.products.manage': "dropshipping.products.manage";
    readonly 'dropshipping.orders.view': "dropshipping.orders.view";
    readonly 'dropshipping.orders.manage': "dropshipping.orders.manage";
    readonly 'suppliers.view': "suppliers.view";
    readonly 'suppliers.manage': "suppliers.manage";
    readonly 'partners.view': "partners.view";
    readonly 'partners.manage': "partners.manage";
    readonly 'settings.view': "settings.view";
    readonly 'settings.edit': "settings.edit";
    readonly 'appearance.view': "appearance.view";
    readonly 'appearance.edit': "appearance.edit";
    readonly 'appearance.themes': "appearance.themes";
    readonly 'appearance.customize': "appearance.customize";
    readonly 'analytics.view': "analytics.view";
    readonly 'analytics.export': "analytics.export";
    readonly 'reports.view': "reports.view";
    readonly 'reports.create': "reports.create";
    readonly 'reports.export': "reports.export";
    readonly 'apps.view': "apps.view";
    readonly 'apps.install': "apps.install";
    readonly 'apps.manage': "apps.manage";
    readonly 'apps.configure': "apps.configure";
    readonly 'appstore.view': "appstore.view";
    readonly 'appstore.purchase': "appstore.purchase";
    readonly 'admin.dashboard.view': "admin.dashboard.view";
    readonly 'admin.users.manage': "admin.users.manage";
    readonly 'admin.settings.manage': "admin.settings.manage";
    readonly 'commerce.products.manage': "commerce.products.manage";
    readonly 'commerce.orders.manage': "commerce.orders.manage";
    readonly 'commerce.customers.manage': "commerce.customers.manage";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
/**
 * Role-Permission Mapping
 * Defines which permissions each role has
 */
export declare const ROLE_PERMISSIONS: Record<Role, Permission[]>;
/**
 * Check if a role has a specific permission
 */
export declare function roleHasPermission(role: string, permission: string): boolean;
/**
 * Check if any of the roles has a specific permission
 */
export declare function anyRoleHasPermission(roles: string[], permission: string): boolean;
/**
 * Get all permissions for a role
 */
export declare function getPermissionsForRole(role: string): Permission[];
/**
 * Get all permissions for multiple roles (union)
 */
export declare function getPermissionsForRoles(roles: string[]): Permission[];
/**
 * Parse permission string into category and action
 */
export declare function parsePermission(permission: string): {
    category: string;
    action: string;
};
/**
 * Get all permissions for a category
 */
export declare function getPermissionsByCategory(category: string): Permission[];
/**
 * Validate if a string is a valid permission
 */
export declare function isValidPermission(permission: string): permission is Permission;
/**
 * Get all permissions as an array
 */
export declare function getAllPermissions(): Permission[];
//# sourceMappingURL=permissions.d.ts.map