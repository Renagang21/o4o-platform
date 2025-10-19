"use strict";
/**
 * Preview Token Service
 * JWT-based preview token with jti for one-time consumption
 * Sprint 2 - P1: Preview Protection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewTokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_service_1 = require("./redis.service");
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
class PreviewTokenService {
    constructor() {
        this.TOKEN_TTL = 10 * 60; // 10 minutes in seconds
        this.REDIS_PREFIX = 'preview:jti:';
        this.JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
        if (process.env.NODE_ENV === 'production' && this.JWT_SECRET === 'dev-jwt-secret-change-in-production') {
            logger_1.default.warn('⚠️ WARNING: Using default JWT_SECRET in production environment');
        }
    }
    static getInstance() {
        if (!PreviewTokenService.instance) {
            PreviewTokenService.instance = new PreviewTokenService();
        }
        return PreviewTokenService.instance;
    }
    /**
     * Generate preview token with jti
     * Token is valid for 10 minutes and can be consumed only once
     */
    async generateToken(userId, pageId) {
        const jti = (0, uuid_1.v4)(); // Generate unique JWT ID
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            userId,
            pageId,
            jti,
            iat: now,
            exp: now + this.TOKEN_TTL
        };
        // Store jti in Redis with TTL
        const redisKey = `${this.REDIS_PREFIX}${jti}`;
        const redisService = redis_service_1.RedisService.getInstance();
        const stored = await redisService.set(redisKey, JSON.stringify({ userId, pageId, createdAt: new Date().toISOString() }), this.TOKEN_TTL);
        if (!stored) {
            throw new Error('Failed to store preview token in Redis');
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            algorithm: 'HS256',
            jwtid: jti
        });
        logger_1.default.info('Preview token generated', {
            userId,
            pageId,
            jti,
            expiresIn: `${this.TOKEN_TTL}s`
        });
        return token;
    }
    /**
     * Verify and consume preview token (one-time use)
     * Returns payload if valid, null if invalid/expired/already consumed
     */
    async verifyAndConsumeToken(token) {
        try {
            // Verify JWT signature and expiration
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET, {
                algorithms: ['HS256']
            });
            const { jti, userId, pageId, exp } = decoded;
            // Check if token is expired (double-check)
            if (exp < Math.floor(Date.now() / 1000)) {
                logger_1.default.warn('Preview token expired', { jti, userId, pageId });
                return {
                    valid: false,
                    error: 'TOKEN_EXPIRED'
                };
            }
            // Check if jti exists in Redis (not yet consumed)
            const redisKey = `${this.REDIS_PREFIX}${jti}`;
            const redisService = redis_service_1.RedisService.getInstance();
            const exists = await redisService.exists(redisKey);
            if (!exists) {
                logger_1.default.warn('Preview token already consumed or not found', { jti, userId, pageId });
                return {
                    valid: false,
                    error: 'TOKEN_CONSUMED'
                };
            }
            // Consume token (delete from Redis)
            const deleted = await redisService.del(redisKey);
            if (!deleted) {
                logger_1.default.error('Failed to consume preview token', { jti, userId, pageId });
                return {
                    valid: false,
                    error: 'CONSUMPTION_FAILED'
                };
            }
            logger_1.default.info('Preview token consumed successfully', {
                userId,
                pageId,
                jti,
                remainingTTL: exp - Math.floor(Date.now() / 1000)
            });
            return {
                valid: true,
                payload: decoded
            };
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                logger_1.default.warn('Preview token verification failed: expired', {
                    error: error.message
                });
                return {
                    valid: false,
                    error: 'TOKEN_EXPIRED'
                };
            }
            if (error.name === 'JsonWebTokenError') {
                logger_1.default.warn('Preview token verification failed: invalid signature', {
                    error: error.message
                });
                return {
                    valid: false,
                    error: 'INVALID_TOKEN'
                };
            }
            logger_1.default.error('Preview token verification error', {
                error: error.message,
                stack: error.stack
            });
            return {
                valid: false,
                error: 'VERIFICATION_ERROR'
            };
        }
    }
    /**
     * Revoke a token before expiration (manual invalidation)
     */
    async revokeToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.jti) {
                return false;
            }
            const redisKey = `${this.REDIS_PREFIX}${decoded.jti}`;
            const redisService = redis_service_1.RedisService.getInstance();
            const deleted = await redisService.del(redisKey);
            if (deleted) {
                logger_1.default.info('Preview token revoked manually', {
                    jti: decoded.jti,
                    userId: decoded.userId,
                    pageId: decoded.pageId
                });
            }
            return deleted;
        }
        catch (error) {
            logger_1.default.error('Failed to revoke preview token', { error });
            return false;
        }
    }
    /**
     * Check token validity without consuming it
     * Used for debugging/admin purposes only
     */
    async checkTokenStatus(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET, {
                algorithms: ['HS256']
            });
            const redisKey = `${this.REDIS_PREFIX}${decoded.jti}`;
            const redisService = redis_service_1.RedisService.getInstance();
            const exists = await redisService.exists(redisKey);
            const expired = decoded.exp < Math.floor(Date.now() / 1000);
            return {
                valid: exists && !expired,
                payload: decoded,
                consumed: !exists,
                expired
            };
        }
        catch (error) {
            return {
                valid: false,
                consumed: false,
                expired: false
            };
        }
    }
    /**
     * Get token TTL (for info purposes)
     */
    getTokenTTL() {
        return this.TOKEN_TTL;
    }
}
exports.previewTokenService = PreviewTokenService.getInstance();
//# sourceMappingURL=preview-token.service.js.map