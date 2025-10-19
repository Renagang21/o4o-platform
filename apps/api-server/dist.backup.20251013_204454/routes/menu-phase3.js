"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MenuCacheController_1 = require("../controllers/menu/MenuCacheController");
const MenuAnalyticsController_1 = require("../controllers/menu/MenuAnalyticsController");
const MenuWidgetController_1 = require("../controllers/menu/MenuWidgetController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkRole_1 = require("../middleware/checkRole");
const router = (0, express_1.Router)();
const menuCacheController = new MenuCacheController_1.MenuCacheController();
const menuAnalyticsController = new MenuAnalyticsController_1.MenuAnalyticsController();
const menuWidgetController = new MenuWidgetController_1.MenuWidgetController();
// ============================================================================
// MENU CACHING APIs
// ============================================================================
// Cache management - Admin only
router.post('/menus/:id/cache', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuCacheController.createMenuCache.bind(menuCacheController));
router.delete('/menus/:id/cache', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuCacheController.deleteMenuCache.bind(menuCacheController));
router.get('/menus/cache-status', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuCacheController.getCacheStatus.bind(menuCacheController));
// ============================================================================
// MENU ANALYTICS APIs
// ============================================================================
// Analytics - Admin and Editor can view
router.get('/menus/:id/analytics', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuAnalyticsController.getMenuAnalytics.bind(menuAnalyticsController));
router.get('/menus/:id/performance', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuAnalyticsController.getMenuPerformance.bind(menuAnalyticsController));
// Public endpoint for tracking clicks
router.post('/menus/:id/track-click', menuAnalyticsController.trackMenuClick.bind(menuAnalyticsController));
// ============================================================================
// MENU WIDGET APIs
// ============================================================================
// Widget management
router.get('/menu-widgets', auth_middleware_1.authenticate, menuWidgetController.getMenuWidgets.bind(menuWidgetController));
router.post('/menu-widgets', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuWidgetController.createMenuWidget.bind(menuWidgetController));
router.get('/menu-widgets/:id', auth_middleware_1.authenticate, menuWidgetController.getMenuWidget.bind(menuWidgetController));
router.put('/menu-widgets/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), menuWidgetController.updateMenuWidget.bind(menuWidgetController));
router.delete('/menu-widgets/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin']), menuWidgetController.deleteMenuWidget.bind(menuWidgetController));
// Widget rendering - can be public or authenticated based on requirements
router.post('/menu-widgets/:id/render', menuWidgetController.renderMenuWidget.bind(menuWidgetController));
exports.default = router;
//# sourceMappingURL=menu-phase3.js.map