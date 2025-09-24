// This service is deprecated - use refreshToken.service.ts instead
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