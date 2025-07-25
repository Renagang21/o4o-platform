// Authentication and Authorization Types

import { Request } from 'express';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  SELLER = 'seller',
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  MODERATOR = 'moderator',
  PARTNER = 'partner',
  // Legacy roles kept for backward compatibility
  SUPPLIER = 'supplier',
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

export interface AuthRequest extends Request {
  user?: JWTPayload;
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