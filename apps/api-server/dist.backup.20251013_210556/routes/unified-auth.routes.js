"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const unified_auth_service_1 = require("../services/unified-auth.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const refreshToken_service_1 = require("../services/refreshToken.service");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const unifiedAuthService = new unified_auth_service_1.UnifiedAuthService();
// Validation middleware
const validateDto = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
// Email login validation
const emailLoginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];
// OAuth login validation
const oauthLoginValidation = [
    (0, express_validator_1.body)('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid provider'),
    (0, express_validator_1.body)('profile.id').notEmpty().withMessage('Provider ID is required'),
    (0, express_validator_1.body)('profile.email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('profile.displayName').optional().isString(),
    (0, express_validator_1.body)('profile.firstName').optional().isString(),
    (0, express_validator_1.body)('profile.lastName').optional().isString(),
    (0, express_validator_1.body)('profile.avatar').optional().isURL(),
    (0, express_validator_1.body)('profile.emailVerified').optional().isBoolean()
];
/**
 * @route POST /api/auth/unified/login
 * @desc Unified login endpoint for email and OAuth
 * @access Public
 */
router.post('/login', async (req, res) => {
    try {
        const { provider, email, password, oauthProfile } = req.body;
        // Get IP address
        const ipAddress = req.ip || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        let result;
        if (provider === 'email') {
            // Validate email login
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }
            result = await unifiedAuthService.login({
                provider: 'email',
                credentials: { email, password },
                ipAddress,
                userAgent
            });
        }
        else if (['google', 'kakao', 'naver'].includes(provider)) {
            // Validate OAuth login
            if (!oauthProfile || !oauthProfile.id || !oauthProfile.email) {
                return res.status(400).json({
                    success: false,
                    message: 'OAuth profile is required'
                });
            }
            result = await unifiedAuthService.login({
                provider: provider,
                oauthProfile: oauthProfile,
                ipAddress,
                userAgent
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid provider'
            });
        }
        // Set cookies if in production
        if (process.env.NODE_ENV === 'production') {
            res.cookie('accessToken', result.tokens.accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                domain: '.neture.co.kr',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                domain: '.neture.co.kr',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
        }
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Unified login error:', error);
        if (error.message === 'Invalid credentials' ||
            error.message === 'Account is not active') {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});
/**
 * @route POST /api/auth/unified/email
 * @desc Email/password login
 * @access Public
 */
router.post('/email', emailLoginValidation, validateDto, async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        const result = await unifiedAuthService.login({
            provider: 'email',
            credentials: { email, password },
            ipAddress,
            userAgent
        });
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Email login error:', error);
        if (error.message === 'Invalid credentials') {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});
/**
 * @route POST /api/auth/unified/oauth
 * @desc OAuth login
 * @access Public
 */
router.post('/oauth', oauthLoginValidation, validateDto, async (req, res) => {
    try {
        const { provider, profile } = req.body;
        const ipAddress = req.ip || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        const result = await unifiedAuthService.login({
            provider: provider,
            oauthProfile: profile,
            ipAddress,
            userAgent
        });
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('OAuth login error:', error);
        res.status(500).json({
            success: false,
            message: 'OAuth login failed'
        });
    }
});
/**
 * @route GET /api/auth/unified/check-email
 * @desc Check available login methods for email
 * @access Public
 */
router.get('/check-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        const providers = await unifiedAuthService.getAvailableProviders(email);
        res.json({
            success: true,
            email,
            providers,
            hasAccount: providers.length > 0
        });
    }
    catch (error) {
        logger_1.default.error('Check email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check email'
        });
    }
});
/**
 * @route GET /api/auth/unified/can-login
 * @desc Check if user can login with specific provider
 * @access Public
 */
router.get('/can-login', async (req, res) => {
    try {
        const { email, provider } = req.query;
        if (!email || typeof email !== 'string' || !provider || typeof provider !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Email and provider are required'
            });
        }
        const canLogin = await unifiedAuthService.canLogin(email, provider);
        res.json({
            success: true,
            canLogin
        });
    }
    catch (error) {
        logger_1.default.error('Can login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check login availability'
        });
    }
});
/**
 * @route POST /api/auth/unified/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', auth_middleware_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        // Clear cookies
        if (process.env.NODE_ENV === 'production') {
            res.clearCookie('accessToken', {
                domain: '.neture.co.kr'
            });
            res.clearCookie('refreshToken', {
                domain: '.neture.co.kr'
            });
        }
        // Invalidate refresh token
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
        if (refreshToken) {
            await refreshToken_service_1.refreshTokenService.revokeToken(refreshToken, 'Unified auth logout');
        }
        else if (userId) {
            await refreshToken_service_1.refreshTokenService.revokeAllUserTokens(userId, 'Unified auth logout');
        }
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=unified-auth.routes.js.map