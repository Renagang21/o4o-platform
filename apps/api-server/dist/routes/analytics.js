"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const analyticsMiddleware_1 = require("../middleware/analyticsMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authMiddleware.verifyToken);
// Apply analytics tracking middleware
router.use(analyticsMiddleware_1.analyticsMiddleware.initializeTracking());
router.use(analyticsMiddleware_1.analyticsMiddleware.trackPerformance());
router.use(analyticsMiddleware_1.analyticsMiddleware.manageSession());
// Overview and Dashboard Routes
router.get('/overview', analyticsController_1.analyticsController.getOverview.bind(analyticsController_1.analyticsController));
router.get('/real-time', analyticsController_1.analyticsController.getRealTimeMetrics.bind(analyticsController_1.analyticsController));
// User Analytics Routes
router.get('/users', analyticsController_1.analyticsController.getUserAnalytics.bind(analyticsController_1.analyticsController));
router.get('/users/actions', analyticsController_1.analyticsController.getUserActions.bind(analyticsController_1.analyticsController));
// System Performance Analytics Routes
router.get('/system', analyticsController_1.analyticsController.getSystemAnalytics.bind(analyticsController_1.analyticsController));
// Content Usage Analytics Routes
router.get('/content', analyticsController_1.analyticsController.getContentAnalytics.bind(analyticsController_1.analyticsController));
// Reports Management Routes
router.get('/reports', analyticsController_1.analyticsController.getReports.bind(analyticsController_1.analyticsController));
router.post('/reports', analyticsController_1.analyticsController.generateReport.bind(analyticsController_1.analyticsController));
router.get('/reports/:id', analyticsController_1.analyticsController.getReport.bind(analyticsController_1.analyticsController));
// Alerts Management Routes
router.get('/alerts', analyticsController_1.analyticsController.getAlerts.bind(analyticsController_1.analyticsController));
router.post('/alerts/:id/acknowledge', analyticsController_1.analyticsController.acknowledgeAlert.bind(analyticsController_1.analyticsController));
router.post('/alerts/:id/resolve', analyticsController_1.analyticsController.resolveAlert.bind(analyticsController_1.analyticsController));
// Export router
exports.default = router;
//# sourceMappingURL=analytics.js.map