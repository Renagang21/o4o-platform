"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MenuAdvancedController_1 = require("../controllers/menu/MenuAdvancedController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkRole_1 = require("../middleware/checkRole");
const router = (0, express_1.Router)();
const menuAdvancedController = new MenuAdvancedController_1.MenuAdvancedController();
// All advanced menu routes require authentication
router.use(auth_middleware_1.authenticate);
// ============================================================================
// CONDITIONAL DISPLAY APIs
// ============================================================================
// Menu item conditions - Admin only
router.post('/menu-items/:id/conditions', (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuAdvancedController.createMenuItemConditions.bind(menuAdvancedController));
router.get('/menu-items/:id/conditions', (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuAdvancedController.getMenuItemConditions.bind(menuAdvancedController));
router.delete('/menu-items/:id/conditions', (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuAdvancedController.deleteMenuItemConditions.bind(menuAdvancedController));
// ============================================================================
// MENU STYLES APIs
// ============================================================================
// Menu styles - Admin and Editor
router.post('/menus/:id/styles', (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuAdvancedController.createMenuStyles.bind(menuAdvancedController));
router.get('/menus/:id/styles', menuAdvancedController.getMenuStyles.bind(menuAdvancedController));
router.put('/menus/:id/styles', (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuAdvancedController.updateMenuStyles.bind(menuAdvancedController));
// ============================================================================
// MEGA MENU APIs
// ============================================================================
// Mega menu configuration - Admin only
router.post('/menus/:id/mega-menu', (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuAdvancedController.createMegaMenu.bind(menuAdvancedController));
router.get('/menus/:id/mega-menu', menuAdvancedController.getMegaMenu.bind(menuAdvancedController));
router.put('/menus/:id/mega-menu', (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuAdvancedController.updateMegaMenu.bind(menuAdvancedController));
exports.default = router;
//# sourceMappingURL=menu-advanced.js.map