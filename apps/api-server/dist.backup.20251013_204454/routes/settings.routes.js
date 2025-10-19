"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const adminOnly_1 = require("../middleware/adminOnly");
const validateDto_1 = require("../middleware/validateDto");
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = require("../utils/crypto");
const connection_1 = require("../database/connection");
const Settings_1 = require("../entities/Settings");
const passportDynamic_1 = require("../config/passportDynamic");
const oauth_providers_1 = require("../config/oauth-providers");
const router = (0, express_1.Router)();
// Validation rules
const oauthUpdateValidation = [
    (0, express_validator_1.body)('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid OAuth provider'),
    (0, express_validator_1.body)('config').isObject().withMessage('Config must be an object'),
    (0, express_validator_1.body)('config.enabled').optional().isBoolean(),
    (0, express_validator_1.body)('config.clientId').optional().isString().trim(),
    (0, express_validator_1.body)('config.clientSecret').optional().isString().trim(),
    (0, express_validator_1.body)('config.scope').optional().isArray()
];
const oauthTestValidation = [
    (0, express_validator_1.body)('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid OAuth provider')
];
// Helper function to get default OAuth config
const getDefaultOAuthConfig = (provider) => ({
    provider,
    enabled: false,
    clientId: '',
    clientSecret: '',
    callbackUrl: `${process.env.APP_URL || ''}/api/auth/callback/${provider}`,
    scope: []
});
// Helper function to get default OAuth settings
const getDefaultOAuthSettings = () => ({
    google: getDefaultOAuthConfig('google'),
    kakao: getDefaultOAuthConfig('kakao'),
    naver: getDefaultOAuthConfig('naver')
});
// Helper function to encrypt sensitive OAuth data
const encryptOAuthData = (data) => {
    const encrypted = { ...data };
    Object.keys(encrypted).forEach((provider) => {
        const config = encrypted[provider];
        if (config.clientSecret) {
            config.clientSecret = (0, crypto_1.encrypt)(config.clientSecret);
        }
    });
    return encrypted;
};
// Helper function to decrypt sensitive OAuth data
const decryptOAuthData = (data) => {
    const decrypted = { ...data };
    Object.keys(decrypted).forEach((provider) => {
        const config = decrypted[provider];
        if (config.clientSecret) {
            try {
                config.clientSecret = (0, crypto_1.decrypt)(config.clientSecret);
            }
            catch (error) {
                logger_1.default.error(`Failed to decrypt client secret for ${provider}:`, error);
                config.clientSecret = '';
            }
        }
    });
    return decrypted;
};
// Helper function to get OAuth settings from database
const getOAuthSettings = async () => {
    const settingRepository = connection_1.AppDataSource.getRepository(Settings_1.Settings);
    const oauthSetting = await settingRepository.findOne({
        where: { key: 'oauth_settings' }
    });
    if (!oauthSetting || !oauthSetting.value) {
        return getDefaultOAuthSettings();
    }
    try {
        const parsedData = typeof oauthSetting.value === 'string'
            ? JSON.parse(oauthSetting.value)
            : oauthSetting.value;
        return decryptOAuthData(parsedData);
    }
    catch (error) {
        logger_1.default.error('Failed to parse OAuth settings:', error);
        return getDefaultOAuthSettings();
    }
};
// GET /api/settings/oauth - Get OAuth settings
router.get('/oauth', auth_middleware_1.authenticate, adminOnly_1.adminOnly, async (req, res, next) => {
    try {
        const oauthData = await getOAuthSettings();
        res.json({
            success: true,
            data: oauthData
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching OAuth settings:', error);
        next(error);
    }
});
// PUT /api/settings/oauth - Update OAuth settings
router.put('/oauth', auth_middleware_1.authenticate, adminOnly_1.adminOnly, oauthUpdateValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { provider, config } = req.body;
        const settingRepository = connection_1.AppDataSource.getRepository(Settings_1.Settings);
        // Get current settings
        const currentData = await getOAuthSettings();
        let oauthSetting = await settingRepository.findOne({
            where: { key: 'oauth_settings' }
        });
        // Update specific provider config
        currentData[provider] = {
            ...currentData[provider],
            ...config,
            provider, // Ensure provider is always set
            callbackUrl: `${process.env.APP_URL}/api/auth/callback/${provider}` // Ensure callback URL is correct
        };
        // Encrypt sensitive data before saving
        const encryptedData = encryptOAuthData(currentData);
        // Save to database
        if (oauthSetting) {
            oauthSetting.value = encryptedData;
            await settingRepository.save(oauthSetting);
        }
        else {
            oauthSetting = settingRepository.create({
                key: 'oauth_settings',
                value: encryptedData,
                type: 'json'
            });
            await settingRepository.save(oauthSetting);
        }
        // Reload Passport strategies with new configuration
        try {
            await (0, passportDynamic_1.reloadPassportStrategies)();
            logger_1.default.info('Passport strategies reloaded successfully');
        }
        catch (passportError) {
            logger_1.default.error('Failed to reload Passport strategies:', passportError);
            // Don't fail the request, just log the error
        }
        res.json({
            success: true,
            message: `OAuth settings for ${provider} updated successfully`,
            data: currentData[provider]
        });
    }
    catch (error) {
        logger_1.default.error('Error updating OAuth settings:', error);
        next(error);
    }
});
// POST /api/settings/oauth/test - Test OAuth connection
router.post('/oauth/test', auth_middleware_1.authenticate, adminOnly_1.adminOnly, oauthTestValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { provider } = req.body;
        const settingRepository = connection_1.AppDataSource.getRepository(Settings_1.Settings);
        // Get OAuth settings
        const oauthSetting = await settingRepository.findOne({
            where: { key: 'oauth_settings' }
        });
        if (!oauthSetting || !oauthSetting.value) {
            return res.status(400).json({
                success: false,
                message: 'OAuth settings not configured'
            });
        }
        let oauthData;
        try {
            const parsedData = typeof oauthSetting.value === 'string'
                ? JSON.parse(oauthSetting.value)
                : oauthSetting.value;
            oauthData = decryptOAuthData(parsedData);
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to parse OAuth settings'
            });
        }
        const config = oauthData[provider];
        if (!config.enabled) {
            return res.status(400).json({
                success: false,
                message: `${provider} OAuth is not enabled`
            });
        }
        if (!config.clientId || !config.clientSecret) {
            return res.status(400).json({
                success: false,
                message: `${provider} OAuth credentials are not configured`
            });
        }
        // Get provider configuration
        const providerConfig = (0, oauth_providers_1.getOAuthProviderConfig)(provider);
        if (!providerConfig) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OAuth provider'
            });
        }
        // TODO: Implement actual OAuth flow test
        // For now, just return the URLs to verify configuration
        res.json({
            success: true,
            message: `${provider} OAuth configuration is valid`,
            details: providerConfig
        });
    }
    catch (error) {
        logger_1.default.error('Error testing OAuth connection:', error);
        next(error);
    }
});
// GET /api/settings/oauth/providers - Get enabled OAuth providers (public)
router.get('/oauth/providers', async (req, res) => {
    try {
        const oauthSettings = await getOAuthSettings();
        // Return only enabled status for each provider (no sensitive data)
        const providers = {
            google: { enabled: oauthSettings.google.enabled },
            kakao: { enabled: oauthSettings.kakao.enabled },
            naver: { enabled: oauthSettings.naver.enabled }
        };
        res.json({ providers });
    }
    catch (error) {
        logger_1.default.error('Failed to get OAuth providers:', error);
        res.status(500).json({
            message: 'OAuth 제공자 정보를 가져오는데 실패했습니다',
            providers: {
                google: { enabled: false },
                kakao: { enabled: false },
                naver: { enabled: false }
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=settings.routes.js.map