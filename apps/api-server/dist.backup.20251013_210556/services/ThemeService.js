"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeService = void 0;
const connection_1 = require("../database/connection");
const Theme_1 = require("../entities/Theme");
const HookSystem_1 = require("./HookSystem");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const axios_1 = __importDefault(require("axios"));
const appearance_constants_1 = require("../config/appearance.constants");
class ThemeService {
    constructor() {
        this.activeTheme = null;
        this.themeRepository = connection_1.AppDataSource.getRepository(Theme_1.Theme);
        this.installationRepository = connection_1.AppDataSource.getRepository(Theme_1.ThemeInstallation);
        this.themesDir = appearance_constants_1.THEME_DIRS.BASE;
    }
    /**
     * Get all available themes
     */
    async getAllThemes() {
        const themes = await this.themeRepository.find({
            order: { createdAt: 'DESC' }
        });
        // Apply filters
        return await HookSystem_1.hooks.applyFilters('themes_list', themes);
    }
    /**
     * Get theme by ID
     */
    async getThemeById(id) {
        return await this.themeRepository.findOne({ where: { id } });
    }
    /**
     * Get theme by slug
     */
    async getThemeBySlug(slug) {
        return await this.themeRepository.findOne({ where: { slug } });
    }
    /**
     * Install theme from marketplace
     */
    async installTheme(themeUrl, siteId) {
        // Hook before installation
        await HookSystem_1.hooks.doAction('before_theme_install', themeUrl, siteId);
        try {
            // Download theme package
            const response = await axios_1.default.get(themeUrl, { responseType: 'arraybuffer' });
            const zipBuffer = Buffer.from(response.data);
            // Create temp directory
            const tempDir = path.join(appearance_constants_1.THEME_DIRS.TEMP, Date.now().toString());
            await fs.mkdir(tempDir, { recursive: true });
            // Extract theme
            const zip = new adm_zip_1.default(zipBuffer);
            zip.extractAllTo(tempDir, true);
            // Read theme manifest
            const manifestPath = path.join(tempDir, appearance_constants_1.THEME_FILES.MANIFEST);
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            // Create theme record
            const theme = this.themeRepository.create({
                slug: manifest.name.toLowerCase().replace(/\s+/g, '-'),
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                author: manifest.author,
                authorUrl: manifest.authorUrl,
                screenshot: manifest.screenshot,
                demoUrl: manifest.demoUrl,
                type: 'external',
                status: 'inactive',
                requiredPlugins: manifest.requiredPlugins,
                supportedLanguages: manifest.supportedLanguages,
                license: manifest.license,
                templateFiles: manifest.templateFiles,
                colorSchemes: manifest.colorSchemes,
                layoutOptions: manifest.layoutOptions,
                typography: manifest.typography
            });
            const savedTheme = await this.themeRepository.save(theme);
            // Move theme to permanent location
            const themeDir = path.join(this.themesDir, savedTheme.slug);
            await fs.rename(tempDir, themeDir);
            // Create installation record
            const installation = this.installationRepository.create({
                themeId: savedTheme.id,
                siteId,
                status: 'installed'
            });
            const savedInstallation = await this.installationRepository.save(installation);
            // Hook after installation
            await HookSystem_1.hooks.doAction('after_theme_install', savedTheme, savedInstallation);
            return savedInstallation;
        }
        catch (error) {
            // Hook on error
            await HookSystem_1.hooks.doAction('theme_install_error', error, themeUrl, siteId);
            throw error;
        }
    }
    /**
     * Activate theme
     */
    async activateTheme(themeId, siteId) {
        const theme = await this.getThemeById(themeId);
        if (!theme) {
            throw new Error('Theme not found');
        }
        // Hook before activation
        await HookSystem_1.hooks.doAction('before_theme_activate', theme, siteId);
        // Deactivate current active theme
        const currentActive = await this.installationRepository.findOne({
            where: { siteId, status: 'active' }
        });
        if (currentActive) {
            currentActive.status = 'installed';
            await this.installationRepository.save(currentActive);
        }
        // Activate new theme
        const installation = await this.installationRepository.findOne({
            where: { themeId, siteId }
        });
        if (!installation) {
            throw new Error('Theme not installed');
        }
        installation.status = 'active';
        installation.activatedAt = new Date();
        await this.installationRepository.save(installation);
        // Update theme status
        theme.status = 'active';
        await this.themeRepository.save(theme);
        this.activeTheme = theme;
        // Hook after activation
        await HookSystem_1.hooks.doAction(HookSystem_1.WP_HOOKS.SWITCH_THEME, theme, siteId);
        await HookSystem_1.hooks.doAction('after_theme_activate', theme, siteId);
    }
    /**
     * Deactivate theme
     */
    async deactivateTheme(themeId, siteId) {
        var _a;
        const installation = await this.installationRepository.findOne({
            where: { themeId, siteId, status: 'active' }
        });
        if (!installation) {
            throw new Error('Theme not active');
        }
        installation.status = 'installed';
        await this.installationRepository.save(installation);
        const theme = await this.getThemeById(themeId);
        if (theme) {
            theme.status = 'inactive';
            await this.themeRepository.save(theme);
        }
        if (((_a = this.activeTheme) === null || _a === void 0 ? void 0 : _a.id) === themeId) {
            this.activeTheme = null;
        }
        await HookSystem_1.hooks.doAction('theme_deactivated', themeId, siteId);
    }
    /**
     * Uninstall theme
     */
    async uninstallTheme(themeId, siteId) {
        const theme = await this.getThemeById(themeId);
        if (!theme) {
            throw new Error('Theme not found');
        }
        // Hook before uninstall
        await HookSystem_1.hooks.doAction('before_theme_uninstall', theme, siteId);
        // Delete installation record
        await this.installationRepository.delete({ themeId, siteId });
        // Delete theme files
        const themeDir = path.join(this.themesDir, theme.slug);
        await fs.rm(themeDir, { recursive: true, force: true });
        // Delete theme record if no other installations
        const otherInstallations = await this.installationRepository.count({
            where: { themeId }
        });
        if (otherInstallations === 0) {
            await this.themeRepository.delete(themeId);
        }
        // Hook after uninstall
        await HookSystem_1.hooks.doAction('after_theme_uninstall', theme, siteId);
    }
    /**
     * Update theme
     */
    async updateTheme(themeId, updateUrl) {
        const theme = await this.getThemeById(themeId);
        if (!theme) {
            throw new Error('Theme not found');
        }
        // Hook before update
        await HookSystem_1.hooks.doAction('before_theme_update', theme);
        // Backup current theme
        const backupDir = path.join(appearance_constants_1.THEME_DIRS.BACKUPS, theme.slug, Date.now().toString());
        await fs.mkdir(backupDir, { recursive: true });
        const themeDir = path.join(this.themesDir, theme.slug);
        await this.copyDirectory(themeDir, backupDir);
        try {
            // Download update
            const response = await axios_1.default.get(updateUrl, { responseType: 'arraybuffer' });
            const zipBuffer = Buffer.from(response.data);
            // Extract update
            const zip = new adm_zip_1.default(zipBuffer);
            zip.extractAllTo(themeDir, true);
            // Read updated manifest
            const manifestPath = path.join(themeDir, appearance_constants_1.THEME_FILES.MANIFEST);
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            // Update theme record
            theme.version = manifest.version;
            theme.lastUpdate = new Date();
            // Add to changelog
            if (!theme.changelog) {
                theme.changelog = [];
            }
            theme.changelog.push({
                version: manifest.version,
                date: new Date(),
                changes: ['Theme updated']
            });
            const updatedTheme = await this.themeRepository.save(theme);
            // Hook after update
            await HookSystem_1.hooks.doAction('after_theme_update', updatedTheme);
            return updatedTheme;
        }
        catch (error) {
            // Restore backup on error
            await fs.rm(themeDir, { recursive: true, force: true });
            await this.copyDirectory(backupDir, themeDir);
            await HookSystem_1.hooks.doAction('theme_update_error', error, theme);
            throw error;
        }
    }
    /**
     * Get theme preview data
     */
    async getThemePreview(themeId) {
        const theme = await this.getThemeById(themeId);
        if (!theme) {
            throw new Error('Theme not found');
        }
        const previewData = {
            theme,
            styles: await this.getThemeStyles(theme),
            scripts: await this.getThemeScripts(theme),
            templates: theme.templateFiles || [],
            colorSchemes: theme.colorSchemes || [],
            layoutOptions: theme.layoutOptions || {},
            typography: theme.typography || {}
        };
        // Apply filters
        return await HookSystem_1.hooks.applyFilters('theme_preview_data', previewData, theme);
    }
    /**
     * Save theme customizations
     */
    async saveCustomizations(themeId, siteId, customizations) {
        const installation = await this.installationRepository.findOne({
            where: { themeId, siteId }
        });
        if (!installation) {
            throw new Error('Theme not installed');
        }
        // Apply filters to customizations
        const filtered = await HookSystem_1.hooks.applyFilters('theme_customizations', customizations, themeId);
        installation.customizations = filtered;
        await this.installationRepository.save(installation);
        // Hook after save
        await HookSystem_1.hooks.doAction(HookSystem_1.WP_HOOKS.CUSTOMIZE_SAVE, filtered, themeId, siteId);
    }
    /**
     * Get active theme
     */
    async getActiveTheme(siteId) {
        const installation = await this.installationRepository.findOne({
            where: { siteId, status: 'active' }
        });
        if (!installation) {
            return null;
        }
        return await this.getThemeById(installation.themeId);
    }
    /**
     * Search themes in marketplace
     */
    async searchMarketplace(query, filters) {
        const queryBuilder = this.themeRepository.createQueryBuilder('theme');
        if (query) {
            queryBuilder.where('(theme.name ILIKE :query OR theme.description ILIKE :query OR theme.author ILIKE :query)', { query: `%${query}%` });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.type) {
            queryBuilder.andWhere('theme.type = :type', { type: filters.type });
        }
        if ((filters === null || filters === void 0 ? void 0 : filters.isPremium) !== undefined) {
            queryBuilder.andWhere('theme.isPremium = :isPremium', { isPremium: filters.isPremium });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.minRating) {
            queryBuilder.andWhere('theme.rating >= :minRating', { minRating: filters.minRating });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.maxPrice) {
            queryBuilder.andWhere('(theme.price IS NULL OR theme.price <= :maxPrice)', {
                maxPrice: filters.maxPrice
            });
        }
        const themes = await queryBuilder
            .orderBy('theme.downloads', 'DESC')
            .addOrderBy('theme.rating', 'DESC')
            .getMany();
        // Apply filters
        return await HookSystem_1.hooks.applyFilters('marketplace_themes', themes, query, filters);
    }
    /**
     * Helper: Get theme styles
     */
    async getThemeStyles(theme) {
        const styles = [];
        const themeDir = path.join(this.themesDir, theme.slug);
        try {
            const stylesDir = path.join(themeDir, appearance_constants_1.THEME_SUBDIRS.STYLES);
            const files = await fs.readdir(stylesDir);
            for (const file of files) {
                if (file.endsWith('.css')) {
                    const content = await fs.readFile(path.join(stylesDir, file), 'utf-8');
                    styles.push(content);
                }
            }
        }
        catch (error) {
            // Styles directory might not exist
        }
        if (theme.customCss) {
            styles.push(theme.customCss);
        }
        return styles;
    }
    /**
     * Helper: Get theme scripts
     */
    async getThemeScripts(theme) {
        const scripts = [];
        const themeDir = path.join(this.themesDir, theme.slug);
        try {
            const scriptsDir = path.join(themeDir, appearance_constants_1.THEME_SUBDIRS.SCRIPTS);
            const files = await fs.readdir(scriptsDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const content = await fs.readFile(path.join(scriptsDir, file), 'utf-8');
                    scripts.push(content);
                }
            }
        }
        catch (error) {
            // Scripts directory might not exist
        }
        if (theme.customJs) {
            scripts.push(theme.customJs);
        }
        return scripts;
    }
    /**
     * Helper: Copy directory
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }
}
exports.ThemeService = ThemeService;
//# sourceMappingURL=ThemeService.js.map