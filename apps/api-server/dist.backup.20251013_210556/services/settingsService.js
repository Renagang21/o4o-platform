"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = exports.SettingsService = void 0;
const connection_1 = require("../database/connection");
const Settings_1 = require("../entities/Settings");
class SettingsService {
    constructor() {
        this.settingsRepository = connection_1.AppDataSource.getRepository(Settings_1.Settings);
    }
    // Get settings by type
    async getSettings(type) {
        const setting = await this.settingsRepository.findOne({
            where: { key: type }
        });
        if (!setting) {
            // Return default settings based on type
            return this.getDefaultSettings(type);
        }
        return setting.value;
    }
    // Update settings
    async updateSettings(type, value) {
        let setting = await this.settingsRepository.findOne({
            where: { key: type }
        });
        if (!setting) {
            setting = this.settingsRepository.create({
                key: type,
                type: type,
                value: value
            });
        }
        else {
            setting.value = value;
        }
        await this.settingsRepository.save(setting);
        return setting.value;
    }
    // Get specific setting value
    async getSettingValue(type, key) {
        const settings = await this.getSettings(type);
        return settings === null || settings === void 0 ? void 0 : settings[key];
    }
    // Update specific setting value
    async updateSettingValue(type, key, value) {
        const settings = await this.getSettings(type) || {};
        settings[key] = value;
        return await this.updateSettings(type, settings);
    }
    // Get default settings based on type
    getDefaultSettings(type) {
        switch (type) {
            case 'general':
                return {
                    siteName: process.env.DEFAULT_SITE_NAME || 'O4O Platform',
                    siteDescription: process.env.DEFAULT_SITE_DESCRIPTION || 'Multi-tenant e-commerce platform',
                    siteUrl: process.env.DEFAULT_SITE_URL || '',
                    adminEmail: process.env.DEFAULT_ADMIN_EMAIL || '',
                    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Seoul',
                    dateFormat: process.env.DEFAULT_DATE_FORMAT || 'YYYY-MM-DD',
                    timeFormat: process.env.DEFAULT_TIME_FORMAT || 'HH:mm',
                    language: process.env.DEFAULT_LANGUAGE || 'ko',
                    maintenanceMode: process.env.DEFAULT_MAINTENANCE_MODE === 'true' || false,
                    maintenanceMessage: process.env.DEFAULT_MAINTENANCE_MESSAGE || '',
                    allowRegistration: process.env.DEFAULT_ALLOW_REGISTRATION !== 'false',
                    defaultUserRole: process.env.DEFAULT_USER_ROLE || 'customer',
                    requireEmailVerification: process.env.DEFAULT_REQUIRE_EMAIL_VERIFICATION !== 'false',
                    enableApiAccess: process.env.DEFAULT_ENABLE_API_ACCESS === 'true' || false,
                    apiRateLimit: parseInt(process.env.DEFAULT_API_RATE_LIMIT || '100', 10)
                };
            case 'reading':
                return {
                    homepageType: process.env.DEFAULT_HOMEPAGE_TYPE || 'latest_posts',
                    homepageId: process.env.DEFAULT_HOMEPAGE_ID || undefined,
                    postsPerPage: parseInt(process.env.DEFAULT_POSTS_PER_PAGE || '10', 10),
                    showSummary: process.env.DEFAULT_SHOW_SUMMARY || 'excerpt',
                    excerptLength: parseInt(process.env.DEFAULT_EXCERPT_LENGTH || '200', 10)
                };
            case 'theme':
                return {
                    theme: process.env.DEFAULT_THEME || 'default',
                    primaryColor: process.env.DEFAULT_PRIMARY_COLOR || '#0066cc',
                    secondaryColor: process.env.DEFAULT_SECONDARY_COLOR || '#666666',
                    fontFamily: process.env.DEFAULT_FONT_FAMILY || 'system-ui',
                    fontSize: process.env.DEFAULT_FONT_SIZE || '16px',
                    darkMode: process.env.DEFAULT_DARK_MODE === 'true' || false
                };
            case 'email':
                return {
                    smtpHost: process.env.SMTP_HOST || '',
                    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
                    smtpUser: process.env.SMTP_USER || '',
                    smtpPassword: process.env.SMTP_PASSWORD || '',
                    smtpSecure: process.env.SMTP_SECURE === 'true' || false,
                    fromEmail: process.env.SMTP_FROM_EMAIL || '',
                    fromName: process.env.SMTP_FROM_NAME || ''
                };
            default:
                return {};
        }
    }
    // Initialize default settings if not exists
    async initializeSettings() {
        const types = ['general', 'reading', 'theme', 'email'];
        for (const type of types) {
            const exists = await this.settingsRepository.findOne({
                where: { key: type }
            });
            if (!exists) {
                const defaultSettings = this.getDefaultSettings(type);
                await this.settingsRepository.save({
                    key: type,
                    type: type,
                    value: defaultSettings
                });
            }
        }
    }
    // Get homepage settings for frontend
    async getHomepageSettings() {
        const readingSettings = await this.getSettings('reading');
        return {
            type: readingSettings.homepageType,
            pageId: readingSettings.homepageId,
            postsPerPage: readingSettings.postsPerPage
        };
    }
}
exports.SettingsService = SettingsService;
exports.settingsService = new SettingsService();
//# sourceMappingURL=settingsService.js.map