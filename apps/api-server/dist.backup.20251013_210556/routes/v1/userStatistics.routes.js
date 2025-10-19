"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userStatistics_controller_1 = require("../../controllers/v1/userStatistics.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// User statistics routes (admin only)
router.get('/statistics', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, userStatistics_controller_1.UserStatisticsController.getUserStatistics);
router.get('/statistics/growth', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, userStatistics_controller_1.UserStatisticsController.getUserGrowthTrend);
router.get('/statistics/retention', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, userStatistics_controller_1.UserStatisticsController.getRetentionStatistics);
exports.default = router;
//# sourceMappingURL=userStatistics.routes.js.map