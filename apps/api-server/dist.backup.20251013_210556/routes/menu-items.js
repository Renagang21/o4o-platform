"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MenuController_1 = require("../controllers/menu/MenuController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkRole_1 = require("../middleware/checkRole");
const router = (0, express_1.Router)();
const menuController = new MenuController_1.MenuController();
// All menu item routes require authentication
router.use(auth_middleware_1.authenticate);
// Admin and Editor routes
router.post('/', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.addMenuItem);
router.put('/:id', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.updateMenuItem);
router.delete('/:id', (0, checkRole_1.checkRole)(['admin', 'editor']), menuController.deleteMenuItem);
exports.default = router;
//# sourceMappingURL=menu-items.js.map