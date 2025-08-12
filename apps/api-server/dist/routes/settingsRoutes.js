"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const settingsController = new settingsController_1.SettingsController();
// Public endpoints
router.get('/homepage', settingsController.getHomepageSettings.bind(settingsController));
// Admin only endpoints
router.get('/:type', authMiddleware_1.authMiddleware.verifyToken, authMiddleware_1.authMiddleware.requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', authMiddleware_1.authMiddleware.verifyToken, authMiddleware_1.authMiddleware.requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', authMiddleware_1.authMiddleware.verifyToken, authMiddleware_1.authMiddleware.requireAdmin, settingsController.initializeSettings.bind(settingsController));
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map