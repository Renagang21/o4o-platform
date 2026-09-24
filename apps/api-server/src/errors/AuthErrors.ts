import { AppError, ErrorCategory, ErrorSeverity } from './AppError.js';

/**
 * Authentication & Authorization Error Classes
 *
 * Standardized error types for consistent error handling across auth services.
 * All errors extend AppError for unified error handling middleware.
 */

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   InvalidCredentialsError · SocialLoginRequiredError · PasswordValidationError ·
//   InvalidPasswordResetTokenError 는 은퇴했다. 검증하거나 재설정할 비밀번호가 없다.

/**
 * Base Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: string, details?: Record<string, any>) {
    super(code, message, 401, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, true, undefined, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Invalid or expired token error
 */
export class InvalidTokenError extends AuthenticationError {
  constructor(message: string = 'Access token is invalid or has expired') {
    super(message, 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}

/**
 * Invalid refresh token error
 */
export class InvalidRefreshTokenError extends AuthenticationError {
  constructor(message: string = 'Refresh token is invalid or has expired') {
    super(message, 'INVALID_REFRESH_TOKEN');
    this.name = 'InvalidRefreshTokenError';
  }
}

/**
 * Missing authentication error
 */
export class AuthenticationRequiredError extends AuthenticationError {
  constructor() {
    super('Authentication required', 'AUTH_REQUIRED');
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Missing refresh token error
 */
export class RefreshTokenRequiredError extends AuthenticationError {
  constructor() {
    super('Refresh token not provided', 'NO_REFRESH_TOKEN');
    this.name = 'RefreshTokenRequiredError';
  }
}

/**
 * User not found error
 */
export class UserNotFoundError extends AuthenticationError {
  constructor() {
    super('User account not found or has been deactivated', 'INVALID_USER');
    this.name = 'UserNotFoundError';
  }
}

/**
 * Base Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string, code: string, details?: Record<string, any>) {
    super(code, message, 403, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, true, undefined, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Account inactive error
 */
export class AccountInactiveError extends AuthorizationError {
  constructor(status?: string) {
    super(
      'Account is not active',
      'ACCOUNT_NOT_ACTIVE',
      status ? { status } : undefined
    );
    this.name = 'AccountInactiveError';
  }
}

/**
 * Account locked error
 */
export class AccountLockedError extends AuthorizationError {
  constructor(lockedUntil?: Date) {
    const message = lockedUntil
      ? `Account is temporarily locked until ${lockedUntil.toISOString()}`
      : 'Account is temporarily locked due to multiple failed login attempts';

    super(
      message,
      'ACCOUNT_LOCKED',
      lockedUntil ? { lockedUntil: lockedUntil.toISOString() } : undefined
    );
    this.name = 'AccountLockedError';
  }
}

/**
 * Account suspended error
 */
export class AccountSuspendedError extends AuthorizationError {
  constructor(reason?: string) {
    super(
      'Account has been suspended',
      'ACCOUNT_SUSPENDED',
      reason ? { reason } : undefined
    );
    this.name = 'AccountSuspendedError';
  }
}

/**
 * Email not verified error
 */
export class EmailNotVerifiedError extends AuthorizationError {
  constructor() {
    super('Please verify your email before logging in', 'EMAIL_NOT_VERIFIED');
    this.name = 'EmailNotVerifiedError';
  }
}

/**
 * Admin privileges required error
 */
export class AdminRequiredError extends AuthorizationError {
  constructor() {
    super('Admin privileges required', 'FORBIDDEN');
    this.name = 'AdminRequiredError';
  }
}

/**
 * Role required error
 */
export class RoleRequiredError extends AuthorizationError {
  constructor(requiredRoles: string | string[]) {
    const roleList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const message =
      roleList.length === 1
        ? `Active ${roleList[0]} role required`
        : `One of these roles required: ${roleList.join(', ')}`;

    super(message, 'ROLE_REQUIRED', { requiredRoles: roleList });
    this.name = 'RoleRequiredError';
  }
}

/**
 * Too many login attempts error
 */
export class TooManyAttemptsError extends AuthorizationError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many login attempts. Please try again after ${retryAfter} seconds.`
      : 'Too many login attempts. Please try again later.';

    super(
      message,
      'TOO_MANY_ATTEMPTS',
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'TooManyAttemptsError';
  }
}

/**
 * Email already exists error
 */
export class EmailAlreadyExistsError extends AppError {
  constructor() {
    super('EMAIL_EXISTS', 'Email already exists', 409, ErrorCategory.VALIDATION, ErrorSeverity.LOW);
    this.name = 'EmailAlreadyExistsError';
  }
}

/**
 * Token expired error
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(tokenType: 'access' | 'refresh' | 'reset' = 'access') {
    super(
      `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} token has expired`,
      'TOKEN_EXPIRED',
      { tokenType }
    );
    this.name = 'TokenExpiredError';
  }
}

/**
 * Invalid verification token error
 */
export class InvalidVerificationTokenError extends AppError {
  constructor() {
    super('INVALID_VERIFICATION_TOKEN', 'Invalid or expired verification token', 400, ErrorCategory.AUTHENTICATION, ErrorSeverity.LOW);
    this.name = 'InvalidVerificationTokenError';
  }
}
