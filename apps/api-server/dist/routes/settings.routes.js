"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminOnly_1 = require("../middleware/adminOnly");
const validateDto_1 = require("../middleware/validateDto");
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = require("../utils/crypto");
const connection_1 = require("../database/connection");
const Settings_1 = require("../entities/Settings");
const router = (0, express_1.Router)();
// Helper function to get OAuth settings
async function getOAuthSettings() {
    const settingsRepo = connection_1.AppDataSource.getRepository(Settings_1.Settings);
    const setting = await settingsRepo.findOne({ where: { key: 'oauth' } });
    if (!setting) {
        // Return default settings if not found
        return {
            google: {
                provider: 'google',
                enabled: false,
                clientId: '',
                clientSecret: '',
                callbackUrl: '',
                scope: []
            },
            kakao: {
                provider: 'kakao',
                enabled: false,
                clientId: '',
                clientSecret: '',
                callbackUrl: '',
                scope: []
            },
            naver: {
                provider: 'naver',
                enabled: false,
                clientId: '',
                clientSecret: '',
                callbackUrl: '',
                scope: []
            }
        };
    }
    const data = setting.value;
    // Decrypt secrets
    if (data.google.clientSecret) {
        data.google.clientSecret = (0, crypto_1.decrypt)(data.google.clientSecret);
    }
    if (data.kakao.clientSecret) {
        data.kakao.clientSecret = (0, crypto_1.decrypt)(data.kakao.clientSecret);
    }
    if (data.naver.clientSecret) {
        data.naver.clientSecret = (0, crypto_1.decrypt)(data.naver.clientSecret);
    }
    return data;
}
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
    callbackUrl: `${process.env.APP_URL}/api/auth/callback/${provider}`,
    scope: []
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
// GET /api/settings/oauth - Get OAuth settings
router.get('/oauth', auth_1.authenticateToken, adminOnly_1.adminOnly, async (req, res, next) => {
    try {
        const settingRepository = connection_1.AppDataSource.getRepository(Settings_1.Settings);
        // Get OAuth settings from database
        const oauthSetting = await settingRepository.findOne({
            where: { key: 'oauth_settings' }
        });
        let oauthData;
        if (oauthSetting && oauthSetting.value) {
            try {
                const parsedData = typeof oauthSetting.value === 'string'
                    ? JSON.parse(oauthSetting.value)
                    : oauthSetting.value;
                oauthData = decryptOAuthData(parsedData);
            }
            catch (error) {
                logger_1.default.error('Failed to parse OAuth settings:', error);
                // Return default settings if parsing fails
                oauthData = {
                    google: getDefaultOAuthConfig('google'),
                    kakao: getDefaultOAuthConfig('kakao'),
                    naver: getDefaultOAuthConfig('naver')
                };
            }
        }
        else {
            // Return default settings if not found
            oauthData = {
                google: getDefaultOAuthConfig('google'),
                kakao: getDefaultOAuthConfig('kakao'),
                naver: getDefaultOAuthConfig('naver')
            };
        }
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
router.put('/oauth', auth_1.authenticateToken, adminOnly_1.adminOnly, oauthUpdateValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { provider, config } = req.body;
        const settingRepository = connection_1.AppDataSource.getRepository(Settings_1.Settings);
        // Get current settings
        let oauthSetting = await settingRepository.findOne({
            where: { key: 'oauth_settings' }
        });
        let currentData;
        if (oauthSetting && oauthSetting.value) {
            try {
                currentData = typeof oauthSetting.value === 'string'
                    ? JSON.parse(oauthSetting.value)
                    : oauthSetting.value;
            }
            catch (error) {
                currentData = {
                    google: getDefaultOAuthConfig('google'),
                    kakao: getDefaultOAuthConfig('kakao'),
                    naver: getDefaultOAuthConfig('naver')
                };
            }
        }
        else {
            currentData = {
                google: getDefaultOAuthConfig('google'),
                kakao: getDefaultOAuthConfig('kakao'),
                naver: getDefaultOAuthConfig('naver')
            };
        }
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
router.post('/oauth/test', auth_1.authenticateToken, adminOnly_1.adminOnly, oauthTestValidation, validateDto_1.validateDto, async (req, res, next) => {
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
        // Provider-specific test logic
        let authUrl;
        let tokenUrl;
        let userInfoUrl;
        switch (provider) {
            case 'google':
                authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
                tokenUrl = 'https://oauth2.googleapis.com/token';
                userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
                break;
            case 'kakao':
                authUrl = 'https://kauth.kakao.com/oauth/authorize';
                tokenUrl = 'https://kauth.kakao.com/oauth/token';
                userInfoUrl = 'https://kapi.kakao.com/v2/user/me';
                break;
            case 'naver':
                authUrl = 'https://nid.naver.com/oauth2.0/authorize';
                tokenUrl = 'https://nid.naver.com/oauth2.0/token';
                userInfoUrl = 'https://openapi.naver.com/v1/nid/me';
                break;
            default:
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
            details: {
                authUrl,
                tokenUrl,
                userInfoUrl
            }
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