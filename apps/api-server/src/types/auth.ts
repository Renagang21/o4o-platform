// Authentication and Authorization Types

import { Request } from 'express';

// WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1: platform: prefix 체계로 전환
// WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
//   ADMIN = 'platform:admin' 제거. 플랫폼 전역 관리자는 SUPER_ADMIN 뿐이고,
//   서비스 관리자는 '{service}:admin' 으로 표현한다(이 enum 이 아닌 PrefixedRole 축).
export enum UserRole {
  SUPER_ADMIN = 'platform:super_admin',
  OPERATOR    = 'operator',    // 서비스운영자 (Platform Service Operator)
  MANAGER     = 'manager',
  VENDOR      = 'vendor',
  SELLER      = 'seller',
  SUPPLIER    = 'supplier',    // 공급자: 상품 제공, 재고 관리
  PARTNER     = 'partner',     // 파트너: 제휴 마케팅, 커미션
  AFFILIATE   = 'affiliate',   // 제휴 파트너 (content-assets 접근 권한에서 사용)
  BUSINESS    = 'business',
  USER        = 'user',        // 일반 회원 (previously CUSTOMER)
  CUSTOMER    = 'customer',    // Deprecated: Use USER instead
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
  ceoName?: string;               // 대표자명 (canonical)
  /** @deprecated WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1: ceoName 으로 통일. read-fallback 만 유지, 신규 write 금지. */
  representativeName?: string;

  // 사업장 정보
  address?: string;               // 사업장 주소 (전체 주소 문자열)

  // 전자상거래 법적 요건
  telecomLicense?: string;        // 통신판매업 신고번호 (제XXXX-XXXXX호)

  // 연락처 정보
  phone?: string;                 // 대표 전화번호
  email?: string;                 // 대표 이메일 (사업자 이메일) — 세금계산서 이메일은 taxInvoiceEmail 사용
  website?: string;               // 웹사이트 URL

  // 세금계산서 / 운영 (WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1)
  taxInvoiceEmail?: string;       // 세금계산서 발행용 이메일 (canonical) — email overwrite 금지
  managerPhone?: string;          // 담당자 전화번호 (canonical)

  // 확장 가능한 메타데이터
  metadata?: Record<string, any>;
}

// Token type discriminator for Platform vs Service vs Guest authentication
// Phase 1: Service User 인증 기반 구축 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
// Phase 3: Guest 인증 추가 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
export type TokenType = 'user' | 'service' | 'guest';

// Token-specific types
export interface AccessTokenPayload {
  userId?: string;
  id?: string; // Primary ID field
  email?: string;
  role?: UserRole | string; // Allow string for backward compatibility
  name?: string;
  status?: UserStatus | string;
  businessInfo?: BusinessInfo;
  // WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1 (D축):
  //   permissions claim 제거. 발급만 하고 읽는 곳이 0 이었다
  //   (payload.permissions / decoded.permissions 소비처 repo 전역 0건 ·
  //   인증 미들웨어는 req.user 에 DB 엔티티를 싣는다).
  //   위 scopes claim 제거와 동일한 판정이다.
  /** 다중 역할 배열 (WO-O4O-ROLE-MODEL-UNIFICATION-PHASE1-V1) */
  roles?: string[];
  // WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
  //   scopes claim 제거. 인증 미들웨어가 req.user 로 전달한 적이 없어
  //   백엔드 권한 판정에 연결된 적 없는 미완성 축이었다.
  //   프런트 user.scopes 는 GET /auth/me 응답에서 계속 공급된다.
  /** 서비스별 멤버십 상태 (WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1) */
  memberships?: { serviceKey: string; status: string; role?: string }[];
  /**
   * 계정 접근 상태 (WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1)
   *   'normal'     — users.status active|approved
   *   'restricted' — users.status pending (제한 로그인)
   * optional 이다: 본 WO 이전에 발급된 토큰은 이 claim 이 없으며 기존과 동일하게 동작한다.
   * **권한 판정 SSOT 는 이 claim 이 아니라 DB users.status 다** (requireAuth 가 매 요청 재조회).
   */
  accountAccess?: 'normal' | 'restricted';
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
  // Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
  /** Token type: 'user' for platform users, 'service' for service users, 'guest' for guest users */
  tokenType?: TokenType;
  /** Service ID for service user tokens */
  serviceId?: string;
  /** Store ID for service user tokens (optional) */
  storeId?: string;
  // Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
  /** Device ID for guest tokens (QR, kiosk, signage) */
  deviceId?: string;
  /** Guest session ID for tracking guest activity */
  guestSessionId?: string;
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
