/**
 * 공유 인증 관련 타입 정의
 * 모든 서비스에서 일관된 타입 사용을 위한 공유 타입
 */

// 백엔드 API 역할 타입
export type ApiRole = 
  | 'customer' 
  | 'business' 
  | 'affiliate' 
  | 'admin' 
  | 'manager'
  | 'user'
  | 'administrator';

// 백엔드 API 상태 타입
export type ApiStatus = 
  | 'pending' 
  | 'approved' 
  | 'suspended';

// 프론트엔드 사용자 타입 (통일된 타입)
export type UserType = 
  | 'admin' 
  | 'supplier' 
  | 'retailer' 
  | 'customer';

// 프론트엔드 상태 타입 (통일된 타입)
export type UserStatus = 
  | 'active' 
  | 'inactive' 
  | 'pending';

// 백엔드 API 사용자 인터페이스
export interface ApiUser {
  id: string;
  email: string;
  name?: string;
  role: ApiRole;
  status: ApiStatus;
  businessInfo?: {
    businessName: string;
    businessType: string;
    businessNumber?: string;
    address: string;
    phone: string;
  };
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// 프론트엔드 통일 사용자 인터페이스
export interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  status: UserStatus;
  businessInfo?: {
    businessName: string;
    businessType: string;
    businessNumber?: string;
    address: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

// 인증 상태 인터페이스
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// 로그인 응답
export interface LoginResponse {
  token: string;
  user: ApiUser;
}

// API 응답 기본 형식
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

// 역할 매핑 함수
export function mapApiRoleToUserType(role: ApiRole): UserType {
  switch (role) {
    case 'admin':
    case 'administrator':
    case 'manager':
      return 'admin';
    case 'business':
      return 'supplier';
    case 'affiliate':
      return 'retailer';
    case 'customer':
    case 'user':
    default:
      return 'customer';
  }
}

// 상태 매핑 함수
export function mapApiStatusToUserStatus(status: ApiStatus): UserStatus {
  switch (status) {
    case 'approved':
      return 'active';
    case 'suspended':
      return 'inactive';
    case 'pending':
    default:
      return 'pending';
  }
}

// API 사용자를 프론트엔드 사용자로 변환
export function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name || '',
    userType: mapApiRoleToUserType(apiUser.role),
    status: mapApiStatusToUserStatus(apiUser.status),
    businessInfo: apiUser.businessInfo,
    createdAt: new Date(apiUser.createdAt || Date.now()),
    updatedAt: apiUser.updatedAt ? new Date(apiUser.updatedAt) : undefined,
    lastLoginAt: apiUser.lastLoginAt ? new Date(apiUser.lastLoginAt) : undefined,
  };
}

// 권한 확인 헬퍼 함수들
export const isAdmin = (user: User | null): boolean => {
  return user?.userType === 'admin';
};

export const isSupplier = (user: User | null): boolean => {
  return user?.userType === 'supplier';
};

export const isRetailer = (user: User | null): boolean => {
  return user?.userType === 'retailer';
};

export const isCustomer = (user: User | null): boolean => {
  return user?.userType === 'customer';
};

export const hasAdminAccess = (user: User | null): boolean => {
  return isAdmin(user);
};

export const hasManagerAccess = (user: User | null): boolean => {
  return isAdmin(user) || isSupplier(user);
};

// 토큰 저장 키 상수
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REFRESH_TOKEN: 'refresh_token',
} as const;