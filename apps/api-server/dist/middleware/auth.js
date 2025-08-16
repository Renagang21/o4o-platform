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
exports.authenticate = exports.optionalAuth = exports.requireManagerOrAdmin = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const auth_1 = require("../types/auth");
const AuthService_1 = require("../services/AuthService");
const authenticateToken = async (req, res, next) => {
    var _a, _b;
    try {
        // 개발 환경에서 DB 연결 없이 인증 우회
        if (!connection_1.AppDataSource.isInitialized && process.env.NODE_ENV === 'development') {
            // Create a mock User entity for development
            const devUser = new User_1.User();
            devUser.id = 'dev-user-1';
            devUser.email = 'admin@o4o.com';
            devUser.name = '개발 관리자';
            devUser.role = auth_1.UserRole.ADMIN;
            devUser.status = auth_1.UserStatus.APPROVED;
            devUser.createdAt = new Date();
            devUser.updatedAt = new Date();
            devUser.lastLoginAt = new Date();
            req.user = devUser;
            return next();
        }
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
                            req.user = tokenUser;
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
                code: 'TOKEN_REQUIRED'
            });
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
        if (user.status !== auth_1.UserStatus.APPROVED) {
            return res.status(403).json({
                error: 'Account not active',
                code: 'ACCOUNT_NOT_ACTIVE',
                status: user.status
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'TOKEN_INVALID'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        if (!roles.includes(authReq.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: authReq.user.role
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireManagerOrAdmin = (0, exports.requireRole)(['admin', 'manager']);
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
            req.user = user;
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
//# sourceMappingURL=auth.js.map