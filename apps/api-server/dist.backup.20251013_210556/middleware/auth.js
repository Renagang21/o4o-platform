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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCookie = exports.authenticate = exports.optionalAuth = exports.authenticateToken = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const auth_1 = require("../types/auth");
const AuthService_1 = require("../services/AuthService");
const authenticateToken = async (req, res, next) => {
    var _a, _b;
    try {
        // First try cookie-based authentication
        const accessToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (accessToken) {
            const payload = AuthService_1.authService.verifyAccessToken(accessToken);
            if (!payload) {
                // Try to refresh the token
                const refreshToken = (_b = req.cookies) === null || _b === void 0 ? void 0 : _b.refreshToken;
                if (refreshToken) {
                    const { userAgent, ipAddress } = AuthService_1.authService.getRequestMetadata(req);
                    const tokens = await AuthService_1.authService.rotateRefreshToken(refreshToken, userAgent, ipAddress);
                    if (tokens) {
                        // Set new cookies
                        AuthService_1.authService.setAuthCookies(res, tokens);
                        // Verify new access token
                        const newPayload = AuthService_1.authService.verifyAccessToken(tokens.accessToken);
                        if (newPayload) {
                            // Create User entity from token payload
                            const tokenUser = new User_1.User();
                            tokenUser.id = newPayload.userId || newPayload.sub || '';
                            tokenUser.email = newPayload.email || '';
                            tokenUser.role = newPayload.role || auth_1.UserRole.CUSTOMER;
                            tokenUser.status = newPayload.status || auth_1.UserStatus.ACTIVE;
                            tokenUser.name = newPayload.name;
                            tokenUser.businessInfo = newPayload.businessInfo;
                            tokenUser.createdAt = newPayload.createdAt || new Date();
                            tokenUser.updatedAt = newPayload.updatedAt || new Date();
                            tokenUser.lastLoginAt = newPayload.lastLoginAt;
                            // Add userId property for backward compatibility
                            req.user = {
                                ...tokenUser,
                                userId: tokenUser.id
                            };
                            return next();
                        }
                    }
                }
                AuthService_1.authService.clearAuthCookies(res);
                return res.status(401).json({
                    error: 'Invalid or expired token',
                    code: 'INVALID_TOKEN'
                });
            }
            // Create User entity from token payload
            const cookieUser = new User_1.User();
            cookieUser.id = payload.userId || payload.sub || '';
            cookieUser.email = payload.email || '';
            cookieUser.role = payload.role || auth_1.UserRole.CUSTOMER;
            cookieUser.status = payload.status || auth_1.UserStatus.ACTIVE;
            cookieUser.name = payload.name;
            cookieUser.businessInfo = payload.businessInfo;
            cookieUser.createdAt = payload.createdAt || new Date();
            cookieUser.updatedAt = payload.updatedAt || new Date();
            cookieUser.lastLoginAt = payload.lastLoginAt;
            req.user = cookieUser;
            return next();
        }
        // Fall back to JWT Bearer token authentication for backward compatibility
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_REQUIRED',
                message: 'No valid authentication token found. Please log in again.'
            });
        }
        // TEMPORARY: Allow test token for CPT Engine testing
        if (token === 'test-cpt-token' && process.env.NODE_ENV !== 'production') {
            const testUser = new User_1.User();
            testUser.id = 'test-admin-id';
            testUser.email = 'admin@test.com';
            testUser.name = 'Test Admin';
            testUser.role = 'admin';
            testUser.status = 'ACTIVE';
            testUser.createdAt = new Date();
            testUser.updatedAt = new Date();
            req.user = testUser;
            return next();
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not configured');
        }
        const decoded = jwt.verify(token, jwtSecret);
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: decoded.userId },
            select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
        });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        if (user.status !== auth_1.UserStatus.APPROVED && user.status !== auth_1.UserStatus.ACTIVE) {
            return res.status(403).json({
                error: 'Account not active',
                code: 'ACCOUNT_NOT_ACTIVE',
                status: user.status
            });
        }
        // Add userId property for backward compatibility
        req.user = {
            ...user,
            userId: user.id
        };
        next();
    }
    catch (error) {
        // Enhanced error handling for better debugging
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                code: 'TOKEN_EXPIRED',
                message: 'Your session has expired. Please log in again.'
            });
        }
        else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token format',
                code: 'TOKEN_MALFORMED',
                message: 'Invalid authentication token format.'
            });
        }
        else {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'TOKEN_INVALID',
                message: 'Authentication failed. Please log in again.'
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// Legacy role checking functions removed - use permission.middleware instead
// import { requireAdmin, requireRole, requireAnyRole } from './permission.middleware';
// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    var _a;
    try {
        // First try cookie-based authentication
        const accessToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (accessToken) {
            const payload = AuthService_1.authService.verifyAccessToken(accessToken);
            if (payload) {
                // Create User entity from token payload
                const refreshTokenUser = new User_1.User();
                refreshTokenUser.id = payload.userId || payload.sub || '';
                refreshTokenUser.email = payload.email || '';
                refreshTokenUser.role = payload.role || auth_1.UserRole.CUSTOMER;
                refreshTokenUser.status = payload.status || auth_1.UserStatus.ACTIVE;
                refreshTokenUser.name = payload.name;
                refreshTokenUser.businessInfo = payload.businessInfo;
                refreshTokenUser.createdAt = payload.createdAt || new Date();
                refreshTokenUser.updatedAt = payload.updatedAt || new Date();
                refreshTokenUser.lastLoginAt = payload.lastLoginAt;
                req.user = refreshTokenUser;
                return next();
            }
        }
        // Fall back to JWT Bearer token authentication
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return next();
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next();
        }
        const decoded = jwt.verify(token, jwtSecret);
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: decoded.userId },
            select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
        });
        if (user && user.status === auth_1.UserStatus.APPROVED) {
            // Add userId property for backward compatibility
            req.user = {
                ...user,
                userId: user.id
            };
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Export authenticateToken as authenticate for compatibility
exports.authenticate = exports.authenticateToken;
// Export authenticateToken as authenticateCookie for auth-v2 compatibility
exports.authenticateCookie = exports.authenticateToken;
//# sourceMappingURL=auth.js.map