"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passportDynamic_1 = __importDefault(require("../config/passportDynamic"));
const socialAuthService_1 = require("../services/socialAuthService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Success/Failure redirect URLs
const getRedirectUrls = () => ({
    success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?success=true`,
    failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?error=social_auth_failed`
});
// Google OAuth routes
router.get('/google', passportDynamic_1.default.authenticate('google', {
    scope: ['profile', 'email']
}));
router.get('/google/callback', passportDynamic_1.default.authenticate('google', { session: false }), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect(getRedirectUrls().failure);
        }
        await socialAuthService_1.SocialAuthService.completeSocialLogin(user, res);
        res.redirect(getRedirectUrls().success);
    }
    catch (error) {
        // Error log removed
        res.redirect(getRedirectUrls().failure);
    }
});
// Kakao OAuth routes
router.get('/kakao', passportDynamic_1.default.authenticate('kakao'));
router.get('/kakao/callback', passportDynamic_1.default.authenticate('kakao', { session: false }), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect(getRedirectUrls().failure);
        }
        await socialAuthService_1.SocialAuthService.completeSocialLogin(user, res);
        res.redirect(getRedirectUrls().success);
    }
    catch (error) {
        // Error log removed
        res.redirect(getRedirectUrls().failure);
    }
});
// Naver OAuth routes
router.get('/naver', passportDynamic_1.default.authenticate('naver'));
router.get('/naver/callback', passportDynamic_1.default.authenticate('naver', { session: false }), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect(getRedirectUrls().failure);
        }
        await socialAuthService_1.SocialAuthService.completeSocialLogin(user, res);
        res.redirect(getRedirectUrls().success);
    }
    catch (error) {
        // Error log removed
        res.redirect(getRedirectUrls().failure);
    }
});
// Link social account (authenticated users only)
router.post('/link/:provider', auth_1.authenticateCookie, async (req, res) => {
    try {
        const { provider } = req.params;
        const { providerId } = req.body;
        if (!['google', 'kakao', 'naver'].includes(provider)) {
            return res.status(400).json({
                error: 'Invalid provider',
                code: 'INVALID_PROVIDER'
            });
        }
        if (!providerId) {
            return res.status(400).json({
                error: 'Provider ID is required',
                code: 'PROVIDER_ID_REQUIRED'
            });
        }
        const user = await socialAuthService_1.SocialAuthService.linkSocialAccount(req.user.userId || req.user.id || '', provider, providerId);
        res.json({
            success: true,
            message: `${provider} account linked successfully`,
            user: {
                id: user.id,
                email: user.email,
                provider: user.provider,
                hasPassword: !!user.password
            }
        });
    }
    catch (error) {
        // Error log removed
        res.status(400).json({
            error: error.message || 'Failed to link social account',
            code: 'LINK_FAILED'
        });
    }
});
// Unlink social account
router.delete('/unlink', auth_1.authenticateCookie, async (req, res) => {
    try {
        const user = await socialAuthService_1.SocialAuthService.unlinkSocialAccount(req.user.userId || req.user.id || '');
        res.json({
            success: true,
            message: 'Social account unlinked successfully',
            user: {
                id: user.id,
                email: user.email,
                provider: user.provider,
                hasPassword: !!user.password
            }
        });
    }
    catch (error) {
        // Error log removed
        res.status(400).json({
            error: error.message || 'Failed to unlink social account',
            code: 'UNLINK_FAILED'
        });
    }
});
// Get linked accounts
router.get('/linked-accounts', auth_1.authenticateCookie, async (req, res) => {
    try {
        const accounts = await socialAuthService_1.SocialAuthService.getLinkedAccounts(req.user.userId || req.user.id || '');
        res.json({
            success: true,
            accounts
        });
    }
    catch (error) {
        // Error log removed
        res.status(400).json({
            error: error.message || 'Failed to get linked accounts',
            code: 'GET_LINKED_FAILED'
        });
    }
});
exports.default = router;
//# sourceMappingURL=social-auth.js.map