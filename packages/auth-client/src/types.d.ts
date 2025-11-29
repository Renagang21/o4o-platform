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
    role?: 'admin' | 'business' | 'affiliate' | 'customer' | 'seller' | 'supplier';
    isApproved?: boolean;
    avatar?: string;
    lastLoginAt?: Date;
    status?: 'active' | 'inactive' | 'pending';
    businessInfo?: any;
    permissions?: string[];
    assignments?: RoleAssignment[];
}
export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    refreshToken?: string;
    user: User;
}
export interface LoginCredentials {
    email: string;
    password: string;
}
/**
 * R-5-1: Simplified registration data
 * - Users are created with 'customer' role by default
 * - Additional roles (seller, supplier, partner) require enrollment
 */
export interface RegisterData {
    email: string;
    password: string;
    name: string;
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
    reason?: string;
    reapplyAfterAt?: string;
    canReapply?: boolean;
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
//# sourceMappingURL=types.d.ts.map