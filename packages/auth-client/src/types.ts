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
  LoginCredentials,
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
 */
export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string; // Optional for cookie-based auth
  refreshToken?: string; // Optional for cookie-based auth
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
export type EnrollmentRole = 'supplier' | 'seller' | 'partner' | 'vendor' | 'affiliate';
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
