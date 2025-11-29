import { Request } from 'express';
export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    VENDOR = "vendor",
    SELLER = "seller",
    USER = "user",// General user role (previously CUSTOMER)
    BUSINESS = "business",
    PARTNER = "partner",// 파트너: 제휴 마케팅, 커미션 (AFFILIATE와 통합)
    SUPPLIER = "supplier",// 공급자: 상품 제공, 재고 관리
    MANAGER = "manager",
    CUSTOMER = "customer"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    PENDING = "pending",
    APPROVED = "approved",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export interface JWTPayload {
    id: string;
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
export interface AuthRequest extends Request {
    user?: any;
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
    businessName?: string;
    businessNumber?: string;
    businessType?: string;
    ceoName?: string;
    address?: string;
    telecomLicense?: string;
    phone?: string;
    email?: string;
    website?: string;
    metadata?: Record<string, any>;
}
export interface AccessTokenPayload {
    userId?: string;
    id?: string;
    email?: string;
    role?: UserRole | string;
    name?: string;
    status?: UserStatus | string;
    businessInfo?: BusinessInfo;
    permissions?: string[];
    domain?: string;
    sub?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    lastLoginAt?: Date | string;
    iat?: number;
    exp?: number;
}
export interface RefreshTokenPayload {
    userId: string;
    tokenVersion: number;
    sub?: string;
    tokenFamily?: string;
    iat?: number;
    exp?: number;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
}
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
//# sourceMappingURL=auth.d.ts.map