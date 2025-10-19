"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const LoginSecurityService_1 = require("../../services/LoginSecurityService");
const UserService_1 = require("../../services/UserService");
const router = (0, express_1.Router)();
// Apply admin authentication to all routes
router.use(auth_middleware_1.authenticate);
router.use(permission_middleware_1.requireAdmin);
/**
 * Get security metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const metrics = await LoginSecurityService_1.LoginSecurityService.getSecurityMetrics(hours);
        res.json({
            success: true,
            data: metrics,
            timeframe: `${hours} hours`
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch security metrics'
        });
    }
});
/**
 * Get login attempts for a specific user
 */
router.get('/login-attempts/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const attempts = await LoginSecurityService_1.LoginSecurityService.getRecentLoginAttempts(email, limit);
        res.json({
            success: true,
            data: attempts,
            count: attempts.length
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch login attempts'
        });
    }
});
/**
 * Get login attempts by IP address
 */
router.get('/login-attempts-by-ip/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        const hours = parseInt(req.query.hours) || 24;
        const attempts = await LoginSecurityService_1.LoginSecurityService.getLoginAttemptsByIp(ip, hours);
        res.json({
            success: true,
            data: attempts,
            count: attempts.length,
            timeframe: `${hours} hours`
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch login attempts'
        });
    }
});
/**
 * Unlock user account
 */
router.post('/unlock-account', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        await LoginSecurityService_1.LoginSecurityService.unlockAccount(email);
        res.json({
            success: true,
            message: 'Account unlocked successfully'
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to unlock account'
        });
    }
});
/**
 * Lock user account
 */
router.post('/lock-account', async (req, res) => {
    try {
        const { email, minutes } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        await LoginSecurityService_1.LoginSecurityService.lockAccount(email, minutes);
        res.json({
            success: true,
            message: `Account locked for ${minutes || 30} minutes`
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to lock account'
        });
    }
});
/**
 * Reset login attempts for a user
 */
router.post('/reset-login-attempts', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        await LoginSecurityService_1.LoginSecurityService.resetLoginAttempts(email);
        res.json({
            success: true,
            message: 'Login attempts reset successfully'
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to reset login attempts'
        });
    }
});
/**
 * Get locked accounts
 */
router.get('/locked-accounts', async (req, res) => {
    try {
        const users = await UserService_1.UserService.getLockedAccounts();
        res.json({
            success: true,
            data: users.map(user => ({
                id: user.id,
                email: user.email,
                name: user.name,
                lockedUntil: user.lockedUntil,
                loginAttempts: user.loginAttempts,
                lastLoginAt: user.lastLoginAt
            })),
            count: users.length
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch locked accounts'
        });
    }
});
/**
 * Clean old login attempts
 */
router.post('/clean-login-attempts', async (req, res) => {
    try {
        const { daysToKeep } = req.body;
        const days = daysToKeep || 30;
        const deleted = await LoginSecurityService_1.LoginSecurityService.clearOldLoginAttempts(days);
        res.json({
            success: true,
            message: `Deleted ${deleted} old login attempts`,
            daysKept: days
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to clean login attempts'
        });
    }
});
exports.default = router;
//# sourceMappingURL=security.js.map