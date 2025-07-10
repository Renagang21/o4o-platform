// Authentication and Authorization Types

import { Request } from 'express';

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin', 
  SELLER = 'seller',
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
  businessInfo?: any;
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
  businessInfo?: any;
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
}

// Token-specific types
export interface AccessTokenPayload {
  userId?: string;
  id?: string; // Primary ID field
  email?: string;
  role?: UserRole | string; // Allow string for backward compatibility
  name?: string;
  status?: UserStatus | string;
  businessInfo?: any;
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

export interface LoginResponse {
  user: any; // Will be replaced with proper User type
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
  fallbackData?: any;
  staticContent?: string;
  fallbackUrl?: string;
  readOnlyMode?: boolean;
  essentialOnly?: boolean;
  disabledFeatures?: string[];
  [key: string]: any;
}