/**
 * 사용자 관련 공통 타입 정의
 * - AuthContext와 모든 role-pages에서 공통 사용
 * - MongoDB _id와 일반적인 id 모두 지원하여 호환성 확보
 */

// P0 RBAC: auth-client에서 re-export
import type { RoleAssignment, MeResponse } from '@o4o/auth-client';
export type { RoleAssignment, MeResponse };

// UserRole 타입 정의 - 모든 가능한 역할 포함
export type UserRole =
  | 'user'
  | 'admin'
  | 'administrator'
  | 'manager'
  | 'partner'
  | 'operator'
  | 'member'
  | 'seller'
  | 'affiliate'
  | 'contributor'
  | 'vendor'
  | 'supplier'
  | 'retailer';

// PrivateRoute에서 사용하는 userType
export type UserType = 'admin' | 'supplier' | 'retailer' | 'user' | 'manager';

// 비즈니스 정보 인터페이스
export interface BusinessInfo {
  businessName: string;
  businessType: string;
  businessNumber?: string;
  address: string;
  phone: string;
}

// 사용자 상태 타입
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'active' | 'inactive';

/**
 * P1: Main User interface
 *
 * PRIMARY: Use `assignments` array for all role checks
 * DEPRECATED: role, roles, currentRole, defaultRole (kept for backward compatibility only)
 */
export interface User {
  _id?: string;                   // MongoDB 원본 ID (선택사항)
  id: string;                     // UUID ID
  email: string;
  name: string;
  phone?: string;

  /**
   * @deprecated Use assignments array instead. This field is kept for backward compatibility only.
   * @see assignments
   */
  role?: UserRole;

  /**
   * @deprecated Use assignments array instead. This field is kept for backward compatibility only.
   * @see assignments
   */
  roles?: UserRole[];

  /**
   * @deprecated Use assignments array instead. This field is kept for backward compatibility only.
   * @see assignments
   */
  currentRole?: UserRole;

  /**
   * @deprecated Use assignments array instead. This field is kept for backward compatibility only.
   * @see assignments
   */
  defaultRole?: UserRole;

  userType: 'admin' | 'supplier' | 'retailer' | 'user'; // 프론트엔드 타입 (필수)
  status: UserStatus;
  businessInfo?: BusinessInfo;
  createdAt: Date | string;       // Date 객체 또는 문자열
  updatedAt?: Date | string;
  lastLoginAt?: Date | string;
  avatar?: string;

  /**
   * P0 RBAC: Active role assignments (PRIMARY)
   *
   * This is the primary source of truth for user roles.
   * Use AuthContext.hasRole() to check if user has a specific role.
   *
   * @example
   * const { hasRole } = useAuth();
   * if (hasRole('seller')) { ... }
   */
  assignments?: RoleAssignment[];
}

// AuthContext 관련 타입들
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>; // P0 RBAC: async logout
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
  // P0 RBAC: role assignment checker
  hasRole: (role: string) => boolean;
  // R-3-1: Active role management
  activeRole: string | null;
  setActiveRole: (role: string | null) => void;
  getAvailableRoles: () => string[];
}

// 권한 확인 관련 타입
export interface UserPermissions {
  isAdmin: boolean;
  isManager: boolean;
  isPartner: boolean;
  isUser: boolean;
  isManagerOrAdmin: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessAdmin: boolean;
}

// API 응답 관련 타입들
export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthVerifyResponse {
  valid: boolean;
  user: User;
}

// 확장 사용자 타입 (하위 호환성)
export interface Supplier extends User {
  companyName: string;
  businessNumber: string;
  address: string;
  contactPerson: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  website?: string;
  description?: string;
}

export interface Retailer extends User {
  storeName: string;
  storeAddress: string;
  businessNumber: string;
  grade: 'gold' | 'premium' | 'vip';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  managerName: string;
  storeType: string;
}

// 인증 응답 타입 (하위 호환성)
export interface AuthResponse {
  success: boolean;
  data: {
    user: User | Supplier | Retailer;
    token: string;
  };
  message?: string;
}

// 요청 타입들
export interface LoginRequest {
  email: string;
  password: string;
  userType?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  userType: 'supplier' | 'retailer' | 'user';
  // 공급자 추가 정보
  companyName?: string;
  businessNumber?: string;
  address?: string;
  contactPerson?: string;
  website?: string;
  description?: string;
  // 리테일러 추가 정보
  storeName?: string;
  storeAddress?: string;
  managerName?: string;
  storeType?: string;
}

// 사용자 업데이트 관련 타입
export type UserUpdateData = Partial<Omit<User, '_id' | 'id' | 'createdAt'>>;

// 역할별 컴포넌트 Props 타입
export interface RolePageProps {
  user: User;
}

// 유틸리티 타입들
export type UserWithoutId = Omit<User, 'id'>;
export type UserCreateData = Omit<User, '_id' | 'id' | 'createdAt' | 'lastLoginAt'>;
