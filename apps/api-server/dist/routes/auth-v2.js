"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const AuthService_1 = require("../services/AuthService");
const AuthServiceV2_1 = require("../services/AuthServiceV2");
const UserService_1 = require("../services/UserService");
const sessionSyncService_1 = require("../services/sessionSyncService");
const passwordResetService_1 = require("../services/passwordResetService");
const auth_v2_1 = require("../middleware/auth-v2");
const router = (0, express_1.Router)();
// Login with httpOnly cookies
router.post('/login', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        const { userAgent, ipAddress } = AuthServiceV2_1.AuthServiceV2.getRequestMetadata(req);
        const result = await AuthServiceV2_1.AuthServiceV2.login(email, password, userAgent, ipAddress);
        if (!result) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        // Set httpOnly cookies
        AuthServiceV2_1.AuthServiceV2.setAuthCookies(res, result.tokens);
        // Set session ID cookie for SSO
        res.cookie('sessionId', result.sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.COOKIE_DOMAIN || undefined // For cross-subdomain SSO
        });
        // Create SSO session (we need to fetch full user for this)
        const fullUser = await UserService_1.UserService.getUserById(result.user.id);
        if (fullUser) {
            await sessionSyncService_1.SessionSyncService.createSession(fullUser, result.sessionId);
        }
        // Return user data (no tokens in response body)
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: result.user.role,
                status: result.user.status,
                businessInfo: result.user.businessInfo
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error.message.includes('Account is')) {
            return res.status(403).json({
                error: error.message,
                code: 'ACCOUNT_NOT_ACTIVE'
            });
        }
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// Register
router.post('/register', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), (0, express_validator_1.body)('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'), (0, express_validator_1.body)('role').optional().isIn(['customer', 'seller', 'supplier']).withMessage('Invalid role'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, name, role = 'customer' } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Check if email exists
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                error: 'Email already exists',
                code: 'EMAIL_EXISTS'
            });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
        // Create new user
        const user = new User_1.User();
        user.email = email;
        user.password = hashedPassword;
        user.name = name;
        user.role = role;
        user.status = User_1.UserStatus.PENDING; // Requires admin approval
        await userRepository.save(user);
        // Send email verification
        try {
            await passwordResetService_1.PasswordResetService.requestEmailVerification(user.id);
        }
        catch (error) {
            console.error('Failed to send verification email:', error);
            // Don't fail registration if email fails
        }
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({
                error: 'Refresh token not provided',
                code: 'NO_REFRESH_TOKEN'
            });
        }
        const { userAgent, ipAddress } = AuthServiceV2_1.AuthServiceV2.getRequestMetadata(req);
        const tokens = await AuthServiceV2_1.AuthServiceV2.refreshTokens(refreshToken, { userAgent, ipAddress });
        if (!tokens) {
            AuthServiceV2_1.AuthServiceV2.clearAuthCookies(res);
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
        // Set new cookies
        AuthServiceV2_1.AuthServiceV2.setAuthCookies(res, tokens);
        res.json({
            success: true,
            message: 'Token refreshed successfully'
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        AuthService_1.authService.clearAuthCookies(res);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// Logout
router.post('/logout', async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken;
        const sessionId = req.cookies.sessionId;
        if (accessToken) {
            const payload = AuthService_1.authService.verifyAccessToken(accessToken);
            if (payload) {
                // Revoke all refresh tokens for this user
                await AuthService_1.authService.revokeAllUserTokens(payload.userId || payload.sub || '');
                // Remove SSO session
                if (sessionId) {
                    await sessionSyncService_1.SessionSyncService.removeSession(sessionId, payload.userId || payload.sub || '');
                }
            }
        }
        // Clear cookies
        AuthService_1.authService.clearAuthCookies(res);
        res.clearCookie('sessionId', {
            domain: process.env.COOKIE_DOMAIN || undefined
        });
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        // Still clear cookies even if error occurs
        AuthService_1.authService.clearAuthCookies(res);
        res.clearCookie('sessionId', {
            domain: process.env.COOKIE_DOMAIN || undefined
        });
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
});
// Verify current session
router.get('/me', auth_v2_1.authenticateCookie, async (req, res) => {
    var _a, _b;
    try {
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) },
            select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'permissions']
        });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// Logout from all devices
router.post('/logout-all', auth_v2_1.authenticateCookie, async (req, res) => {
    var _a, _b;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) && !((_b = req.user) === null || _b === void 0 ? void 0 : _b.id)) {
            return res.status(401).json({
                error: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        // Revoke all refresh tokens
        await AuthService_1.authService.revokeAllUserTokens(req.user.userId || req.user.id);
        // Remove all SSO sessions
        await sessionSyncService_1.SessionSyncService.removeAllUserSessions(req.user.userId || req.user.id);
        // Clear current session cookies
        AuthService_1.authService.clearAuthCookies(res);
        res.clearCookie('sessionId', {
            domain: process.env.COOKIE_DOMAIN || undefined
        });
        res.json({
            success: true,
            message: 'Logged out from all devices'
        });
    }
    catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// Request password reset
router.post('/forgot-password', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email } = req.body;
        await passwordResetService_1.PasswordResetService.requestPasswordReset(email);
        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    }
    catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            error: 'Failed to process password reset request',
            code: 'RESET_REQUEST_FAILED'
        });
    }
});
// Reset password with token
router.post('/reset-password', (0, express_validator_1.body)('token').notEmpty().withMessage('Reset token is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { token, password } = req.body;
        await passwordResetService_1.PasswordResetService.resetPassword(token, password);
        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(400).json({
            error: error.message || 'Failed to reset password',
            code: 'RESET_FAILED'
        });
    }
});
// Request email verification (for authenticated users)
router.post('/resend-verification-auth', auth_v2_1.authenticateCookie, async (req, res) => {
    var _a, _b;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) && !((_b = req.user) === null || _b === void 0 ? void 0 : _b.id)) {
            return res.status(401).json({
                error: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        await passwordResetService_1.PasswordResetService.requestEmailVerification(req.user.userId || req.user.id);
        res.json({
            success: true,
            message: 'Verification email has been sent'
        });
    }
    catch (error) {
        console.error('Email verification request error:', error);
        res.status(400).json({
            error: error.message || 'Failed to send verification email',
            code: 'VERIFICATION_REQUEST_FAILED'
        });
    }
});
// Request email verification (for unauthenticated users)
router.post('/resend-verification', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Find user by email
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if email exists
            return res.json({
                success: true,
                message: 'If an account exists with this email, a verification email has been sent.'
            });
        }
        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({
                error: 'Email is already verified',
                code: 'ALREADY_VERIFIED'
            });
        }
        // Send verification email
        try {
            await passwordResetService_1.PasswordResetService.requestEmailVerification(user.id);
        }
        catch (error) {
            console.error('Failed to send verification email:', error);
            return res.status(500).json({
                error: 'Failed to send verification email',
                code: 'EMAIL_SEND_FAILED'
            });
        }
        res.json({
            success: true,
            message: 'Verification email has been sent'
        });
    }
    catch (error) {
        console.error('Email verification request error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// Verify email with token (POST)
router.post('/verify-email', (0, express_validator_1.body)('token').notEmpty().withMessage('Verification token is required'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { token } = req.body;
        await passwordResetService_1.PasswordResetService.verifyEmail(token);
        res.json({
            success: true,
            message: 'Email has been verified successfully'
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(400).json({
            error: error.message || 'Failed to verify email',
            code: 'VERIFICATION_FAILED'
        });
    }
});
// Verify email with token (GET) - for email links
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: 'Verification token is required',
                code: 'MISSING_TOKEN'
            });
        }
        await passwordResetService_1.PasswordResetService.verifyEmail(token);
        res.json({
            success: true,
            message: 'Email has been verified successfully'
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        // Provide specific error codes based on error message
        let errorCode = 'VERIFICATION_FAILED';
        if (error.message.includes('expired')) {
            errorCode = 'TOKEN_EXPIRED';
        }
        else if (error.message.includes('invalid')) {
            errorCode = 'INVALID_TOKEN';
        }
        else if (error.message.includes('already verified')) {
            errorCode = 'ALREADY_VERIFIED';
        }
        res.status(400).json({
            error: error.message || 'Failed to verify email',
            code: errorCode
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth-v2.js.map