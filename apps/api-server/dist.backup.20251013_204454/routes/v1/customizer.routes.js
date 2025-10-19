"use strict";
/**
 * Customizer API Routes
 * Endpoints for managing scroll-to-top, button settings, and breadcrumbs
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const settingsService_1 = require("../../services/settingsService");
const customizer_validators_1 = require("../../validators/customizer.validators");
const deep_merge_1 = require("../../utils/deep-merge");
const schema_migration_1 = require("../../utils/schema-migration");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const settingsService = new settingsService_1.SettingsService();
// ============================================
// Default Settings
// ============================================
const defaultScrollToTop = {
    enabled: true,
    displayType: 'both',
    threshold: 300,
    backgroundColor: '#3b82f6',
    iconColor: '#ffffff',
    position: 'right',
};
const defaultButtonSettings = {
    primary: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderWidth: 0,
        borderColor: '#3b82f6',
        borderStyle: 'solid',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 24,
        hoverBackgroundColor: '#2563eb',
        hoverTextColor: '#ffffff',
        hoverBorderColor: '#2563eb',
        transitionDuration: 200,
        fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: 0,
    },
};
const defaultBreadcrumbs = {
    enabled: true,
    position: 'below-header',
    homeText: 'Home',
    separator: '>',
    showCurrentPage: true,
    showOnHomepage: false,
    linkColor: '#3b82f6',
    currentPageColor: '#6b7280',
    separatorColor: '#9ca3af',
    hoverColor: '#2563eb',
    fontSize: { desktop: 14, tablet: 13, mobile: 12 },
    fontWeight: 400,
    textTransform: 'none',
    itemSpacing: 8,
    marginTop: 16,
    marginBottom: 16,
    showIcons: false,
    mobileHidden: false,
};
// ============================================
// Scroll-to-Top Endpoints
// ============================================
/**
 * GET /api/v1/customizer/scroll-to-top
 * Get scroll-to-top settings (public)
 */
router.get('/scroll-to-top', async (req, res) => {
    try {
        let customizerSettings = await settingsService.getSettings('customizer');
        // Apply migration if needed
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const scrollToTop = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.scrollToTop) || defaultScrollToTop;
        res.json({
            success: true,
            data: scrollToTop,
        });
    }
    catch (error) {
        console.error('Error fetching scroll-to-top settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scroll-to-top settings',
            message: error.message,
        });
    }
});
/**
 * PUT /api/v1/customizer/scroll-to-top
 * Update scroll-to-top settings (authenticated)
 */
router.put('/scroll-to-top', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        // Validate request body with Zod
        const validatedData = customizer_validators_1.ScrollToTopSchema.parse(req.body);
        // Get existing customizer settings and migrate
        let customizerSettings = (await settingsService.getSettings('customizer')) || {};
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const existingScrollToTop = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.scrollToTop) || defaultScrollToTop;
        // Deep merge existing + new data
        const mergedScrollToTop = (0, deep_merge_1.deepMerge)(existingScrollToTop, validatedData);
        // Update customizer settings
        const updatedSettings = {
            ...customizerSettings,
            scrollToTop: mergedScrollToTop,
            _meta: {
                ...customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings._meta,
                lastModified: new Date().toISOString(),
                isDirty: false,
            },
        };
        // Validate migration
        const validation = (0, schema_migration_1.validateMigration)(updatedSettings);
        if (!validation.valid) {
            console.warn('[Customizer] Migration validation warnings:', validation.errors);
        }
        await settingsService.updateSettings('customizer', updatedSettings);
        res.json({
            success: true,
            data: mergedScrollToTop,
            message: 'Scroll-to-top settings updated successfully',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Error updating scroll-to-top settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update scroll-to-top settings',
            message: error.message,
        });
    }
});
// ============================================
// Button Settings Endpoints
// ============================================
/**
 * GET /api/v1/customizer/button-settings
 * Get button settings (public)
 */
router.get('/button-settings', async (req, res) => {
    try {
        let customizerSettings = await settingsService.getSettings('customizer');
        // Apply migration if needed
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const buttons = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.buttons) || defaultButtonSettings;
        res.json({
            success: true,
            data: buttons,
        });
    }
    catch (error) {
        console.error('Error fetching button settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch button settings',
            message: error.message,
        });
    }
});
/**
 * PUT /api/v1/customizer/button-settings
 * Update button settings (authenticated)
 */
router.put('/button-settings', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        // Validate request body with Zod
        const validatedData = customizer_validators_1.ButtonSettingsSchema.parse(req.body);
        // Get existing customizer settings and migrate
        let customizerSettings = (await settingsService.getSettings('customizer')) || {};
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const existingButtons = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.buttons) || defaultButtonSettings;
        // Deep merge existing + new data
        const mergedButtons = (0, deep_merge_1.deepMerge)(existingButtons, validatedData);
        // Update customizer settings
        const updatedSettings = {
            ...customizerSettings,
            buttons: mergedButtons,
            _meta: {
                ...customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings._meta,
                lastModified: new Date().toISOString(),
                isDirty: false,
            },
        };
        // Validate migration
        const validation = (0, schema_migration_1.validateMigration)(updatedSettings);
        if (!validation.valid) {
            console.warn('[Customizer] Migration validation warnings:', validation.errors);
        }
        await settingsService.updateSettings('customizer', updatedSettings);
        res.json({
            success: true,
            data: mergedButtons,
            message: 'Button settings updated successfully',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Error updating button settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update button settings',
            message: error.message,
        });
    }
});
// ============================================
// Breadcrumbs Settings Endpoints
// ============================================
/**
 * GET /api/v1/customizer/breadcrumbs-settings
 * Get breadcrumbs settings (public)
 */
router.get('/breadcrumbs-settings', async (req, res) => {
    try {
        let customizerSettings = await settingsService.getSettings('customizer');
        // Apply migration if needed
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const breadcrumbs = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.breadcrumbs) || defaultBreadcrumbs;
        res.json({
            success: true,
            data: breadcrumbs,
        });
    }
    catch (error) {
        console.error('Error fetching breadcrumbs settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch breadcrumbs settings',
            message: error.message,
        });
    }
});
/**
 * PUT /api/v1/customizer/breadcrumbs-settings
 * Update breadcrumbs settings (authenticated)
 */
router.put('/breadcrumbs-settings', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        // Validate request body with Zod
        const validatedData = customizer_validators_1.BreadcrumbsSchema.parse(req.body);
        // Get existing customizer settings and migrate
        let customizerSettings = (await settingsService.getSettings('customizer')) || {};
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const existingBreadcrumbs = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.breadcrumbs) || defaultBreadcrumbs;
        // Deep merge existing + new data
        const mergedBreadcrumbs = (0, deep_merge_1.deepMerge)(existingBreadcrumbs, validatedData);
        // Update customizer settings
        const updatedSettings = {
            ...customizerSettings,
            breadcrumbs: mergedBreadcrumbs,
            _meta: {
                ...customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings._meta,
                lastModified: new Date().toISOString(),
                isDirty: false,
            },
        };
        // Validate migration
        const validation = (0, schema_migration_1.validateMigration)(updatedSettings);
        if (!validation.valid) {
            console.warn('[Customizer] Migration validation warnings:', validation.errors);
        }
        await settingsService.updateSettings('customizer', updatedSettings);
        res.json({
            success: true,
            data: mergedBreadcrumbs,
            message: 'Breadcrumbs settings updated successfully',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Error updating breadcrumbs settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update breadcrumbs settings',
            message: error.message,
        });
    }
});
// ============================================
// Mobile Header Settings Endpoints
// ============================================
const defaultMobileHeaderSettings = {
    enabled: true,
    breakpoint: 768,
    mobileLogoUrl: '',
    mobileLogoWidth: 120,
    hamburgerStyle: 'default',
    menuPosition: 'left',
    menuAnimation: 'slide',
    overlayEnabled: true,
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    showAccountIcon: true,
    showCartIcon: true,
    showSearchIcon: false,
    submenuStyle: 'accordion',
    closeOnItemClick: false,
    swipeToClose: true
};
/**
 * GET /api/customizer/mobile-header-settings
 * Get mobile header settings (public)
 */
router.get('/mobile-header-settings', async (req, res) => {
    try {
        let customizerSettings = await settingsService.getSettings('customizer');
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const mobileHeader = (customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.mobileHeader) || defaultMobileHeaderSettings;
        res.json({
            success: true,
            data: mobileHeader,
        });
    }
    catch (error) {
        console.error('Error fetching mobile header settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch mobile header settings',
            message: error.message,
        });
    }
});
// ============================================
// Header Sticky Settings Endpoints
// ============================================
const defaultStickyHeaderSettings = {
    enabled: false,
    triggerHeight: 100,
    stickyOn: ['primary'],
    shrinkEffect: false,
    shrinkHeight: {
        desktop: 60,
        tablet: 55,
        mobile: 50
    },
    backgroundColor: '#ffffff',
    backgroundOpacity: 1,
    boxShadow: true,
    shadowIntensity: 'medium',
    animationDuration: 300,
    hideOnScrollDown: false,
    zIndex: 999
};
/**
 * GET /api/customizer/settings/header/sticky
 * Get sticky header settings (public)
 */
router.get('/settings/header/sticky', async (req, res) => {
    var _a;
    try {
        let customizerSettings = await settingsService.getSettings('customizer');
        customizerSettings = (0, schema_migration_1.migrateCustomizerSettings)(customizerSettings);
        const sticky = ((_a = customizerSettings === null || customizerSettings === void 0 ? void 0 : customizerSettings.header) === null || _a === void 0 ? void 0 : _a.sticky) || defaultStickyHeaderSettings;
        res.json({
            success: true,
            data: sticky,
        });
    }
    catch (error) {
        console.error('Error fetching sticky header settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sticky header settings',
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=customizer.routes.js.map