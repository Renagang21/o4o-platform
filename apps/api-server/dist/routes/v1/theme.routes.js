"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ThemeController_1 = require("../../controllers/ThemeController");
const auth_1 = require("../../middleware/auth");
const auth_2 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const themeController = new ThemeController_1.ThemeController();
// Public routes
router.get('/marketplace', themeController.searchMarketplace);
router.get('/:id/preview', themeController.getThemePreview);
// Protected routes
router.use(auth_1.authenticateToken);
router.use(auth_2.requireAdmin);
// Theme management
router.get('/', themeController.getAllThemes);
router.get('/active', themeController.getActiveTheme);
router.get('/:id', themeController.getThemeById);
// Theme installation and activation
router.post('/install', themeController.installTheme);
router.post('/upload', themeController.uploadTheme);
router.post('/:id/activate', themeController.activateTheme);
router.post('/:id/deactivate', themeController.deactivateTheme);
router.delete('/:id/uninstall', themeController.uninstallTheme);
// Theme updates and customization
router.put('/:id/update', themeController.updateTheme);
router.put('/:id/customize', themeController.saveCustomizations);
// Hook system (for testing)
router.post('/hooks/execute', themeController.executeHook);
exports.default = router;
//# sourceMappingURL=theme.routes.js.map