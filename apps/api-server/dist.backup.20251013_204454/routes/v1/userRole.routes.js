"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userRole_controller_1 = require("../../controllers/v1/userRole.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
// New unified permission middleware
const permission_middleware_1 = require("../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// Role management routes
router.get('/roles', userRole_controller_1.UserRoleController.getRoles); // Public endpoint - just returns role definitions
router.get('/roles/statistics', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, permission_middleware_1.requireAdmin, userRole_controller_1.UserRoleController.getRoleStatistics);
router.get('/permissions', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, userRole_controller_1.UserRoleController.getPermissions);
// User role routes
router.get('/:id/role', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, (0, permission_middleware_1.requireSelfOrAdmin)(), userRole_controller_1.UserRoleController.getUserRole);
router.put('/:id/role', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, permission_middleware_1.requireAdmin, userRole_controller_1.UserRoleController.updateUserRole);
router.get('/:id/permissions', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, (0, permission_middleware_1.requireSelfOrAdmin)(), userRole_controller_1.UserRoleController.getUserPermissions);
router.get('/:id/permissions/check', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, (0, permission_middleware_1.requireSelfOrAdmin)(), userRole_controller_1.UserRoleController.checkUserPermission);
exports.default = router;
//# sourceMappingURL=userRole.routes.js.map