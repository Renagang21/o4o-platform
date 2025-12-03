/**
 * DEFERRED — Remove after AuthServiceV2 migration (Phase B-6 or Phase C)
 *
 * This stub service is kept temporarily for backward compatibility with AuthServiceV2.
 * AuthServiceV2 is deprecated and will be removed in Phase B-6/C.
 * At that time, this stub will be deleted automatically.
 *
 * New code should use: modules/auth/services/login-security.service.ts
 */
export class LoginSecurityService {
  // All methods moved to refreshToken.service.ts
  static isLoginAllowed(...args: any[]) { return { allowed: true, reason: '' }; }
  static recordLoginAttempt(...args: any[]) { return; }
  static clearOldLoginAttempts(...args: any[]) { return 0; }
  static getSecurityMetrics(...args: any[]) { return {}; }
  static getRecentLoginAttempts(...args: any[]) { return []; }
  static getLoginAttemptsByIp(...args: any[]) { return []; }
  static unlockAccount(...args: any[]) { return true; }
  static lockAccount(...args: any[]) { return true; }
  static resetLoginAttempts(...args: any[]) { return true; }
}

export const loginSecurityService = new LoginSecurityService();