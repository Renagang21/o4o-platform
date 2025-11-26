// UserRole 타입 정의 - SSO 시스템과 통합
export type UserRole = 'user' | 'admin' | 'seller' | 'supplier' | 'manager' | 'administrator' | 'partner' | 'operator' | 'member' | 'affiliate' | 'contributor' | 'vendor';

// 새 SSO 사용자 인터페이스
export interface SSOUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: 'user' | 'admin' | 'seller' | 'supplier' | 'manager';
  permissions: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 레거시 호환성을 위한 기존 User 인터페이스
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles: UserRole[]; // 호환성을 위한 배열 형태
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// SSO User를 Legacy User로 변환하는 헬퍼
export function ssoUserToLegacyUser(ssoUser: SSOUser): User {
  return {
    id: ssoUser.id,
    email: ssoUser.email,
    name: ssoUser.fullName || ssoUser.email,
    role: ssoUser.role,
    roles: [ssoUser.role],
    isApproved: ssoUser.isActive && ssoUser.isEmailVerified,
    createdAt: ssoUser.createdAt,
    updatedAt: ssoUser.updatedAt,
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface RegisterResponse {
  user: User;
}

export interface AuthError {
  message: string;
  code: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
} 