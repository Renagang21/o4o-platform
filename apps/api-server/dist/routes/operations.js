"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const operationsController_1 = require("../controllers/operationsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const analyticsMiddleware_1 = require("../middleware/analyticsMiddleware");
const router = (0, express_1.Router)();
// Public health check endpoint (no auth required)
router.get('/health', operationsController_1.operationsController.getSystemHealth.bind(operationsController_1.operationsController));
router.get('/status', operationsController_1.operationsController.getStatusPageData.bind(operationsController_1.operationsController));
// Apply authentication middleware to protected routes
router.use(authMiddleware_1.authMiddleware.verifyToken);
router.use(authMiddleware_1.authMiddleware.requireRole(['admin', 'operator']));
// Apply analytics tracking
router.use(analyticsMiddleware_1.analyticsMiddleware.trackPerformance());
// System Status and Health Monitoring
router.get('/system/status', operationsController_1.operationsController.getSystemStatus.bind(operationsController_1.operationsController));
router.get('/system/health/:serviceName', operationsController_1.operationsController.getServiceHealth.bind(operationsController_1.operationsController));
// Infrastructure Monitoring
router.get('/infrastructure/metrics', operationsController_1.operationsController.getInfrastructureMetrics.bind(operationsController_1.operationsController));
router.get('/performance/metrics', operationsController_1.operationsController.getPerformanceMetrics.bind(operationsController_1.operationsController));
// Alert Management
router.get('/alerts', operationsController_1.operationsController.getAlerts.bind(operationsController_1.operationsController));
router.post('/alerts/:alertId/acknowledge', operationsController_1.operationsController.acknowledgeAlert.bind(operationsController_1.operationsController));
router.post('/alerts/:alertId/resolve', operationsController_1.operationsController.resolveAlert.bind(operationsController_1.operationsController));
// Alert Rules Management
router.get('/alert-rules', operationsController_1.operationsController.getAlertRules.bind(operationsController_1.operationsController));
router.post('/alert-rules', operationsController_1.operationsController.createAlertRule.bind(operationsController_1.operationsController));
router.put('/alert-rules/:ruleId', operationsController_1.operationsController.updateAlertRule.bind(operationsController_1.operationsController));
router.delete('/alert-rules/:ruleId', operationsController_1.operationsController.deleteAlertRule.bind(operationsController_1.operationsController));
// Monitoring Configuration
router.get('/config', operationsController_1.operationsController.getMonitoringConfig.bind(operationsController_1.operationsController));
router.put('/config', operationsController_1.operationsController.updateMonitoringConfig.bind(operationsController_1.operationsController));
// Operations Dashboard
router.get('/dashboard', operationsController_1.operationsController.getDashboardData.bind(operationsController_1.operationsController));
exports.default = router;
//# sourceMappingURL=operations.js.map