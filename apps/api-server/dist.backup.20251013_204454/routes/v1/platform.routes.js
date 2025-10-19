"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const platform_controller_1 = require("../../controllers/v1/platform.controller");
const router = (0, express_1.Router)();
const platformController = new platform_controller_1.PlatformController();
// Apps management
router.get('/apps', platformController.getApps);
router.get('/apps/active', platformController.getActiveApps);
router.get('/apps/:id', platformController.getApp);
router.put('/apps/:id/status', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, platformController.updateAppStatus);
router.put('/apps/:id/settings', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, platformController.updateAppSettings);
// Platform settings
router.get('/settings', platformController.getPlatformSettings);
router.put('/settings', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, platformController.updatePlatformSettings);
// Platform statistics
router.get('/stats', auth_middleware_1.authenticate, platformController.getPlatformStats);
// Custom post types (migrated from /cpt)
router.get('/custom-post-types', platformController.getCustomPostTypes);
router.get('/custom-post-types/:id', platformController.getCustomPostType);
router.post('/custom-post-types', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, platformController.createCustomPostType);
router.put('/custom-post-types/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, platformController.updateCustomPostType);
router.delete('/custom-post-types/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, platformController.deleteCustomPostType);
exports.default = router;
//# sourceMappingURL=platform.routes.js.map