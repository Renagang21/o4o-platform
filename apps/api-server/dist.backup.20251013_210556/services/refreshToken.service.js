"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenService = exports.RefreshTokenService = void 0;
const connection_1 = require("../database/connection");
const RefreshToken_1 = require("../entities/RefreshToken");
const LoginAttempt_1 = require("../entities/LoginAttempt");
const User_1 = require("../entities/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
class RefreshTokenService {
    constructor() {
        this.refreshTokenRepository = connection_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
        this.loginAttemptRepository = connection_1.AppDataSource.getRepository(LoginAttempt_1.LoginAttempt);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    }
    // Generate new refresh token
    async generateRefreshToken(user, deviceId, userAgent, ipAddress) {
        try {
            // Generate unique token
            const tokenValue = crypto_1.default.randomBytes(64).toString('hex');
            // Set expiration (30 days)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            // Revoke existing tokens for the same device
            if (deviceId) {
                await this.refreshTokenRepository.update({
                    userId: user.id,
                    deviceId,
                    revoked: false
                }, {
                    revoked: true,
                    revokedAt: new Date(),
                    revokedReason: 'New token issued'
                });
            }
            // Create new refresh token
            const refreshToken = this.refreshTokenRepository.create({
                token: tokenValue,
                user,
                userId: user.id,
                expiresAt,
                deviceId,
                userAgent,
                ipAddress
            });
            await this.refreshTokenRepository.save(refreshToken);
            return tokenValue;
        }
        catch (error) {
            logger_1.default.error('Error generating refresh token:', error);
            throw new Error('Failed to generate refresh token');
        }
    }
    // Verify refresh token
    async verifyRefreshToken(token) {
        try {
            const refreshToken = await this.refreshTokenRepository.findOne({
                where: { token },
                relations: ['user']
            });
            if (!refreshToken) {
                return { valid: false, reason: 'Token not found' };
            }
            if (!refreshToken.isValid()) {
                return {
                    valid: false,
                    reason: refreshToken.revoked ? 'Token revoked' : 'Token expired'
                };
            }
            return { valid: true, user: refreshToken.user };
        }
        catch (error) {
            logger_1.default.error('Error verifying refresh token:', error);
            return { valid: false, reason: 'Verification error' };
        }
    }
    // Refresh access token
    async refreshAccessToken(refreshToken) {
        try {
            const verification = await this.verifyRefreshToken(refreshToken);
            if (!verification.valid || !verification.user) {
                return { error: verification.reason || 'Invalid refresh token' };
            }
            // Generate new access token
            const accessToken = jsonwebtoken_1.default.sign({
                userId: verification.user.id,
                email: verification.user.email,
                role: verification.user.role
            }, process.env.JWT_SECRET || 'default-jwt-secret', { expiresIn: '15m' });
            // Update last used timestamp
            await this.refreshTokenRepository.update({ token: refreshToken }, { updatedAt: new Date() });
            return { accessToken };
        }
        catch (error) {
            logger_1.default.error('Error refreshing access token:', error);
            return { error: 'Failed to refresh token' };
        }
    }
    // Revoke refresh token
    async revokeToken(token, reason) {
        try {
            const result = await this.refreshTokenRepository.update({ token }, {
                revoked: true,
                revokedAt: new Date(),
                revokedReason: reason || 'Manual revocation'
            });
            return result.affected > 0;
        }
        catch (error) {
            logger_1.default.error('Error revoking token:', error);
            return false;
        }
    }
    // Revoke all user tokens
    async revokeAllUserTokens(userId, reason) {
        try {
            const result = await this.refreshTokenRepository.update({ userId, revoked: false }, {
                revoked: true,
                revokedAt: new Date(),
                revokedReason: reason || 'All tokens revoked'
            });
            return result.affected > 0;
        }
        catch (error) {
            logger_1.default.error('Error revoking user tokens:', error);
            return false;
        }
    }
    // Clean expired tokens
    async cleanExpiredTokens() {
        try {
            const result = await this.refreshTokenRepository.delete({
                expiresAt: new Date()
            });
            return result.affected || 0;
        }
        catch (error) {
            logger_1.default.error('Error cleaning expired tokens:', error);
            return 0;
        }
    }
    // Track login attempt
    async trackLoginAttempt(email, successful, ipAddress, userAgent, deviceId, failureReason) {
        try {
            const attempt = this.loginAttemptRepository.create({
                email,
                successful,
                ipAddress,
                userAgent,
                deviceId,
                failureReason
            });
            await this.loginAttemptRepository.save(attempt);
        }
        catch (error) {
            logger_1.default.error('Error tracking login attempt:', error);
        }
    }
    // Check if account should be locked
    async checkAccountLock(email) {
        try {
            const attempts = await this.loginAttemptRepository.find({
                where: { email },
                order: { attemptedAt: 'DESC' },
                take: 20
            });
            const shouldLock = LoginAttempt_1.LoginAttempt.shouldLockAccount(attempts);
            if (shouldLock) {
                const failedAttempts = attempts.filter(a => !a.successful).length;
                const lockDuration = LoginAttempt_1.LoginAttempt.getLockDuration(failedAttempts);
                return {
                    locked: true,
                    lockDuration,
                    attempts: failedAttempts
                };
            }
            return { locked: false };
        }
        catch (error) {
            logger_1.default.error('Error checking account lock:', error);
            return { locked: false };
        }
    }
    // Get user's active tokens
    async getUserActiveTokens(userId) {
        try {
            return await this.refreshTokenRepository.find({
                where: {
                    userId,
                    revoked: false
                },
                order: {
                    createdAt: 'DESC'
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error getting user tokens:', error);
            return [];
        }
    }
}
exports.RefreshTokenService = RefreshTokenService;
// Export singleton instance
exports.refreshTokenService = new RefreshTokenService();
//# sourceMappingURL=refreshToken.service.js.map