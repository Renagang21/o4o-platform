"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userActivity_controller_1 = require("../../controllers/v1/userActivity.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// User activity log routes
router.get('/:id/activity-log', auth_middleware_1.authenticate, userActivity_controller_1.UserActivityController.getUserActivityLog);
router.post('/:id/activity-log', auth_middleware_1.authenticate, userActivity_controller_1.UserActivityController.createUserActivity);
router.get('/:id/activity-summary', auth_middleware_1.authenticate, userActivity_controller_1.UserActivityController.getActivitySummary);
// Activity metadata routes
router.get('/activity-categories', auth_middleware_1.authenticate, userActivity_controller_1.UserActivityController.getActivityCategories);
router.get('/activity-types', auth_middleware_1.authenticate, userActivity_controller_1.UserActivityController.getActivityTypes);
exports.default = router;
//# sourceMappingURL=userActivity.routes.js.map