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
                    siteName: 'O4O Platform',
                    siteDescription: 'Multi-tenant e-commerce platform',
                    siteUrl: '',
                    adminEmail: '',
                    timezone: 'Asia/Seoul',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: 'HH:mm',
                    language: 'ko',
                    maintenanceMode: false,
                    maintenanceMessage: '',
                    allowRegistration: true,
                    defaultUserRole: 'customer',
                    requireEmailVerification: true,
                    enableApiAccess: false,
                    apiRateLimit: 100
                };
            case 'reading':
                return {
                    homepageType: 'latest_posts',
                    homepageId: undefined,
                    postsPerPage: 10,
                    showSummary: 'excerpt',
                    excerptLength: 200
                };
            case 'theme':
                return {
                    theme: 'default',
                    primaryColor: '#0066cc',
                    secondaryColor: '#666666',
                    fontFamily: 'system-ui',
                    fontSize: '16px',
                    darkMode: false
                };
            case 'email':
                return {
                    smtpHost: '',
                    smtpPort: 587,
                    smtpUser: '',
                    smtpPassword: '',
                    smtpSecure: false,
                    fromEmail: '',
                    fromName: ''
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