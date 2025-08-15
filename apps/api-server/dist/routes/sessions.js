"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const sessionSyncService_1 = require("../services/sessionSyncService");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
/**
 * Get all active sessions for current user
 */
router.get('/my-sessions', async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const sessions = await sessionSyncService_1.SessionSyncService.getUserSessions(userId);
        const currentSessionId = (_b = req.cookies) === null || _b === void 0 ? void 0 : _b.sessionId;
        // Enrich session data with current session indicator
        const enrichedSessions = sessions.map(session => ({
            ...session,
            isCurrent: currentSessionId === session.sessionId,
            loginAt: session.loginAt,
            lastActivity: session.lastActivity,
            device: session.deviceInfo,
            ipAddress: session.ipAddress
        }));
        res.json({
            success: true,
            data: {
                sessions: enrichedSessions,
                count: enrichedSessions.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions'
        });
    }
});
/**
 * Logout from specific session
 */
router.post('/logout/:sessionId', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { sessionId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        // Verify session belongs to user
        const sessions = await sessionSyncService_1.SessionSyncService.getUserSessions(userId);
        const sessionExists = sessions.some((s) => s.sessionId === sessionId);
        if (!sessionExists) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        await sessionSyncService_1.SessionSyncService.removeSession(sessionId, userId);
        res.json({
            success: true,
            message: 'Session terminated successfully'
        });
    }
    catch (error) {
        console.error('Error terminating session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to terminate session'
        });
    }
});
/**
 * Logout from all devices
 */
router.post('/logout-all', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        await sessionSyncService_1.SessionSyncService.logoutAllDevices(userId);
        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    }
    catch (error) {
        console.error('Error logging out from all devices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout from all devices'
        });
    }
});
/**
 * Get session statistics
 */
router.get('/stats', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const sessions = await sessionSyncService_1.SessionSyncService.getUserSessions(userId);
        // Calculate statistics
        const deviceTypes = sessions.reduce((acc, session) => {
            var _a;
            const type = ((_a = session.deviceInfo) === null || _a === void 0 ? void 0 : _a.deviceType) || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        const browsers = sessions.reduce((acc, session) => {
            var _a;
            const browser = ((_a = session.deviceInfo) === null || _a === void 0 ? void 0 : _a.browser) || 'unknown';
            acc[browser] = (acc[browser] || 0) + 1;
            return acc;
        }, {});
        res.json({
            success: true,
            data: {
                totalSessions: sessions.length,
                deviceTypes,
                browsers,
                lastActivity: sessions.reduce((latest, session) => {
                    const activity = new Date(session.lastActivity || session.loginAt);
                    return activity > latest ? activity : latest;
                }, new Date(0))
            }
        });
    }
    catch (error) {
        console.error('Error fetching session stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map