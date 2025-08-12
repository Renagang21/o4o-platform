"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenService = void 0;
const connection_1 = require("../database/connection");
const RefreshToken_1 = require("../entities/RefreshToken");
const User_1 = require("../entities/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const typeorm_1 = require("typeorm");
class RefreshTokenService {
    /**
     * Generate a new refresh token and save to database
     */
    static async generateRefreshToken(user, tokenFamily, metadata) {
        // Create token payload
        const payload = {
            userId: user.id,
            sub: user.id,
            tokenFamily,
            tokenVersion: 1,
            exp: Math.floor(Date.now() / 1000) + this.REFRESH_TOKEN_EXPIRY,
            iat: Math.floor(Date.now() / 1000)
        };
        // Generate JWT
        const token = jsonwebtoken_1.default.sign(payload, this.REFRESH_TOKEN_SECRET);
        // Save to database
        const refreshToken = this.refreshTokenRepository.create({
            token,
            userId: user.id,
            family: tokenFamily,
            expiresAt: new Date(payload.exp * 1000),
            userAgent: metadata === null || metadata === void 0 ? void 0 : metadata.userAgent,
            ipAddress: metadata === null || metadata === void 0 ? void 0 : metadata.ipAddress
        });
        await this.refreshTokenRepository.save(refreshToken);
        // Clean up old tokens for this user
        await this.cleanupOldTokens(user.id);
        return token;
    }
    /**
     * Verify and rotate refresh token (token rotation for security)
     */
    static async rotateRefreshToken(oldToken, metadata) {
        try {
            // Verify the old token
            const payload = jsonwebtoken_1.default.verify(oldToken, this.REFRESH_TOKEN_SECRET);
            // Find the token in database
            const existingToken = await this.refreshTokenRepository.findOne({
                where: {
                    token: oldToken,
                    family: payload.tokenFamily,
                    isRevoked: false,
                    expiresAt: (0, typeorm_1.MoreThan)(new Date())
                },
                relations: ['user']
            });
            if (!existingToken || !existingToken.user) {
                // Token not found or revoked - possible token reuse attack
                await this.revokeTokenFamily(payload.tokenFamily);
                return null;
            }
            // Check if user is still active
            if (!existingToken.user.isActive) {
                await this.revokeTokenFamily(payload.tokenFamily);
                return null;
            }
            // Revoke the old token
            existingToken.isRevoked = true;
            await this.refreshTokenRepository.save(existingToken);
            // Generate new token with same family
            const newPayload = {
                ...payload,
                tokenVersion: payload.tokenVersion + 1,
                exp: Math.floor(Date.now() / 1000) + this.REFRESH_TOKEN_EXPIRY,
                iat: Math.floor(Date.now() / 1000)
            };
            const newToken = jsonwebtoken_1.default.sign(newPayload, this.REFRESH_TOKEN_SECRET);
            // Save new token to database
            const refreshToken = this.refreshTokenRepository.create({
                token: newToken,
                userId: existingToken.user.id,
                family: payload.tokenFamily,
                expiresAt: new Date(newPayload.exp * 1000),
                userAgent: metadata === null || metadata === void 0 ? void 0 : metadata.userAgent,
                ipAddress: metadata === null || metadata === void 0 ? void 0 : metadata.ipAddress
            });
            await this.refreshTokenRepository.save(refreshToken);
            return {
                token: newToken,
                family: payload.tokenFamily
            };
        }
        catch (error) {
            console.error('Token rotation error:', error);
            return null;
        }
    }
    /**
     * Verify refresh token without rotation
     */
    static async verifyRefreshToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.REFRESH_TOKEN_SECRET);
            // Check if token exists and is valid
            const existingToken = await this.refreshTokenRepository.findOne({
                where: {
                    token,
                    family: payload.tokenFamily,
                    isRevoked: false,
                    expiresAt: (0, typeorm_1.MoreThan)(new Date())
                }
            });
            if (!existingToken) {
                return null;
            }
            return payload;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Revoke a specific refresh token
     */
    static async revokeToken(token) {
        await this.refreshTokenRepository.update({ token }, { isRevoked: true });
    }
    /**
     * Revoke all tokens in a family (used for security breach scenarios)
     */
    static async revokeTokenFamily(family) {
        await this.refreshTokenRepository.update({ family }, { isRevoked: true });
    }
    /**
     * Revoke all refresh tokens for a user
     */
    static async revokeAllUserTokens(userId) {
        await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
        // Also clear the token family from user record
        await this.userRepository.update({ id: userId }, { refreshTokenFamily: null });
    }
    /**
     * Get active refresh tokens for a user
     */
    static async getUserTokens(userId) {
        return await this.refreshTokenRepository.find({
            where: {
                userId,
                isRevoked: false,
                expiresAt: (0, typeorm_1.MoreThan)(new Date())
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    /**
     * Clean up expired and excess tokens
     */
    static async cleanupOldTokens(userId) {
        // Delete expired tokens
        await this.refreshTokenRepository.delete({
            userId,
            expiresAt: (0, typeorm_1.LessThan)(new Date())
        });
        // Keep only the most recent MAX_TOKENS_PER_USER tokens
        const tokens = await this.refreshTokenRepository.find({
            where: { userId, isRevoked: false },
            order: { createdAt: 'DESC' }
        });
        if (tokens.length > this.MAX_TOKENS_PER_USER) {
            const tokensToRevoke = tokens.slice(this.MAX_TOKENS_PER_USER);
            await Promise.all(tokensToRevoke.map(token => this.refreshTokenRepository.update(token.id, { isRevoked: true })));
        }
    }
    /**
     * Clean up all expired tokens (for scheduled job)
     */
    static async cleanupExpiredTokens() {
        const result = await this.refreshTokenRepository.delete({
            expiresAt: (0, typeorm_1.LessThan)(new Date())
        });
        return result.affected || 0;
    }
    /**
     * Generate a new token family ID
     */
    static generateTokenFamily() {
        return (0, uuid_1.v4)();
    }
}
exports.RefreshTokenService = RefreshTokenService;
RefreshTokenService.refreshTokenRepository = connection_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
RefreshTokenService.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
RefreshTokenService.REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
RefreshTokenService.REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
RefreshTokenService.MAX_TOKENS_PER_USER = 5; // Maximum refresh tokens per user
//# sourceMappingURL=RefreshTokenService.js.map