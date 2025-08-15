import { LoginAttempt } from '../entities/LoginAttempt';
interface LoginAttemptData {
    email: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
}
export declare class LoginSecurityService {
    private static loginAttemptRepository;
    private static userRepository;
    private static readonly config;
    /**
     * Record a login attempt
     */
    static recordLoginAttempt(data: LoginAttemptData): Promise<void>;
    /**
     * Check if login is allowed for email/IP combination
     */
    static isLoginAllowed(email: string, ipAddress: string): Promise<{
        allowed: boolean;
        reason?: string;
        remainingAttempts?: number;
    }>;
    /**
     * Check for suspicious activity patterns
     */
    static checkSuspiciousActivity(email: string, ipAddress: string): Promise<void>;
    /**
     * Handle suspicious IP address
     */
    static handleSuspiciousIp(ipAddress: string): Promise<void>;
    /**
     * Notify user of suspicious activity
     */
    static notifyUserOfSuspiciousActivity(email: string): Promise<void>;
    /**
     * Get recent login attempts for a user
     */
    static getRecentLoginAttempts(email: string, limit?: number): Promise<LoginAttempt[]>;
    /**
     * Get login attempts by IP
     */
    static getLoginAttemptsByIp(ipAddress: string, hours?: number): Promise<LoginAttempt[]>;
    /**
     * Clear old login attempts (for cleanup job)
     */
    static clearOldLoginAttempts(daysToKeep?: number): Promise<number>;
    /**
     * Reset login attempts for a user
     */
    static resetLoginAttempts(email: string): Promise<void>;
    /**
     * Lock user account
     */
    static lockAccount(email: string, minutes?: number): Promise<void>;
    /**
     * Unlock user account
     */
    static unlockAccount(email: string): Promise<void>;
    /**
     * Get security metrics for monitoring
     */
    static getSecurityMetrics(hours?: number): Promise<{
        totalAttempts: number;
        failedAttempts: number;
        uniqueIps: number;
        lockedAccounts: number;
        topFailedEmails: Array<{
            email: string;
            count: number;
        }>;
        topFailedIps: Array<{
            ipAddress: string;
            count: number;
        }>;
    }>;
}
export {};
//# sourceMappingURL=LoginSecurityService.d.ts.map