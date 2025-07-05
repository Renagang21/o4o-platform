/**
 * 공통 SSO 인증 타입 정의
 */

export type UserRole = 'admin' | 'customer' | 'business' | 'affiliate' | 'partner' | 'supplier';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  isApproved: boolean;
  isLocked: boolean;
  lockReason?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSSO: boolean;
  tokenExpiry: number | null;
  sessionId?: string;
  error?: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface SessionStatus {
  status: 'active' | 'expiring_soon' | 'expired' | 'invalid';
  remainingSeconds?: number;
  lastActivity?: string;
}

export interface SecurityConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number; // milliseconds
  warningBeforeExpiry: number; // milliseconds
  autoRefresh: boolean;
  cookieDomain: string;
  secureTransport: boolean;
}

export interface LoginOptions {
  rememberMe?: boolean;
  redirectUrl?: string;
  maxAge?: number;
}

export interface LogoutOptions {
  everywhere?: boolean; // 모든 기기에서 로그아웃
  reason?: 'user_initiated' | 'session_expired' | 'security_logout';
}