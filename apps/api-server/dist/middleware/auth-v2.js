"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireRole = exports.authenticateCookie = void 0;
const AuthService_1 = require("../services/AuthService");
const auth_1 = require("../types/auth");
/**
 * Middleware to authenticate requests using httpOnly cookies
 */
const authenticateCookie = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            res.status(401).json({
                error: 'Access token not provided',
                code: 'NO_ACCESS_TOKEN'
            });
            return;
        }
        const payload = AuthService_1.authService.verifyAccessToken(accessToken);
        if (!payload) {
            // Try to refresh the token
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                const { userAgent, ipAddress } = AuthService_1.authService.getRequestMetadata(req);
                const tokens = await AuthService_1.authService.rotateRefreshToken(refreshToken, userAgent, ipAddress);
                if (tokens) {
                    // Set new cookies
                    AuthService_1.authService.setAuthCookies(res, tokens);
                    // Verify new access token
                    const newPayload = AuthService_1.authService.verifyAccessToken(tokens.accessToken);
                    if (newPayload) {
                        req.user = {
                            id: newPayload.userId || newPayload.sub || '',
                            userId: newPayload.userId || newPayload.sub || '',
                            email: newPayload.email || '',
                            role: String(newPayload.role || auth_1.UserRole.CUSTOMER)
                        };
                        next();
                        return;
                    }
                }
            }
            AuthService_1.authService.clearAuthCookies(res);
            res.status(401).json({
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
            return;
        }
        req.user = {
            id: payload.userId || payload.sub || '',
            userId: payload.userId || payload.sub || '',
            email: payload.email || '',
            role: String(payload.role || auth_1.UserRole.CUSTOMER)
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        AuthService_1.authService.clearAuthCookies(res);
        res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
};
exports.authenticateCookie = authenticateCookie;
/**
 * Middleware for role-based access control
 */
const requireRole = (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware for optional authentication
 * Adds user to request if valid token exists, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (accessToken) {
            const payload = AuthService_1.authService.verifyAccessToken(accessToken);
            if (payload) {
                req.user = {
                    id: payload.userId || payload.sub || '',
                    userId: payload.userId || payload.sub || '',
                    email: payload.email || '',
                    role: String(payload.role || auth_1.UserRole.CUSTOMER)
                };
            }
        }
        next();
    }
    catch (error) {
        // Ignore errors in optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth-v2.js.map