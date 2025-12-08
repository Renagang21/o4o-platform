/**
 * O4O Platform Permission Definitions
 * Single Source of Truth (SSOT) for all permissions
 *
 * Permission format: {category}.{action}
 * Categories align with platform modules/features
 */

import { ROLES, Role } from './roles.js';

/**
 * Permission Categories
 */
export const PERMISSION_CATEGORIES = {
  // Core system
  SYSTEM: 'system',
  USERS: 'users',
  ROLES: 'roles',

  // Content Management
  CONTENT: 'content',
  POSTS: 'posts',
  PAGES: 'pages',
  MEDIA: 'media',
  TEMPLATES: 'templates',
  MENUS: 'menus',
  CATEGORIES: 'categories',

  // CMS Features
  CMS: 'cms',
  BLOCKS: 'blocks',
  SHORTCODES: 'shortcodes',

  // Commerce
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  INVENTORY: 'inventory',

  // Dropshipping
  DROPSHIPPING: 'dropshipping',
  SUPPLIERS: 'suppliers',
  PARTNERS: 'partners',

  // Settings & Config
  SETTINGS: 'settings',
  APPEARANCE: 'appearance',

  // Analytics
  ANALYTICS: 'analytics',
  REPORTS: 'reports',

  // Apps
  APPS: 'apps',
  APPSTORE: 'appstore',
} as const;

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES];

/**
 * Permission Actions
 */
export const PERMISSION_ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  MANAGE: 'manage',
  PUBLISH: 'publish',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

/**
 * All Platform Permissions
 */
export const PERMISSIONS = {
  // System
  'system.admin': 'system.admin',
  'system.settings': 'system.settings',

  // Users
  'users.view': 'users.view',
  'users.create': 'users.create',
  'users.edit': 'users.edit',
  'users.delete': 'users.delete',
  'users.manage': 'users.manage',

  // Roles
  'roles.view': 'roles.view',
  'roles.manage': 'roles.manage',
  'roles.assign': 'roles.assign',

  // Content
  'content.view': 'content.view',
  'content.create': 'content.create',
  'content.edit': 'content.edit',
  'content.delete': 'content.delete',
  'content.publish': 'content.publish',

  // Posts
  'posts.view': 'posts.view',
  'posts.create': 'posts.create',
  'posts.edit': 'posts.edit',
  'posts.delete': 'posts.delete',
  'posts.publish': 'posts.publish',

  // Pages
  'pages.view': 'pages.view',
  'pages.create': 'pages.create',
  'pages.edit': 'pages.edit',
  'pages.delete': 'pages.delete',
  'pages.publish': 'pages.publish',

  // Media
  'media.view': 'media.view',
  'media.upload': 'media.upload',
  'media.edit': 'media.edit',
  'media.delete': 'media.delete',

  // Templates
  'templates.view': 'templates.view',
  'templates.create': 'templates.create',
  'templates.edit': 'templates.edit',
  'templates.delete': 'templates.delete',
  'templates.publish': 'templates.publish',

  // Menus
  'menus.view': 'menus.view',
  'menus.manage': 'menus.manage',

  // Categories
  'categories.view': 'categories.view',
  'categories.manage': 'categories.manage',

  // CMS
  'cms.dashboard.view': 'cms.dashboard.view',
  'cms.templates.edit': 'cms.templates.edit',
  'cms.blocks.manage': 'cms.blocks.manage',
  'cms.shortcodes.manage': 'cms.shortcodes.manage',

  // Products
  'products.view': 'products.view',
  'products.create': 'products.create',
  'products.edit': 'products.edit',
  'products.delete': 'products.delete',
  'products.manage': 'products.manage',

  // Orders
  'orders.view': 'orders.view',
  'orders.create': 'orders.create',
  'orders.edit': 'orders.edit',
  'orders.manage': 'orders.manage',

  // Customers
  'customers.view': 'customers.view',
  'customers.manage': 'customers.manage',

  // Inventory
  'inventory.view': 'inventory.view',
  'inventory.manage': 'inventory.manage',

  // Dropshipping
  'dropshipping.dashboard.view': 'dropshipping.dashboard.view',
  'dropshipping.products.view': 'dropshipping.products.view',
  'dropshipping.products.manage': 'dropshipping.products.manage',
  'dropshipping.orders.view': 'dropshipping.orders.view',
  'dropshipping.orders.manage': 'dropshipping.orders.manage',

  // Suppliers
  'suppliers.view': 'suppliers.view',
  'suppliers.manage': 'suppliers.manage',

  // Partners
  'partners.view': 'partners.view',
  'partners.manage': 'partners.manage',

  // Settings
  'settings.view': 'settings.view',
  'settings.edit': 'settings.edit',

  // Appearance
  'appearance.view': 'appearance.view',
  'appearance.edit': 'appearance.edit',
  'appearance.themes': 'appearance.themes',
  'appearance.customize': 'appearance.customize',

  // Analytics
  'analytics.view': 'analytics.view',
  'analytics.export': 'analytics.export',

  // Reports
  'reports.view': 'reports.view',
  'reports.create': 'reports.create',
  'reports.export': 'reports.export',

  // Apps
  'apps.view': 'apps.view',
  'apps.install': 'apps.install',
  'apps.manage': 'apps.manage',
  'apps.configure': 'apps.configure',

  // AppStore
  'appstore.view': 'appstore.view',
  'appstore.purchase': 'appstore.purchase',

  // Admin Dashboard
  'admin.dashboard.view': 'admin.dashboard.view',
  'admin.users.manage': 'admin.users.manage',
  'admin.settings.manage': 'admin.settings.manage',

  // Commerce Management
  'commerce.products.manage': 'commerce.products.manage',
  'commerce.orders.manage': 'commerce.orders.manage',
  'commerce.customers.manage': 'commerce.customers.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role-Permission Mapping
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // User - Basic access
  [ROLES.USER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['media.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['orders.view'],
  ],

  // Customer (deprecated alias for User)
  [ROLES.CUSTOMER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['media.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['orders.view'],
  ],

  // Member - Extended user
  [ROLES.MEMBER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['content.create'],
    PERMISSIONS['media.view'],
    PERMISSIONS['media.upload'],
    PERMISSIONS['products.view'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['orders.create'],
  ],

  // Contributor - Content creator
  [ROLES.CONTRIBUTOR]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['content.create'],
    PERMISSIONS['content.edit'],
    PERMISSIONS['posts.view'],
    PERMISSIONS['posts.create'],
    PERMISSIONS['posts.edit'],
    PERMISSIONS['media.view'],
    PERMISSIONS['media.upload'],
    PERMISSIONS['media.edit'],
  ],

  // Seller - E-commerce seller
  [ROLES.SELLER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['products.create'],
    PERMISSIONS['products.edit'],
    PERMISSIONS['products.manage'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['orders.manage'],
    PERMISSIONS['customers.view'],
    PERMISSIONS['inventory.view'],
    PERMISSIONS['inventory.manage'],
    PERMISSIONS['analytics.view'],
    PERMISSIONS['dropshipping.dashboard.view'],
  ],

  // Vendor - Business vendor
  [ROLES.VENDOR]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['products.create'],
    PERMISSIONS['products.edit'],
    PERMISSIONS['products.manage'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['orders.manage'],
    PERMISSIONS['customers.view'],
    PERMISSIONS['inventory.view'],
    PERMISSIONS['inventory.manage'],
    PERMISSIONS['analytics.view'],
  ],

  // Business (deprecated alias)
  [ROLES.BUSINESS]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['products.create'],
    PERMISSIONS['products.edit'],
    PERMISSIONS['products.manage'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['orders.manage'],
    PERMISSIONS['customers.view'],
    PERMISSIONS['inventory.view'],
    PERMISSIONS['inventory.manage'],
    PERMISSIONS['analytics.view'],
  ],

  // Supplier - Dropshipping supplier
  [ROLES.SUPPLIER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['products.create'],
    PERMISSIONS['products.edit'],
    PERMISSIONS['products.manage'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['inventory.view'],
    PERMISSIONS['inventory.manage'],
    PERMISSIONS['dropshipping.dashboard.view'],
    PERMISSIONS['dropshipping.products.view'],
    PERMISSIONS['dropshipping.products.manage'],
    PERMISSIONS['dropshipping.orders.view'],
    PERMISSIONS['dropshipping.orders.manage'],
    PERMISSIONS['analytics.view'],
    PERMISSIONS['reports.view'],
  ],

  // Affiliate
  [ROLES.AFFILIATE]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['analytics.view'],
    PERMISSIONS['reports.view'],
  ],

  // Partner - Dropshipping partner
  [ROLES.PARTNER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['products.view'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['dropshipping.dashboard.view'],
    PERMISSIONS['dropshipping.products.view'],
    PERMISSIONS['dropshipping.orders.view'],
    PERMISSIONS['analytics.view'],
    PERMISSIONS['reports.view'],
    PERMISSIONS['partners.view'],
  ],

  // Manager
  [ROLES.MANAGER]: [
    PERMISSIONS['content.view'],
    PERMISSIONS['content.create'],
    PERMISSIONS['content.edit'],
    PERMISSIONS['posts.view'],
    PERMISSIONS['posts.create'],
    PERMISSIONS['posts.edit'],
    PERMISSIONS['posts.publish'],
    PERMISSIONS['pages.view'],
    PERMISSIONS['pages.create'],
    PERMISSIONS['pages.edit'],
    PERMISSIONS['media.view'],
    PERMISSIONS['media.upload'],
    PERMISSIONS['media.edit'],
    PERMISSIONS['products.view'],
    PERMISSIONS['products.edit'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['orders.manage'],
    PERMISSIONS['customers.view'],
    PERMISSIONS['analytics.view'],
    PERMISSIONS['reports.view'],
    PERMISSIONS['reports.create'],
  ],

  // Operator - System operator
  [ROLES.OPERATOR]: [
    PERMISSIONS['admin.dashboard.view'],
    PERMISSIONS['content.view'],
    PERMISSIONS['content.create'],
    PERMISSIONS['content.edit'],
    PERMISSIONS['content.delete'],
    PERMISSIONS['content.publish'],
    PERMISSIONS['posts.view'],
    PERMISSIONS['posts.create'],
    PERMISSIONS['posts.edit'],
    PERMISSIONS['posts.delete'],
    PERMISSIONS['posts.publish'],
    PERMISSIONS['pages.view'],
    PERMISSIONS['pages.create'],
    PERMISSIONS['pages.edit'],
    PERMISSIONS['pages.delete'],
    PERMISSIONS['pages.publish'],
    PERMISSIONS['media.view'],
    PERMISSIONS['media.upload'],
    PERMISSIONS['media.edit'],
    PERMISSIONS['media.delete'],
    PERMISSIONS['templates.view'],
    PERMISSIONS['templates.edit'],
    PERMISSIONS['menus.view'],
    PERMISSIONS['menus.manage'],
    PERMISSIONS['categories.view'],
    PERMISSIONS['categories.manage'],
    PERMISSIONS['cms.dashboard.view'],
    PERMISSIONS['cms.templates.edit'],
    PERMISSIONS['products.view'],
    PERMISSIONS['products.edit'],
    PERMISSIONS['products.manage'],
    PERMISSIONS['orders.view'],
    PERMISSIONS['orders.manage'],
    PERMISSIONS['customers.view'],
    PERMISSIONS['customers.manage'],
    PERMISSIONS['settings.view'],
    PERMISSIONS['appearance.view'],
    PERMISSIONS['appearance.edit'],
    PERMISSIONS['analytics.view'],
    PERMISSIONS['analytics.export'],
    PERMISSIONS['reports.view'],
    PERMISSIONS['reports.create'],
    PERMISSIONS['reports.export'],
    PERMISSIONS['apps.view'],
    PERMISSIONS['apps.configure'],
  ],

  // Admin
  [ROLES.ADMIN]: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],

  // Administrator (alias for Admin)
  [ROLES.ADMINISTRATOR]: [
    ...Object.values(PERMISSIONS),
  ],

  // Super Admin - Full system access
  [ROLES.SUPER_ADMIN]: [
    ...Object.values(PERMISSIONS),
    PERMISSIONS['system.admin'],
    PERMISSIONS['system.settings'],
  ],
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[role as Role];
  if (!rolePerms) return false;
  return rolePerms.includes(permission as Permission);
}

/**
 * Check if any of the roles has a specific permission
 */
export function anyRoleHasPermission(roles: string[], permission: string): boolean {
  return roles.some((role) => roleHasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

/**
 * Get all permissions for multiple roles (union)
 */
export function getPermissionsForRoles(roles: string[]): Permission[] {
  const allPerms = new Set<Permission>();
  for (const role of roles) {
    const perms = getPermissionsForRole(role);
    perms.forEach((p) => allPerms.add(p));
  }
  return Array.from(allPerms);
}

/**
 * Parse permission string into category and action
 */
export function parsePermission(permission: string): { category: string; action: string } {
  const [category, action] = permission.split('.');
  return { category, action };
}

/**
 * Get all permissions for a category
 */
export function getPermissionsByCategory(category: string): Permission[] {
  return Object.values(PERMISSIONS).filter((p) => p.startsWith(`${category}.`));
}

/**
 * Validate if a string is a valid permission
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(PERMISSIONS).includes(permission as Permission);
}

/**
 * Get all permissions as an array
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}
