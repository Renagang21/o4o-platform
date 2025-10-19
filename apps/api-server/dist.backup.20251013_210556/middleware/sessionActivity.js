"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSession = exports.updateSessionActivity = void 0;
const sessionSyncService_1 = require("../services/sessionSyncService");
/**
 * Middleware to update session activity on each request
 */
const updateSessionActivity = async (req, res, next) => {
    var _a;
    try {
        // Get session ID from cookie or header
        const sessionId = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId) || req.headers['x-session-id'];
        if (sessionId && typeof sessionId === 'string') {
            // Update session activity in background (non-blocking)
            sessionSyncService_1.SessionSyncService.updateSessionActivity(sessionId).catch(err => {
                // Error log removed
            });
        }
    }
    catch (error) {
        // Don't block the request if session update fails
        // Error log removed
    }
    next();
};
exports.updateSessionActivity = updateSessionActivity;
/**
 * Middleware to validate session on protected routes
 */
const validateSession = async (req, res, next) => {
    var _a;
    try {
        const sessionId = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId) || req.headers['x-session-id'];
        if (!sessionId || typeof sessionId !== 'string') {
            return next(); // Let auth middleware handle missing session
        }
        const sessionData = await sessionSyncService_1.SessionSyncService.validateSession(sessionId);
        if (!sessionData) {
            // Session invalid or expired - clear cookie
            res.clearCookie('sessionId');
            res.status(401).json({
                success: false,
                error: 'Session expired or invalid'
            });
            return;
        }
        // Attach session data to request for downstream use
        req.session = sessionData;
        next();
    }
    catch (error) {
        // Error log removed
        next(); // Continue without session validation
    }
};
exports.validateSession = validateSession;
//# sourceMappingURL=sessionActivity.js.map