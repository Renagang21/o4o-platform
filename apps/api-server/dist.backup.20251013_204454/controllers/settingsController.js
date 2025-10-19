"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const settingsService_1 = require("../services/settingsService");
const logger_1 = __importDefault(require("../utils/logger"));
class SettingsController {
    constructor() {
        this.validTypes = ['general', 'reading', 'theme', 'email', 'customizer', 'permalink'];
    }
    // GET /api/settings/:type
    async getSettings(req, res) {
        try {
            const { type } = req.params;
            if (!this.validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings type'
                });
            }
            const settings = await settingsService_1.settingsService.getSettings(type);
            res.json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // PUT /api/settings/:type
    async updateSettings(req, res) {
        try {
            const { type } = req.params;
            if (!this.validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings type'
                });
            }
            const settings = await settingsService_1.settingsService.updateSettings(type, req.body);
            res.json({
                success: true,
                data: settings,
                message: 'Settings updated successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error updating settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/settings/homepage (public endpoint for frontend)
    async getHomepageSettings(req, res) {
        try {
            const settings = await settingsService_1.settingsService.getHomepageSettings();
            res.json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching homepage settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch homepage settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/settings/general (public endpoint for frontend)
    async getGeneralSettings(req, res) {
        try {
            const settings = await settingsService_1.settingsService.getSettings('general');
            res.json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching general settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch general settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/settings/customizer (public endpoint for frontend)
    async getCustomizerSettings(req, res) {
        try {
            const settings = await settingsService_1.settingsService.getSettings('customizer');
            res.json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching customizer settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch customizer settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // POST /api/settings/initialize (admin only)
    async initializeSettings(req, res) {
        try {
            await settingsService_1.settingsService.initializeSettings();
            res.json({
                success: true,
                message: 'Settings initialized successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error initializing settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initialize settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settingsController.js.map