"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const data_source_1 = __importDefault(require("../database/data-source"));
const AiSettings_1 = require("../entities/AiSettings");
const router = (0, express_1.Router)();
/**
 * AI Settings Routes
 * Full implementation with database support
 */
// GET AI settings
router.get('/ai-settings', auth_middleware_1.authenticate, async (req, res) => {
    try {
        // Check if data source is initialized
        if (!data_source_1.default.isInitialized) {
            console.error('Database not initialized for AI settings');
            return res.status(503).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        const aiSettingsRepo = data_source_1.default.getRepository(AiSettings_1.AiSettings);
        // Get all AI provider settings
        const settings = await aiSettingsRepo.find({
            order: { provider: 'ASC' }
        });
        // Transform to frontend format
        const providers = {};
        let defaultProvider = null;
        // Initialize with default providers if they don't exist
        const defaultProviders = ['openai', 'claude', 'gemini'];
        for (const providerName of defaultProviders) {
            const setting = settings.find(s => s.provider === providerName);
            if (setting) {
                providers[providerName] = {
                    enabled: setting.isActive,
                    apiKey: setting.apiKey ? '***' : null, // Mask API key for security
                    model: setting.defaultModel
                };
                if (setting.isActive && setting.apiKey && !defaultProvider) {
                    defaultProvider = providerName;
                }
            }
            else {
                providers[providerName] = {
                    enabled: false,
                    apiKey: null,
                    model: null
                };
            }
        }
        res.json({
            success: true,
            data: {
                providers,
                defaultProvider,
                settings: {
                    maxTokens: 4096,
                    temperature: 0.7
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching AI settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch AI settings'
        });
    }
});
// POST AI settings (update)
router.post('/ai-settings', auth_middleware_1.authenticate, async (req, res) => {
    try {
        // Check if data source is initialized
        if (!data_source_1.default.isInitialized) {
            console.error('Database not initialized for AI settings');
            return res.status(503).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        const aiSettingsRepo = data_source_1.default.getRepository(AiSettings_1.AiSettings);
        const { provider, apiKey, model, enabled } = req.body;
        if (!provider) {
            return res.status(400).json({
                success: false,
                message: 'Provider is required'
            });
        }
        // Find or create provider settings
        let settings = await aiSettingsRepo.findOne({ where: { provider } });
        if (!settings) {
            settings = new AiSettings_1.AiSettings();
            settings.provider = provider;
        }
        // Update settings
        if (apiKey !== undefined && apiKey !== '***') {
            settings.apiKey = apiKey || null;
        }
        if (model !== undefined) {
            settings.defaultModel = model;
        }
        if (enabled !== undefined) {
            settings.isActive = enabled;
        }
        await aiSettingsRepo.save(settings);
        res.json({
            success: true,
            message: 'AI settings updated successfully',
            data: {
                provider,
                enabled: settings.isActive,
                model: settings.defaultModel,
                apiKey: settings.apiKey ? '***' : null
            }
        });
    }
    catch (error) {
        console.error('Error updating AI settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update AI settings'
        });
    }
});
exports.default = router;
//# sourceMappingURL=aiRoutes.js.map