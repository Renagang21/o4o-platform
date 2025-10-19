"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalSSOSession = exports.validateSSOSession = void 0;
const sessionSyncService_1 = require("../services/sessionSyncService");
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
/**
 * Middleware to validate SSO session
 */
const validateSSOSession = async (req, res, next) => {
    var _a;
    try {
        const sessionId = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId;
        if (!sessionId) {
            res.status(401).json({
                error: 'No session found',
                code: 'NO_SESSION'
            });
            return;
        }
        const sessionData = await sessionSyncService_1.SessionSyncService.validateSession(sessionId);
        if (!sessionData) {
            res.clearCookie('sessionId', {
                domain: process.env.COOKIE_DOMAIN || undefined
            });
            res.status(401).json({
                error: 'Invalid or expired session',
                code: 'INVALID_SESSION'
            });
            return;
        }
        // Get full user data
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: sessionData.userId },
            select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'permissions']
        });
        if (!user) {
            res.clearCookie('sessionId', {
                domain: process.env.COOKIE_DOMAIN || undefined
            });
            res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        // Add user to request
        req.user = user;
        next();
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            error: 'Session validation failed',
            code: 'SESSION_ERROR'
        });
    }
};
exports.validateSSOSession = validateSSOSession;
/**
 * Middleware for optional SSO session validation
 */
const optionalSSOSession = async (req, res, next) => {
    var _a;
    try {
        const sessionId = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId;
        if (!sessionId) {
            return next();
        }
        const sessionData = await sessionSyncService_1.SessionSyncService.validateSession(sessionId);
        if (!sessionData) {
            // Clear invalid session cookie
            res.clearCookie('sessionId', {
                domain: process.env.COOKIE_DOMAIN || undefined
            });
            return next();
        }
        // Get full user data
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: sessionData.userId },
            select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'permissions']
        });
        if (user) {
            req.user = user;
        }
        next();
    }
    catch (error) {
        // Continue without session
        next();
    }
};
exports.optionalSSOSession = optionalSSOSession;
//# sourceMappingURL=sso.js.map