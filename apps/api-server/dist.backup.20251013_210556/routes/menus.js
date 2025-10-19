"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MenuController_1 = require("../controllers/menu/MenuController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkRole_1 = require("../middleware/checkRole");
const router = (0, express_1.Router)();
const menuController = new MenuController_1.MenuController();
// Public routes
router.get('/', menuController.getMenus);
router.get('/locations', menuController.getMenuLocations);
router.get('/location/:key', menuController.getMenuByLocation);
router.get('/:id', menuController.getMenu);
router.get('/:id/filtered', menuController.getFilteredMenu); // Role-based filtered menu
// Protected routes (require authentication)
router.use(auth_middleware_1.authenticate);
// Admin and Editor routes
router.post('/', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.createMenu);
router.put('/:id', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.updateMenu);
router.put('/:id/reorder', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.reorderMenuItems);
router.post('/:id/duplicate', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.duplicateMenu);
// Admin only routes
router.delete('/:id', (0, checkRole_1.checkRole)(['admin']), menuController.deleteMenu);
exports.default = router;
//# sourceMappingURL=menus.js.map