// P0 RBAC: Role Assignment Type
export interface RoleAssignment {
  role: 'supplier' | 'seller' | 'partner' | 'admin';
  active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  valid_from: string;
  valid_until: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

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

// P0 RBAC: /me Response Type
export interface MeResponse {
  success: boolean;
  user: User;
  assignments: RoleAssignment[];
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
  reason?: string;
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