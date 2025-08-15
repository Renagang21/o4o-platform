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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeController = void 0;
const ThemeService_1 = require("../services/ThemeService");
const HookSystem_1 = require("../services/HookSystem");
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const upload = (0, multer_1.default)({
    dest: 'uploads/themes/',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname) !== '.zip') {
            cb(new Error('Only ZIP files are allowed'));
        }
        else {
            cb(null, true);
        }
    }
});
class ThemeController {
    constructor() {
        /**
         * Get all themes
         */
        this.getAllThemes = async (req, res) => {
            try {
                const themes = await this.themeService.getAllThemes();
                res.json({
                    success: true,
                    data: themes,
                    count: themes.length
                });
            }
            catch (error) {
                console.error('Error fetching themes:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch themes',
                    error: error.message
                });
            }
        };
        /**
         * Get theme by ID
         */
        this.getThemeById = async (req, res) => {
            try {
                const { id } = req.params;
                const theme = await this.themeService.getThemeById(id);
                if (!theme) {
                    return res.status(404).json({
                        success: false,
                        message: 'Theme not found'
                    });
                }
                res.json({
                    success: true,
                    data: theme
                });
            }
            catch (error) {
                console.error('Error fetching theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch theme',
                    error: error.message
                });
            }
        };
        /**
         * Install theme from marketplace
         */
        this.installTheme = async (req, res) => {
            try {
                const { themeUrl, siteId } = req.body;
                if (!themeUrl || !siteId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Theme URL and site ID are required'
                    });
                }
                const installation = await this.themeService.installTheme(themeUrl, siteId);
                res.json({
                    success: true,
                    message: 'Theme installed successfully',
                    data: installation
                });
            }
            catch (error) {
                console.error('Error installing theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to install theme',
                    error: error.message
                });
            }
        };
        /**
         * Upload and install theme
         */
        this.uploadTheme = [
            upload.single('theme'),
            async (req, res) => {
                try {
                    if (!req.file) {
                        return res.status(400).json({
                            success: false,
                            message: 'No theme file uploaded'
                        });
                    }
                    const { siteId } = req.body;
                    if (!siteId) {
                        return res.status(400).json({
                            success: false,
                            message: 'Site ID is required'
                        });
                    }
                    // Process uploaded theme file
                    const themeUrl = `file://${req.file.path}`;
                    const installation = await this.themeService.installTheme(themeUrl, siteId);
                    res.json({
                        success: true,
                        message: 'Theme uploaded and installed successfully',
                        data: installation
                    });
                }
                catch (error) {
                    console.error('Error uploading theme:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to upload theme',
                        error: error.message
                    });
                }
            }
        ];
        /**
         * Activate theme
         */
        this.activateTheme = async (req, res) => {
            try {
                const { id } = req.params;
                const { siteId } = req.body;
                if (!siteId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Site ID is required'
                    });
                }
                await this.themeService.activateTheme(id, siteId);
                res.json({
                    success: true,
                    message: 'Theme activated successfully'
                });
            }
            catch (error) {
                console.error('Error activating theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to activate theme',
                    error: error.message
                });
            }
        };
        /**
         * Deactivate theme
         */
        this.deactivateTheme = async (req, res) => {
            try {
                const { id } = req.params;
                const { siteId } = req.body;
                if (!siteId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Site ID is required'
                    });
                }
                await this.themeService.deactivateTheme(id, siteId);
                res.json({
                    success: true,
                    message: 'Theme deactivated successfully'
                });
            }
            catch (error) {
                console.error('Error deactivating theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to deactivate theme',
                    error: error.message
                });
            }
        };
        /**
         * Uninstall theme
         */
        this.uninstallTheme = async (req, res) => {
            try {
                const { id } = req.params;
                const { siteId } = req.body;
                if (!siteId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Site ID is required'
                    });
                }
                await this.themeService.uninstallTheme(id, siteId);
                res.json({
                    success: true,
                    message: 'Theme uninstalled successfully'
                });
            }
            catch (error) {
                console.error('Error uninstalling theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to uninstall theme',
                    error: error.message
                });
            }
        };
        /**
         * Update theme
         */
        this.updateTheme = async (req, res) => {
            try {
                const { id } = req.params;
                const { updateUrl } = req.body;
                if (!updateUrl) {
                    return res.status(400).json({
                        success: false,
                        message: 'Update URL is required'
                    });
                }
                const theme = await this.themeService.updateTheme(id, updateUrl);
                res.json({
                    success: true,
                    message: 'Theme updated successfully',
                    data: theme
                });
            }
            catch (error) {
                console.error('Error updating theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update theme',
                    error: error.message
                });
            }
        };
        /**
         * Get theme preview
         */
        this.getThemePreview = async (req, res) => {
            try {
                const { id } = req.params;
                const preview = await this.themeService.getThemePreview(id);
                res.json({
                    success: true,
                    data: preview
                });
            }
            catch (error) {
                console.error('Error getting theme preview:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get theme preview',
                    error: error.message
                });
            }
        };
        /**
         * Save theme customizations
         */
        this.saveCustomizations = async (req, res) => {
            try {
                const { id } = req.params;
                const { siteId, customizations } = req.body;
                if (!siteId || !customizations) {
                    return res.status(400).json({
                        success: false,
                        message: 'Site ID and customizations are required'
                    });
                }
                await this.themeService.saveCustomizations(id, siteId, customizations);
                res.json({
                    success: true,
                    message: 'Customizations saved successfully'
                });
            }
            catch (error) {
                console.error('Error saving customizations:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to save customizations',
                    error: error.message
                });
            }
        };
        /**
         * Get active theme
         */
        this.getActiveTheme = async (req, res) => {
            try {
                const { siteId } = req.query;
                if (!siteId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Site ID is required'
                    });
                }
                const theme = await this.themeService.getActiveTheme(siteId);
                res.json({
                    success: true,
                    data: theme
                });
            }
            catch (error) {
                console.error('Error getting active theme:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get active theme',
                    error: error.message
                });
            }
        };
        /**
         * Search marketplace
         */
        this.searchMarketplace = async (req, res) => {
            try {
                const { q, type, isPremium, minRating, maxPrice } = req.query;
                const themes = await this.themeService.searchMarketplace(q, {
                    type: type,
                    isPremium: isPremium === 'true',
                    minRating: minRating ? parseFloat(minRating) : undefined,
                    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
                });
                res.json({
                    success: true,
                    data: themes,
                    count: themes.length
                });
            }
            catch (error) {
                console.error('Error searching marketplace:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to search marketplace',
                    error: error.message
                });
            }
        };
        /**
         * Execute hook (for testing)
         */
        this.executeHook = async (req, res) => {
            try {
                const { hookName, args } = req.body;
                if (!hookName) {
                    return res.status(400).json({
                        success: false,
                        message: 'Hook name is required'
                    });
                }
                await HookSystem_1.hooks.doAction(hookName, ...(args || []));
                res.json({
                    success: true,
                    message: `Hook ${hookName} executed successfully`
                });
            }
            catch (error) {
                console.error('Error executing hook:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to execute hook',
                    error: error.message
                });
            }
        };
        this.themeService = new ThemeService_1.ThemeService();
    }
}
exports.ThemeController = ThemeController;
//# sourceMappingURL=ThemeController.js.map