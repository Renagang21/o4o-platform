// Authentication Types for Frontend

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

export interface ResetPasswordFormData {
  email: string;
}

export interface NewPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    accessToken: string;
    refreshToken?: string;
  };
  error?: {
    code: string;
    message: string;
    field?: string;
    remainingAttempts?: number;
    lockedUntil?: Date;
  };
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_ACTIVE = 'ACCOUNT_NOT_ACTIVE',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  OAUTH_LINK_FAILED = 'OAUTH_LINK_FAILED'
}

export interface OAuthProvider {
  enabled: boolean;
}

export interface OAuthProviders {
  google: OAuthProvider;
  kakao: OAuthProvider;
  naver: OAuthProvider;
}

export interface OAuthProvidersResponse {
  providers: OAuthProviders;
}

export interface SocialLoginConfig {
  google: {
    enabled: boolean;
    name: string;
    icon: string;
    color: string;
    hoverColor: string;
    textColor: string;
  };
  kakao: {
    enabled: boolean;
    name: string;
    icon: string;
    color: string;
    hoverColor: string;
    textColor: string;
  };
  naver: {
    enabled: boolean;
    name: string;
    icon: string;
    color: string;
    hoverColor: string;
    textColor: string;
  };
}