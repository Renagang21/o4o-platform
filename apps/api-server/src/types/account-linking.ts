// Account Linking Types

// Phase 1: Service User 인증 기반 구축 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
// 'service' provider는 서비스/매장 사용자 인증용으로, Platform User와 분리된 경로
export type AuthProvider = 'email' | 'google' | 'kakao' | 'naver' | 'service';

// Account linking status
export enum LinkingStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

// Linked account information
export interface LinkedAccount {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerId?: string; // OAuth provider's user ID
  email: string;
  displayName?: string;
  profileImage?: string;
  isVerified: boolean;
  isPrimary: boolean;
  linkedAt: Date;
  lastUsedAt?: Date;
}

// Account linking request
export interface LinkAccountRequest {
  provider: AuthProvider;
  code?: string; // OAuth authorization code
  email?: string; // For email provider
  password?: string; // For email provider
}

// Account unlinking request
export interface UnlinkAccountRequest {
  provider: AuthProvider;
  password?: string; // Required for security verification
}

// Account linking response
export interface LinkAccountResponse {
  success: boolean;
  message: string;
  linkedAccount?: LinkedAccount;
  requiresVerification?: boolean;
  error?: {
    code: string;
    message: string;
  };
}

// Profile merge options
export interface ProfileMergeOptions {
  preferredProvider?: AuthProvider;
  mergeFields: {
    name?: boolean;
    profileImage?: boolean;
    email?: boolean;
    phone?: boolean;
    linkedAccounts?: boolean;
    businessInfo?: boolean;
    permissions?: boolean;
    roles?: boolean;
  };
}

// Merged profile data
export interface MergedProfile {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  phone?: string;
  emailVerified: boolean;
  providers: AuthProvider[];
  linkedAccounts: LinkedAccount[];
  primaryProvider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}

// Account linking session
export interface LinkingSession {
  id: string;
  userId: string;
  provider: AuthProvider;
  status: LinkingStatus;
  verificationToken?: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

// OAuth state for account linking
export interface OAuthLinkingState {
  userId: string;
  provider: AuthProvider;
  action: 'link' | 'unlink';
  returnUrl: string;
  sessionId: string;
}

// Account merge request
export interface AccountMergeRequest {
  sourceUserId: string;
  targetUserId: string;
  mergeOptions: ProfileMergeOptions;
}

// Account merge result
export interface AccountMergeResult {
  success: boolean;
  mergedUserId: string;
  mergedProfile: MergedProfile;
  deletedUserId?: string;
  warnings?: string[];
}

// Security verification for sensitive operations
export interface SecurityVerification {
  method: 'password' | 'email' | 'sms';
  token?: string;
  password?: string;
  code?: string;
}

// Account activity log
export interface AccountActivity {
  id: string;
  userId: string;
  action: 'linked' | 'unlinked' | 'merged' | 'login' | 'failed_link';
  provider: AuthProvider;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Error codes for account linking
export enum AccountLinkingError {
  ALREADY_LINKED = 'ALREADY_LINKED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  SECURITY_VERIFICATION_FAILED = 'SECURITY_VERIFICATION_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  LAST_PROVIDER = 'LAST_PROVIDER' // Cannot unlink the last authentication method
}

// Unified login request
export interface UnifiedLoginRequest {
  provider: AuthProvider;
  credentials?: {
    email: string;
    password: string;
  };
  oauthProfile?: OAuthProfile;
  ipAddress: string;
  userAgent: string;
}

// OAuth profile from provider
export interface OAuthProfile {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
  metadata?: Record<string, any>;
}

// Unified login response
export interface UnifiedLoginResponse {
  success: boolean;
  user: any; // User public data
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  sessionId: string;
  linkedAccounts: LinkedAccount[];
  isNewUser: boolean;
  autoLinked?: boolean;
}

// ============================================================================
// Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
// ============================================================================

/**
 * Service User Login Credentials
 * OAuth provider 기반 서비스 사용자 인증
 */
export interface ServiceLoginCredentials {
  /** OAuth provider (google, kakao, naver) */
  provider: 'google' | 'kakao' | 'naver';
  /** OAuth provider's access token or authorization code */
  oauthToken: string;
  /** Service identifier (e.g., 'neture', 'k-cosmetics') */
  serviceId: string;
  /** Optional store identifier */
  storeId?: string;
}

/**
 * Service User Login Request
 */
export interface ServiceUserLoginRequest {
  credentials: ServiceLoginCredentials;
  ipAddress: string;
  userAgent: string;
}

/**
 * Service User public data (returned in login response)
 */
export interface ServiceUserData {
  /** Provider's user ID */
  providerUserId: string;
  /** OAuth provider */
  provider: 'google' | 'kakao' | 'naver';
  /** User email from OAuth */
  email: string;
  /** Display name from OAuth */
  displayName?: string;
  /** Profile image from OAuth */
  profileImage?: string;
  /** Service ID */
  serviceId: string;
  /** Store ID (optional) */
  storeId?: string;
}

/**
 * Service User Login Response
 */
export interface ServiceUserLoginResponse {
  success: boolean;
  user: ServiceUserData;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  /** Token type is always 'service' for service users */
  tokenType: 'service';
}

// ============================================================================
// Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
// ============================================================================

/**
 * Guest Token Issue Request
 * QR/키오스크/사이니지 진입 시 Guest Token 발급 요청
 */
export interface GuestTokenIssueRequest {
  /** Service identifier (e.g., 'kpa-pharmacy', 'glycopharm') */
  serviceId: string;
  /** Store identifier (optional, for store-specific access) */
  storeId?: string;
  /** Device identifier (QR code ID, kiosk ID, etc.) */
  deviceId?: string;
  /** Entry point type */
  entryType: 'qr' | 'kiosk' | 'signage' | 'web';
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Guest Token Issue Response
 */
export interface GuestTokenIssueResponse {
  success: boolean;
  /** Guest session ID for tracking */
  guestSessionId: string;
  tokens: {
    accessToken: string;
    /** No refresh token for guests - short-lived only */
    expiresIn: number;
  };
  /** Token type is always 'guest' */
  tokenType: 'guest';
  /** Service context */
  context: {
    serviceId: string;
    storeId?: string;
    deviceId?: string;
    entryType: string;
  };
}

/**
 * Guest to Service User Upgrade Request
 * Guest → Service User 승격 요청
 */
export interface GuestUpgradeRequest {
  /** Existing guest token */
  guestToken: string;
  /** OAuth credentials for Service User authentication */
  credentials: ServiceLoginCredentials;
  /** IP address for logging */
  ipAddress: string;
  /** User agent for logging */
  userAgent: string;
}

/**
 * Guest to Service User Upgrade Response
 */
export interface GuestUpgradeResponse {
  success: boolean;
  /** Service user data after upgrade */
  user: ServiceUserData;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  /** Token type changes to 'service' after upgrade */
  tokenType: 'service';
  /** Previous guest session ID (for activity transfer) */
  previousGuestSessionId: string;
  /** Indicates guest activity was preserved */
  activityPreserved: boolean;
}

/**
 * Guest User data (minimal, for tracking purposes)
 */
export interface GuestUserData {
  /** Guest session ID */
  guestSessionId: string;
  /** Service ID */
  serviceId: string;
  /** Store ID (optional) */
  storeId?: string;
  /** Device ID (optional) */
  deviceId?: string;
  /** Entry type */
  entryType: 'qr' | 'kiosk' | 'signage' | 'web';
  /** Created timestamp */
  createdAt: Date;
  /** Expiry timestamp */
  expiresAt: Date;
}