// Authentication and Authorization Types

import { Request } from 'express';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  VENDOR_MANAGER = 'vendor_manager',
  SELLER = 'seller',
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  MODERATOR = 'moderator',
  PARTNER = 'partner',
  BETA_USER = 'beta_user',
  // Dropshipping roles
  SUPPLIER = 'supplier',  // 공급자: 상품 제공, 재고 관리
  AFFILIATE = 'affiliate', // 제휴자: 제휴 마케팅, 커미션
  // Legacy roles kept for backward compatibility
  MANAGER = 'manager'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export interface JWTPayload {
  id: string;  // Add id property
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  businessInfo?: BusinessInfo;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  betaUserId?: string;
  iat?: number;
  exp?: number;
}

// AuthRequest interface - using type directly instead of importing User entity to avoid circular dependency
export interface AuthRequest extends Request {
  user?: any; // Simplified to avoid type conflicts with Express Request
  authUser?: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    firstName?: string;
    lastName?: string;
    name?: string;
    businessInfo?: BusinessInfo;
    permissions: string[];
    isActive: boolean;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    vendorId?: string;
    supplierId?: string;
    betaUserId?: string;
    domain?: string;
    // Add other User properties as needed
    validatePassword?(password: string): Promise<boolean>;
    hasRole?(role: UserRole | string): boolean;
    hasAnyRole?(roles: (UserRole | string)[]): boolean;
    isAdmin?(): boolean;
    isPending?(): boolean;
    isActiveUser?(): boolean;
    toPublicData?(): any;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: UserRole;
  businessInfo?: BusinessInfo;
}

export interface UserApprovalData {
  userId: string;
  approvedAt: Date;
  approvedBy: string;
  notes?: string;
}

export interface BusinessInfo {
  companyName?: string;
  businessType?: string;
  taxId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo?: {
    phone: string;
    website?: string;
  };
  metadata?: Record<string, string | number | boolean>;
}

// Token-specific types
export interface AccessTokenPayload {
  userId?: string;
  id?: string; // Primary ID field
  email?: string;
  role?: UserRole | string; // Allow string for backward compatibility
  name?: string;
  status?: UserStatus | string;
  businessInfo?: BusinessInfo;
  permissions?: string[];
  domain?: string;
  sub?: string; // JWT standard claim
  betaUserId?: string; // Beta user ID for beta features
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastLoginAt?: Date | string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  sub?: string; // JWT standard claim
  tokenFamily?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
  domain?: string;
}

export interface UserData {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  firstName?: string;
  lastName?: string;
  businessInfo?: BusinessInfo;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface LoginResponse {
  user: UserData;
  tokens: AuthTokens;
  success?: boolean;
  sessionId?: string;
}

// Cookie configuration
export interface CookieConfig {
  name: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    domain?: string;
  };
}

// Pricing result types
export interface PricingResult {
  enabled?: boolean;
  degradationLevel?: string;
  fallbackData?: Record<string, unknown>;
  staticContent?: string;
  fallbackUrl?: string;
  readOnlyMode?: boolean;
  essentialOnly?: boolean;
  disabledFeatures?: string[];
  metadata?: Record<string, string | number | boolean | string[]>;
}