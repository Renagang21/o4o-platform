/**
 * Auth Client Types
 *
 * Re-exports types from @o4o/types (SSOT) with some local
 * additions for client-specific needs.
 */

// Re-export SSOT types from @o4o/types
export type {
  User,
  UserStatus,
  RoleAssignment,
  AuthTokens,
  RegisterData,
  MeResponse,
  JWTPayload,
  SessionInfo,
  AuthErrorCode,
} from '@o4o/types';

// Re-export constants
export {
  USER_STATUS,
  AUTH_ERROR_CODES,
  ROLES,
  ADMIN_ROLES,
} from '@o4o/types';

/**
 * Auth Response from login/register endpoints
 *
 * Phase 6-7: Cookie Auth Primary
 * - For cookie strategy: tokens are optional (set via httpOnly cookies)
 * - For localStorage strategy: tokens are included when includeLegacyTokens=true
 */
export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string; // Legacy field for backward compatibility
  accessToken?: string; // Phase 6-7: Optional, present when includeLegacyTokens=true
  refreshToken?: string; // Phase 6-7: Optional, present when includeLegacyTokens=true
  user?: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    assignments?: Array<{
      id: string;
      role: string;
      isActive: boolean;
      validFrom: string | null;
      validUntil: string | null;
    }>;
    avatar?: string | null;
  };
  expiresIn?: number;
}

// P0 RBAC: Enrollment Types
export type EnrollmentRole = 'supplier' | 'seller' | 'vendor' | 'affiliate';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'on_hold';

export interface Enrollment {
  id: string;
  userId: string;
  role: EnrollmentRole;
  status: EnrollmentStatus;
  metadata?: Record<string, unknown>;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string; // P1 Phase B-2: Detailed reason for hold/reject
  reapplyAfterAt?: string; // P1 Phase B-2: Cooldown period end time (ISO string)
  canReapply?: boolean; // P1 Phase B-2: Whether user can reapply now
}

export interface EnrollmentCreateData {
  role: EnrollmentRole;
  metadata?: Record<string, unknown>;
}

export interface EnrollmentListResponse {
  success: boolean;
  enrollments: Enrollment[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D): Google-only Signup/Login ──────────────

/** POST /auth/google/signup 동의 항목 — terms/privacy 필수, marketing 선택. */
export interface GoogleSignupConsents {
  terms: boolean;
  privacy: boolean;
  marketing?: boolean;
}

/** GET /auth/google/config — 공개 Client ID(secret 아님). enabled=false 면 Google 버튼을 "준비 중"으로 표시. */
export interface GoogleAuthConfig {
  enabled: boolean;
  clientId: string | null;
}

/** Google login/signup 응답 — /auth/login 과 같은 세션 형태 + 가입 여부 · (serviceKey 요청 시) membership 상태. */
export interface GoogleAuthResponse extends AuthResponse {
  isNewUser?: boolean;
  serviceMembership?: { serviceKey: string; status: string | null };
}

/** 서버가 미등록 Google 계정에 돌려주는 코드 — 호출부는 이 코드로 가입(동의) 흐름으로 분기한다. */
export const GOOGLE_SIGNUP_REQUIRED_CODE = 'GOOGLE_SIGNUP_REQUIRED';

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   GoogleLinkStatus / GoogleLinkResult 는 은퇴했다(명시 연결 경로와 함께).
