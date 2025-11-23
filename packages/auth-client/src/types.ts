/**
 * R-4-2: Role Assignment DTO (aligned with backend MeResponseDto)
 *
 * Matches /api/v1/auth/cookie/me response structure
 */
export interface RoleAssignment {
  id: string;
  role: 'customer' | 'seller' | 'supplier' | 'partner' | 'admin' | 'administrator' | 'manager';
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  assignedAt?: string;
}

/**
 * @deprecated Use MeResponse directly. This User type is kept for backward compatibility only.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'business' | 'affiliate' | 'customer' | 'seller' | 'supplier'; // Legacy - deprecated
  isApproved?: boolean;
  avatar?: string;
  lastLoginAt?: Date;
  status?: 'active' | 'inactive' | 'pending';
  businessInfo?: any;
  permissions?: string[];

  // P0 RBAC: assignments array (replaces single role)
  assignments?: RoleAssignment[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string; // Optional for cookie-based auth
  refreshToken?: string; // Optional for cookie-based auth
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'seller' | 'supplier';
}

/**
 * R-4-2: /me Response Type (aligned with backend MeResponseDto)
 *
 * Standard response structure from /api/v1/auth/cookie/me
 * This is the single source of truth for user identity.
 */
export interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'suspended' | 'inactive';
  assignments: RoleAssignment[];
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// P0 RBAC: Enrollment Types
export type EnrollmentRole = 'supplier' | 'seller' | 'partner';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'on_hold';

export interface Enrollment {
  id: string;
  userId: string;
  role: EnrollmentRole;
  status: EnrollmentStatus;
  metadata?: Record<string, any>;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string; // P1 Phase B-2: Detailed reason for hold/reject
  reapplyAfterAt?: string; // P1 Phase B-2: Cooldown period end time (ISO string)
  canReapply?: boolean; // P1 Phase B-2: Whether user can reapply now
}

export interface EnrollmentCreateData {
  role: EnrollmentRole;
  metadata?: Record<string, any>;
}

export interface EnrollmentListResponse {
  success: boolean;
  enrollments: Enrollment[];
  total?: number;
}