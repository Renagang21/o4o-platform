"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const router = (0, express_1.Router)();
const settingsController = new settingsController_1.SettingsController();
// Public endpoints
router.get('/homepage', settingsController.getHomepageSettings.bind(settingsController));
router.get('/general', settingsController.getGeneralSettings.bind(settingsController));
router.get('/customizer', settingsController.getCustomizerSettings.bind(settingsController));
// Admin only endpoints
router.get('/:type', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, settingsController.initializeSettings.bind(settingsController));
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map