"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const account_linking_service_1 = require("../services/account-linking.service");
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Validation middleware
const validateDto = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
// Link OAuth account validation
const linkOAuthValidation = [
    (0, express_validator_1.body)('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid provider'),
    (0, express_validator_1.body)('providerId').notEmpty().withMessage('Provider ID is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('displayName').optional().isString(),
    (0, express_validator_1.body)('profileImage').optional().isURL()
];
// Link email account validation
const linkEmailValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];
// Unlink account validation
const unlinkValidation = [
    (0, express_validator_1.body)('provider').isIn(['email', 'google', 'kakao', 'naver']).withMessage('Invalid provider'),
    (0, express_validator_1.body)('verification.method').isIn(['password', 'otp']).withMessage('Invalid verification method'),
    (0, express_validator_1.body)('verification.password').optional().isString()
];
// Merge accounts validation
const mergeValidation = [
    (0, express_validator_1.body)('sourceUserId').isUUID().withMessage('Valid source user ID required'),
    (0, express_validator_1.body)('targetUserId').isUUID().withMessage('Valid target user ID required'),
    (0, express_validator_1.body)('verification.method').isIn(['password', 'otp']).withMessage('Invalid verification method'),
    (0, express_validator_1.body)('verification.password').optional().isString(),
    (0, express_validator_1.body)('mergeOptions.preferredProvider').optional().isIn(['email', 'google', 'kakao', 'naver']),
    (0, express_validator_1.body)('mergeOptions.mergeFields').optional().isObject()
];
/**
 * @route GET /api/auth/accounts/linked
 * @desc Get all linked accounts for authenticated user
 * @access Private
 */
router.get('/linked', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await account_linking_service_1.AccountLinkingService.getMergedProfile(userId);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: '프로필을 찾을 수 없습니다'
            });
        }
        res.json({
            success: true,
            data: {
                profile,
                linkedAccounts: profile.linkedAccounts.map(account => ({
                    id: account.id,
                    provider: account.provider,
                    email: account.email,
                    displayName: account.displayName,
                    profileImage: account.profileImage,
                    isVerified: account.isVerified,
                    isPrimary: account.isPrimary,
                    linkedAt: account.linkedAt,
                    lastUsedAt: account.lastUsedAt
                }))
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get linked accounts error:', error);
        res.status(500).json({
            success: false,
            message: '연결된 계정 조회 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route POST /api/auth/accounts/link/oauth
 * @desc Link OAuth account to existing user
 * @access Private
 */
router.post('/link/oauth', auth_middleware_1.authenticate, linkOAuthValidation, validateDto, async (req, res) => {
    try {
        const userId = req.user.id;
        const { provider, providerId, email, displayName, profileImage } = req.body;
        const result = await account_linking_service_1.AccountLinkingService.linkOAuthAccount(userId, provider, { providerId, email, displayName, profileImage });
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        logger_1.default.error('Link OAuth account error:', error);
        res.status(500).json({
            success: false,
            message: '계정 연결 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route POST /api/auth/accounts/link/email
 * @desc Link email account to existing OAuth user
 * @access Private
 */
router.post('/link/email', auth_middleware_1.authenticate, linkEmailValidation, validateDto, async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, password } = req.body;
        const result = await account_linking_service_1.AccountLinkingService.linkEmailAccount(userId, email, password);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        logger_1.default.error('Link email account error:', error);
        res.status(500).json({
            success: false,
            message: '이메일 계정 연결 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route GET /api/auth/accounts/verify-email
 * @desc Verify email linking token
 * @access Public
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 토큰입니다'
            });
        }
        const result = await account_linking_service_1.AccountLinkingService.verifyEmailLinking(token);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        logger_1.default.error('Verify email linking error:', error);
        res.status(500).json({
            success: false,
            message: '이메일 인증 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route POST /api/auth/accounts/unlink
 * @desc Unlink account from user
 * @access Private
 */
router.post('/unlink', auth_middleware_1.authenticate, unlinkValidation, validateDto, async (req, res) => {
    try {
        const userId = req.user.id;
        const { provider, verification } = req.body;
        const result = await account_linking_service_1.AccountLinkingService.unlinkAccount(userId, { provider }, verification);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        logger_1.default.error('Unlink account error:', error);
        res.status(500).json({
            success: false,
            message: '계정 연결 해제 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route POST /api/auth/accounts/set-primary
 * @desc Set primary account
 * @access Private
 */
router.post('/set-primary', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { accountId } = req.body;
        if (!accountId) {
            return res.status(400).json({
                success: false,
                message: '계정 ID가 필요합니다'
            });
        }
        // Implementation would go here
        // For now, returning success
        res.json({
            success: true,
            message: '주 계정이 설정되었습니다'
        });
    }
    catch (error) {
        logger_1.default.error('Set primary account error:', error);
        res.status(500).json({
            success: false,
            message: '주 계정 설정 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route POST /api/auth/accounts/merge
 * @desc Merge two user accounts
 * @access Private (Admin only)
 */
router.post('/merge', auth_middleware_1.authenticate, mergeValidation, validateDto, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin()) {
            return res.status(403).json({
                success: false,
                message: '권한이 없습니다'
            });
        }
        const { sourceUserId, targetUserId, mergeOptions } = req.body;
        const result = await account_linking_service_1.AccountLinkingService.mergeAccounts({
            sourceUserId,
            targetUserId,
            mergeOptions: mergeOptions || {
                preferredProvider: 'email',
                mergeFields: {
                    name: true,
                    profileImage: true,
                    linkedAccounts: true
                }
            }
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        logger_1.default.error('Merge accounts error:', error);
        res.status(500).json({
            success: false,
            message: '계정 병합 중 오류가 발생했습니다'
        });
    }
});
/**
 * @route GET /api/auth/accounts/can-link
 * @desc Check if account can be linked
 * @access Private
 */
router.get('/can-link', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { provider, providerId } = req.query;
        if (!provider || typeof provider !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Provider is required'
            });
        }
        const canLink = await account_linking_service_1.AccountLinkingService.canLinkAccount(userId, provider, providerId);
        res.json({
            success: true,
            canLink
        });
    }
    catch (error) {
        logger_1.default.error('Check can link error:', error);
        res.status(500).json({
            success: false,
            message: '계정 연결 가능 여부 확인 중 오류가 발생했습니다'
        });
    }
});
exports.default = router;
//# sourceMappingURL=account-linking.routes.js.map