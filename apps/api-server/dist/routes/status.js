"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statusPageController_1 = require("../controllers/statusPageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const analyticsMiddleware_1 = require("../middleware/analyticsMiddleware");
const router = (0, express_1.Router)();
// Public status page endpoints (no authentication required)
router.get('/', statusPageController_1.statusPageController.getPublicStatus.bind(statusPageController_1.statusPageController));
router.get('/incidents', statusPageController_1.statusPageController.getIncidents.bind(statusPageController_1.statusPageController));
router.get('/incidents/:incidentId', statusPageController_1.statusPageController.getIncident.bind(statusPageController_1.statusPageController));
router.get('/components/:componentId/uptime', statusPageController_1.statusPageController.getComponentUptime.bind(statusPageController_1.statusPageController));
// Subscription endpoints (public)
router.post('/subscribe', statusPageController_1.statusPageController.subscribe.bind(statusPageController_1.statusPageController));
router.get('/confirm/:token', statusPageController_1.statusPageController.confirmSubscription.bind(statusPageController_1.statusPageController));
router.get('/unsubscribe/:token', statusPageController_1.statusPageController.unsubscribe.bind(statusPageController_1.statusPageController));
// Health check trigger (public, but could be rate limited)
router.post('/health-check', statusPageController_1.statusPageController.performHealthChecks.bind(statusPageController_1.statusPageController));
// Apply authentication for admin endpoints
router.use('/admin', authMiddleware_1.authMiddleware.verifyToken);
router.use('/admin', authMiddleware_1.authMiddleware.requireRole(['admin', 'operator']));
router.use('/admin', analyticsMiddleware_1.analyticsMiddleware.trackPerformance());
// Admin component management
router.get('/admin/components', statusPageController_1.statusPageController.getComponents.bind(statusPageController_1.statusPageController));
router.post('/admin/components', statusPageController_1.statusPageController.createComponent.bind(statusPageController_1.statusPageController));
router.put('/admin/components/:componentId/status', statusPageController_1.statusPageController.updateComponentStatus.bind(statusPageController_1.statusPageController));
// Admin incident management
router.post('/admin/incidents', statusPageController_1.statusPageController.createIncident.bind(statusPageController_1.statusPageController));
router.put('/admin/incidents/:incidentId', statusPageController_1.statusPageController.updateIncident.bind(statusPageController_1.statusPageController));
// Admin maintenance management
router.post('/admin/maintenance', statusPageController_1.statusPageController.scheduleMaintenance.bind(statusPageController_1.statusPageController));
router.post('/admin/maintenance/:maintenanceId/start', statusPageController_1.statusPageController.startMaintenance.bind(statusPageController_1.statusPageController));
router.post('/admin/maintenance/:maintenanceId/complete', statusPageController_1.statusPageController.completeMaintenance.bind(statusPageController_1.statusPageController));
// Admin metrics and monitoring
router.post('/admin/metrics', statusPageController_1.statusPageController.recordMetric.bind(statusPageController_1.statusPageController));
router.get('/admin/analytics', statusPageController_1.statusPageController.getStatusAnalytics.bind(statusPageController_1.statusPageController));
exports.default = router;
//# sourceMappingURL=status.js.map