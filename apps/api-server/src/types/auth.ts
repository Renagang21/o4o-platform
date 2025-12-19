// Authentication and Authorization Types

import { Request } from 'express';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  SELLER = 'seller',
  USER = 'user',  // General user role (previously CUSTOMER)
  BUSINESS = 'business',
  PARTNER = 'partner',  // 파트너: 제휴 마케팅, 커미션 (AFFILIATE와 통합)
  // Dropshipping roles
  SUPPLIER = 'supplier',  // 공급자: 상품 제공, 재고 관리
  // Legacy roles kept for backward compatibility
  MANAGER = 'manager',
  CUSTOMER = 'customer'  // Deprecated: Use USER instead
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

/**
 * Business information for Korean e-commerce
 * Designed to comply with Korean business registration and e-commerce law
 */
export interface BusinessInfo {
  // 기본 사업자 정보
  businessName?: string;          // 사업자명 (상호명)
  businessNumber?: string;        // 사업자등록번호 (XXX-XX-XXXXX)
  businessType?: string;          // 사업자 유형 (개인/법인/개인사업자)
  ceoName?: string;               // 대표자명

  // 사업장 정보
  address?: string;               // 사업장 주소 (전체 주소 문자열)

  // 전자상거래 법적 요건
  telecomLicense?: string;        // 통신판매업 신고번호 (제XXXX-XXXXX호)

  // 연락처 정보
  phone?: string;                 // 대표 전화번호
  email?: string;                 // 사업자 이메일
  website?: string;               // 웹사이트 URL

  // 확장 가능한 메타데이터
  metadata?: Record<string, any>;
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
  // Phase 2.5: Server isolation claims
  iss?: string; // Issuer - identifies the server that issued the token
  aud?: string; // Audience - identifies the intended recipient
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
  // Phase 2.5: Server isolation claims
  iss?: string; // Issuer - identifies the server that issued the token
  aud?: string; // Audience - identifies the intended recipient
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