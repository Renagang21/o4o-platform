"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_settings_controller_1 = require("../../controllers/v1/ai-settings.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_1 = require("../../middleware/admin");
const router = (0, express_1.Router)();
const controller = new ai_settings_controller_1.AISettingsController();
// All routes require authentication and admin access
router.use(auth_middleware_1.authenticate);
router.use(admin_1.isAdmin);
// Get all AI settings
router.get('/', controller.getSettings);
// Save AI setting
router.post('/', controller.saveSettings);
// Test API key
router.post('/test', controller.testApiKey);
// Delete AI setting
router.delete('/:provider', controller.deleteSetting);
exports.default = router;
//# sourceMappingURL=ai-settings.routes.js.map