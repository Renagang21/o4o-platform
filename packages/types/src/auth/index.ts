/**
 * O4O Platform Auth Types
 * Single Source of Truth (SSOT) for authentication and authorization
 */

// Role definitions - values
export {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_LABELS_EN,
  ADMIN_ROLES,
  COMMERCE_ROLES,
  PARTNERSHIP_ROLES,
  isAdminRole,
  isCommerceRole,
  hasHigherOrEqualPrivilege,
  getRoleLabel,
  isValidRole,
  getAllRoles,
} from './roles.js';

// Role definitions - types
export type { Role } from './roles.js';

// Permission definitions - values
export {
  PERMISSION_CATEGORIES,
  PERMISSION_ACTIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
  anyRoleHasPermission,
  getPermissionsForRole,
  getPermissionsForRoles,
  parsePermission,
  getPermissionsByCategory,
  isValidPermission,
  getAllPermissions,
} from './permissions.js';

// Permission definitions - types
export type { PermissionCategory, PermissionAction, Permission } from './permissions.js';

// User status enum
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

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
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

// Role Assignment interface (P0 RBAC)
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

// User interface (compatible with all apps)
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

  // Legacy role field (deprecated, use assignments)
  role?: string;

  // P0 RBAC: Role assignments
  assignments?: RoleAssignment[];

  // Direct permissions (not from roles)
  permissions?: string[];

  // Metadata
  metadata?: Record<string, unknown>;
}

// Auth tokens interface
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// Auth response interface (standardized)
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

// Me response interface
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

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
  deviceId?: string;
}

// Register data
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

// JWT payload
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

// Session info
export interface SessionInfo {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string | Date;
  expiresAt: string | Date;
  isActive: boolean;
}
