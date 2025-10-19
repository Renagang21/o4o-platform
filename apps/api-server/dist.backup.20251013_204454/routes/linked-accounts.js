"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const sessionSyncService_1 = require("../services/sessionSyncService");
const router = (0, express_1.Router)();
/**
 * SSO Check endpoint - Check if user is authenticated (no auth required)
 * This endpoint should be accessible without authentication to check SSO status
 */
router.get('/sso/check', async (req, res) => {
    var _a;
    try {
        // Check for session cookie
        const sessionId = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId;
        if (!sessionId) {
            return res.json({
                authenticated: false,
                message: 'No session found'
            });
        }
        // Verify session in Redis
        const session = await sessionSyncService_1.SessionSyncService.validateSession(sessionId);
        if (!session) {
            return res.json({
                authenticated: false,
                message: 'Invalid or expired session'
            });
        }
        // Return authenticated status with user info
        res.json({
            authenticated: true,
            user: {
                id: session.userId,
                email: session.email,
                role: session.role,
                status: session.status
            },
            sessionId: sessionId
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            authenticated: false,
            error: 'Failed to check SSO status'
        });
    }
});
/**
 * Get user's linked accounts
 */
router.get('/linked-accounts', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await req.app.locals.AppDataSource
            .getRepository('User')
            .findOne({
            where: { id: userId },
            select: ['id', 'email', 'authProvider', 'googleId', 'kakaoId', 'naverId']
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const accounts = {
            local: !!user.email && user.authProvider === 'local',
            google: !!user.googleId,
            kakao: !!user.kakaoId,
            naver: !!user.naverId
        };
        res.json({
            success: true,
            accounts
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve linked accounts'
        });
    }
});
/**
 * Get user's active sessions
 */
router.get('/sessions', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await sessionSyncService_1.SessionSyncService.getUserSessions(userId);
        res.json({
            success: true,
            sessions,
            activeSessions: sessions.length
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve sessions'
        });
    }
});
/**
 * Logout from specific session
 */
router.delete('/sessions/:sessionId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        await sessionSyncService_1.SessionSyncService.removeSession(sessionId, userId);
        res.json({
            success: true,
            message: 'Session removed successfully'
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to remove session'
        });
    }
});
/**
 * Logout from all devices
 */
router.post('/logout-all-devices', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await sessionSyncService_1.SessionSyncService.logoutAllDevices(userId);
        res.json({
            success: true,
            message: 'Logged out from all devices'
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to logout from all devices'
        });
    }
});
exports.default = router;
//# sourceMappingURL=linked-accounts.js.map