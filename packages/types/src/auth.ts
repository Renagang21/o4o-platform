// Authentication related types
export type UserRole = 'admin' | 'business' | 'affiliate' | 'partner' | 'customer' | 'seller' | 'supplier' | 'vendor' | 'manager' | 'retailer';

export type Permission =
  | 'apps:manage'
  | 'apps:view'
  | 'content:read'
  | 'content:write'
  | 'categories:read'
  | 'categories:write'
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write'
  | 'templates:read'
  | 'templates:write'
  | 'menus:read'
  | 'menus:write'
  | 'ecommerce:read'
  | 'ecommerce:write'
  | 'orders:manage'
  | 'products:manage'
  | 'forum:moderate'
  | 'system:admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: Permission[];
  isApproved?: boolean;
  avatar?: string;
  lastLoginAt?: Date;
  status?: 'active' | 'inactive' | 'pending';
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