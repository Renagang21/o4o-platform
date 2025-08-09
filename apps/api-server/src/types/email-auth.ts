// Email Authentication Types

// User registration data
export interface RegisterUserDto {
  email: string;
  password: string;
  name: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
}

// User login data
export interface LoginUserDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Password reset request
export interface ResetPasswordRequestDto {
  email: string;
}

// Password reset confirmation
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Email verification
export interface VerifyEmailDto {
  token: string;
}

// JWT payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}

// Auth response
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      emailVerified: boolean;
      createdAt: Date;
    };
    accessToken: string;
    refreshToken?: string;
  };
}

// Email template data
export interface EmailTemplateData {
  name: string;
  actionUrl: string;
  supportEmail: string;
  companyName: string;
  year: number;
}

export interface VerificationEmailData extends EmailTemplateData {
  verificationCode?: string;
}

export interface PasswordResetEmailData extends EmailTemplateData {
  resetCode?: string;
  expiresIn?: string;
}

// Email service options
export interface EmailOptions {
  to: string;
  subject: string;
  template?: 'verification' | 'passwordReset' | 'welcome' | 'accountLocked';
  data?: EmailTemplateData;
  html?: string;
  text?: string;
}

// Token types
export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt?: Date;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt?: Date;
}

// OAuth integration types
export interface LinkedAccount {
  userId: string;
  provider: 'google' | 'kakao' | 'naver' | 'email';
  providerId?: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountLinkingDto {
  userId: string;
  provider: 'google' | 'kakao' | 'naver';
  providerId: string;
  email: string;
}

// Error types
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  field?: string;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  OAUTH_LINK_FAILED = 'OAUTH_LINK_FAILED'
}