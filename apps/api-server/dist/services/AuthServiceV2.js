"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceV2 = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const UserService_1 = require("./UserService");
const RefreshTokenService_1 = require("./RefreshTokenService");
const sessionSyncService_1 = require("./sessionSyncService");
const LoginSecurityService_1 = require("./LoginSecurityService");
class AuthServiceV2 {
    /**
     * User login
     */
    static async login(email, password, userAgent, ipAddress) {
        const ip = ipAddress || 'unknown';
        try {
            // Check if login is allowed (rate limiting)
            const loginCheck = await LoginSecurityService_1.LoginSecurityService.isLoginAllowed(email, ip);
            if (!loginCheck.allowed) {
                await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                    email,
                    ipAddress: ip,
                    userAgent,
                    success: false,
                    failureReason: loginCheck.reason
                });
                if (loginCheck.reason === 'account_locked') {
                    throw new Error('Account is temporarily locked due to multiple failed login attempts');
                }
                else if (loginCheck.reason === 'too_many_attempts_from_ip') {
                    throw new Error('Too many login attempts from this IP address. Please try again later.');
                }
                else {
                    throw new Error('Too many failed login attempts. Please try again later.');
                }
            }
            // Find user
            const user = await UserService_1.UserService.getUserByEmail(email);
            if (!user) {
                await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                    email,
                    ipAddress: ip,
                    userAgent,
                    success: false,
                    failureReason: 'account_not_found'
                });
                return null;
            }
            // Check if account is locked
            if (UserService_1.UserService.isAccountLocked(user)) {
                await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                    email,
                    ipAddress: ip,
                    userAgent,
                    success: false,
                    failureReason: 'account_locked'
                });
                throw new Error('Account is temporarily locked due to multiple failed login attempts');
            }
            // Verify password
            const isValidPassword = await UserService_1.UserService.comparePassword(password, user.password);
            if (!isValidPassword) {
                await UserService_1.UserService.handleFailedLogin(user);
                await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                    email,
                    ipAddress: ip,
                    userAgent,
                    success: false,
                    failureReason: 'invalid_password'
                });
                return null;
            }
            // Check user status
            if (!user.isActive) {
                await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                    email,
                    ipAddress: ip,
                    userAgent,
                    success: false,
                    failureReason: 'account_inactive'
                });
                throw new Error('Account is not active');
            }
            if (!user.isEmailVerified) {
                await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                    email,
                    ipAddress: ip,
                    userAgent,
                    success: false,
                    failureReason: 'email_not_verified'
                });
                throw new Error('Please verify your email before logging in');
            }
            // Successful login
            await LoginSecurityService_1.LoginSecurityService.recordLoginAttempt({
                email,
                ipAddress: ip,
                userAgent,
                success: true
            });
            // Check concurrent sessions
            const sessionCheck = await sessionSyncService_1.SessionSyncService.checkConcurrentSessions(user.id);
            if (!sessionCheck.allowed) {
                // Enforce session limit by removing oldest session
                await sessionSyncService_1.SessionSyncService.enforceSessionLimit(user.id);
            }
            // Generate session ID for SSO
            const sessionId = sessionSyncService_1.SessionSyncService.generateSessionId();
            // Create session with device info
            await sessionSyncService_1.SessionSyncService.createSession(user, sessionId, { userAgent, ipAddress });
            // Generate tokens
            const tokens = await this.generateTokens(user, { userAgent, ipAddress });
            // Update login info
            await UserService_1.UserService.handleSuccessfulLogin(user);
            return {
                success: true,
                user: user.toPublicData ? user.toPublicData() : {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                tokens,
                sessionId
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred during login');
        }
    }
    /**
     * Generate access and refresh tokens
     */
    static async generateTokens(user, metadata) {
        // Generate access token
        const accessTokenPayload = {
            userId: user.id,
            sub: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            domain: 'neture.co.kr',
            exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
            iat: Math.floor(Date.now() / 1000)
        };
        const accessToken = jwt.sign(accessTokenPayload, this.JWT_SECRET);
        // Generate refresh token via RefreshTokenService
        const tokenFamily = RefreshTokenService_1.RefreshTokenService.generateTokenFamily();
        const refreshToken = await RefreshTokenService_1.RefreshTokenService.generateRefreshToken(user, tokenFamily, metadata);
        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15 minutes in seconds
        };
    }
    /**
     * Refresh access token using refresh token
     */
    static async refreshTokens(refreshToken, metadata) {
        try {
            // Rotate refresh token
            const rotationResult = await RefreshTokenService_1.RefreshTokenService.rotateRefreshToken(refreshToken, metadata);
            if (!rotationResult) {
                return null;
            }
            // Verify the new refresh token
            const payload = await RefreshTokenService_1.RefreshTokenService.verifyRefreshToken(rotationResult.token);
            if (!payload) {
                return null;
            }
            // Get user
            const user = await UserService_1.UserService.getUserById(payload.userId);
            if (!user || !user.isActive) {
                return null;
            }
            // Generate new access token
            const accessTokenPayload = {
                userId: user.id,
                sub: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
                domain: 'neture.co.kr',
                exp: Math.floor(Date.now() / 1000) + (15 * 60),
                iat: Math.floor(Date.now() / 1000)
            };
            const accessToken = jwt.sign(accessTokenPayload, this.JWT_SECRET);
            return {
                accessToken,
                refreshToken: rotationResult.token,
                expiresIn: 15 * 60
            };
        }
        catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    }
    /**
     * Verify access token
     */
    static verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Logout user
     */
    static async logout(userId) {
        await RefreshTokenService_1.RefreshTokenService.revokeAllUserTokens(userId);
    }
    /**
     * Set authentication cookies
     */
    static setAuthCookies(res, tokens) {
        const isProduction = process.env.NODE_ENV === 'production';
        // Access token cookie
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: tokens.expiresIn * 1000 // Convert to milliseconds
        });
        // Refresh token cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }
    /**
     * Clear authentication cookies
     */
    static clearAuthCookies(res) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('sessionId');
    }
    /**
     * Get request metadata
     */
    static getRequestMetadata(req) {
        var _a;
        return {
            userAgent: req.headers['user-agent'] || 'Unknown',
            ipAddress: req.ip || ((_a = req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) || 'Unknown'
        };
    }
}
exports.AuthServiceV2 = AuthServiceV2;
AuthServiceV2.JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret';
AuthServiceV2.JWT_EXPIRES_IN = '15m';
//# sourceMappingURL=AuthServiceV2.js.map