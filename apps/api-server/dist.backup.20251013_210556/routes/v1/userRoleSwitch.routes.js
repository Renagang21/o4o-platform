"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userRoleSwitch_controller_1 = require("../../controllers/v1/userRoleSwitch.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// Switch active role (requires authentication)
router.patch('/me/active-role', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, userRoleSwitch_controller_1.UserRoleSwitchController.switchActiveRole);
// Get current user's roles (requires authentication)
router.get('/me/roles', auth_middleware_1.authenticate, permission_middleware_1.ensureAuthenticated, userRoleSwitch_controller_1.UserRoleSwitchController.getCurrentUserRoles);
exports.default = router;
//# sourceMappingURL=userRoleSwitch.routes.js.map