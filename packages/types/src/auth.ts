// Authentication related types
// UserRole is now dynamic - any string from database is valid
export type UserRole = string;

// Permissions should also be dynamic, but we keep common ones for type hints
export type Permission = string;

// Common permissions for type hints (not exhaustive)
export const COMMON_PERMISSIONS = {
  APPS_MANAGE: 'apps:manage',
  APPS_VIEW: 'apps:view',
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_WRITE: 'categories:write',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_WRITE: 'templates:write',
  MENUS_READ: 'menus:read',
  MENUS_WRITE: 'menus:write',
  ECOMMERCE_READ: 'ecommerce:read',
  ECOMMERCE_WRITE: 'ecommerce:write',
  ORDERS_MANAGE: 'orders:manage',
  PRODUCTS_MANAGE: 'products:manage',
  FORUM_MODERATE: 'forum:moderate',
  SYSTEM_ADMIN: 'system:admin'
} as const;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole; // Dynamic role from database
  permissions?: Permission[]; // Dynamic permissions from database
  isApproved?: boolean;
  avatar?: string;
  lastLoginAt?: Date;
  status?: 'active' | 'inactive' | 'pending';
  // Domain extension properties (WO-DOMAIN-TYPE-EXTENSION)
  organizationId?: string;
  organizationName?: string;
  supplierId?: string;
  phone?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionStatus {
  isValid: boolean;
  expiresAt: Date;
  remainingTime: number;
}