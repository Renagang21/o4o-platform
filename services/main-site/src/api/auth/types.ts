// UserRole 타입 정의 - 모든 가능한 역할 포함
export type UserRole = 'user' | 'admin' | 'administrator' | 'manager' | 'partner' | 'operator' | 'member' | 'seller' | 'affiliate' | 'contributor' | 'vendor' | 'supplier';

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