"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSecurityService = void 0;
const connection_1 = require("../database/connection");
const LoginAttempt_1 = require("../entities/LoginAttempt");
const User_1 = require("../entities/User");
const typeorm_1 = require("typeorm");
const emailService_1 = require("./emailService");
class LoginSecurityService {
    /**
     * Record a login attempt
     */
    static async recordLoginAttempt(data) {
        const attempt = this.loginAttemptRepository.create(data);
        await this.loginAttemptRepository.save(attempt);
        // Check for suspicious activity
        if (!data.success) {
            await this.checkSuspiciousActivity(data.email, data.ipAddress);
        }
    }
    /**
     * Check if login is allowed for email/IP combination
     */
    static async isLoginAllowed(email, ipAddress) {
        const windowStart = new Date(Date.now() - this.config.checkWindow * 60 * 1000);
        // Check IP-based attempts
        const ipAttempts = await this.loginAttemptRepository.count({
            where: {
                ipAddress,
                success: false,
                createdAt: (0, typeorm_1.MoreThan)(windowStart)
            }
        });
        if (ipAttempts >= this.config.maxAttemptsPerIp) {
            return {
                allowed: false,
                reason: 'too_many_attempts_from_ip'
            };
        }
        // Check email-based attempts
        const emailAttempts = await this.loginAttemptRepository.count({
            where: {
                email,
                success: false,
                createdAt: (0, typeorm_1.MoreThan)(windowStart)
            }
        });
        if (emailAttempts >= this.config.maxAttemptsPerEmail) {
            return {
                allowed: false,
                reason: 'too_many_attempts_for_email',
                remainingAttempts: 0
            };
        }
        // Check if user account is locked
        const user = await this.userRepository.findOne({ where: { email } });
        if (user && user.lockedUntil && new Date() < user.lockedUntil) {
            const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            return {
                allowed: false,
                reason: 'account_locked',
                remainingAttempts: 0
            };
        }
        return {
            allowed: true,
            remainingAttempts: Math.max(0, this.config.maxAttemptsPerEmail - emailAttempts)
        };
    }
    /**
     * Check for suspicious activity patterns
     */
    static async checkSuspiciousActivity(email, ipAddress) {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // Check for distributed attack from same IP
        const ipAttemptsLastHour = await this.loginAttemptRepository.count({
            where: {
                ipAddress,
                success: false,
                createdAt: (0, typeorm_1.MoreThan)(hourAgo)
            }
        });
        if (ipAttemptsLastHour >= this.config.suspiciousIpThreshold) {
            await this.handleSuspiciousIp(ipAddress);
        }
        // Check for targeted attack on specific email
        const emailAttemptsLastHour = await this.loginAttemptRepository.count({
            where: {
                email,
                success: false,
                createdAt: (0, typeorm_1.MoreThan)(hourAgo)
            }
        });
        if (emailAttemptsLastHour >= this.config.maxAttemptsPerEmail * 3) {
            await this.notifyUserOfSuspiciousActivity(email);
        }
    }
    /**
     * Handle suspicious IP address
     */
    static async handleSuspiciousIp(ipAddress) {
        // Log the suspicious IP (could be sent to a monitoring service)
        console.warn(`Suspicious activity detected from IP: ${ipAddress}`);
        // In production, you might want to:
        // 1. Add to temporary IP blacklist
        // 2. Send alert to security team
        // 3. Trigger additional security measures
    }
    /**
     * Notify user of suspicious activity
     */
    static async notifyUserOfSuspiciousActivity(email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user)
            return;
        try {
            await emailService_1.emailService.sendSecurityAlert(email, {
                type: 'suspicious_login_attempts',
                details: {
                    message: '귀하의 계정에 비정상적인 로그인 시도가 감지되었습니다.',
                    recommendation: '비밀번호를 변경하시고 2단계 인증을 활성화하시기 바랍니다.'
                }
            });
        }
        catch (error) {
            console.error('Failed to send security alert:', error);
        }
    }
    /**
     * Get recent login attempts for a user
     */
    static async getRecentLoginAttempts(email, limit = 10) {
        return await this.loginAttemptRepository.find({
            where: { email },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }
    /**
     * Get login attempts by IP
     */
    static async getLoginAttemptsByIp(ipAddress, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return await this.loginAttemptRepository.find({
            where: {
                ipAddress,
                createdAt: (0, typeorm_1.MoreThan)(since)
            },
            order: { createdAt: 'DESC' }
        });
    }
    /**
     * Clear old login attempts (for cleanup job)
     */
    static async clearOldLoginAttempts(daysToKeep = 30) {
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
        const result = await this.loginAttemptRepository.delete({
            createdAt: (0, typeorm_1.MoreThan)(cutoffDate)
        });
        return result.affected || 0;
    }
    /**
     * Reset login attempts for a user
     */
    static async resetLoginAttempts(email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (user) {
            user.loginAttempts = 0;
            user.lockedUntil = null;
            await this.userRepository.save(user);
        }
    }
    /**
     * Lock user account
     */
    static async lockAccount(email, minutes) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (user) {
            const lockDuration = minutes || this.config.lockoutDuration;
            user.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
            await this.userRepository.save(user);
        }
    }
    /**
     * Unlock user account
     */
    static async unlockAccount(email) {
        await this.resetLoginAttempts(email);
    }
    /**
     * Get security metrics for monitoring
     */
    static async getSecurityMetrics(hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        // Get all attempts in timeframe
        const attempts = await this.loginAttemptRepository.find({
            where: { createdAt: (0, typeorm_1.MoreThan)(since) }
        });
        const failedAttempts = attempts.filter(a => !a.success);
        const uniqueIps = new Set(attempts.map(a => a.ipAddress)).size;
        // Get locked accounts
        const lockedAccounts = await this.userRepository.count({
            where: { lockedUntil: (0, typeorm_1.MoreThan)(new Date()) }
        });
        // Aggregate failed attempts by email
        const emailCounts = new Map();
        failedAttempts.forEach(attempt => {
            emailCounts.set(attempt.email, (emailCounts.get(attempt.email) || 0) + 1);
        });
        const topFailedEmails = Array.from(emailCounts.entries())
            .map(([email, count]) => ({ email, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // Aggregate failed attempts by IP
        const ipCounts = new Map();
        failedAttempts.forEach(attempt => {
            ipCounts.set(attempt.ipAddress, (ipCounts.get(attempt.ipAddress) || 0) + 1);
        });
        const topFailedIps = Array.from(ipCounts.entries())
            .map(([ipAddress, count]) => ({ ipAddress, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            totalAttempts: attempts.length,
            failedAttempts: failedAttempts.length,
            uniqueIps,
            lockedAccounts,
            topFailedEmails,
            topFailedIps
        };
    }
}
exports.LoginSecurityService = LoginSecurityService;
LoginSecurityService.loginAttemptRepository = connection_1.AppDataSource.getRepository(LoginAttempt_1.LoginAttempt);
LoginSecurityService.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
LoginSecurityService.config = {
    maxAttemptsPerIp: parseInt(process.env.MAX_LOGIN_ATTEMPTS_PER_IP || '10'),
    maxAttemptsPerEmail: parseInt(process.env.MAX_LOGIN_ATTEMPTS_PER_EMAIL || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30'),
    checkWindow: parseInt(process.env.LOGIN_CHECK_WINDOW_MINUTES || '15'),
    suspiciousIpThreshold: parseInt(process.env.SUSPICIOUS_IP_THRESHOLD || '20')
};
//# sourceMappingURL=LoginSecurityService.js.map