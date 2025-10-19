"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSecurityService = exports.LoginSecurityService = void 0;
// This service is deprecated - use refreshToken.service.ts instead
class LoginSecurityService {
    // All methods moved to refreshToken.service.ts
    static isLoginAllowed(...args) { return { allowed: true, reason: '' }; }
    static recordLoginAttempt(...args) { return; }
    static clearOldLoginAttempts(...args) { return 0; }
    static getSecurityMetrics(...args) { return {}; }
    static getRecentLoginAttempts(...args) { return []; }
    static getLoginAttemptsByIp(...args) { return []; }
    static unlockAccount(...args) { return true; }
    static lockAccount(...args) { return true; }
    static resetLoginAttempts(...args) { return true; }
}
exports.LoginSecurityService = LoginSecurityService;
exports.loginSecurityService = new LoginSecurityService();
//# sourceMappingURL=LoginSecurityService.js.map