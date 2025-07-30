import { Router } from 'express';
import { statusPageController } from '../controllers/statusPageController';
import { authMiddleware } from '../middleware/authMiddleware';
import { analyticsMiddleware } from '../middleware/analyticsMiddleware';

const router: Router = Router();

// Public status page endpoints (no authentication required)
router.get('/', statusPageController.getPublicStatus.bind(statusPageController));
router.get('/incidents', statusPageController.getIncidents.bind(statusPageController));
router.get('/incidents/:incidentId', statusPageController.getIncident.bind(statusPageController));
router.get('/components/:componentId/uptime', statusPageController.getComponentUptime.bind(statusPageController));

// Subscription endpoints (public)
router.post('/subscribe', statusPageController.subscribe.bind(statusPageController));
router.get('/confirm/:token', statusPageController.confirmSubscription.bind(statusPageController));
router.get('/unsubscribe/:token', statusPageController.unsubscribe.bind(statusPageController));

// Health check trigger (public, but could be rate limited)
router.post('/health-check', statusPageController.performHealthChecks.bind(statusPageController));

// Apply authentication for admin endpoints
router.use('/admin', authMiddleware.verifyToken);
router.use('/admin', authMiddleware.requireRole(['admin', 'operator']));
router.use('/admin', analyticsMiddleware.trackPerformance());

// Admin component management
router.get('/admin/components', statusPageController.getComponents.bind(statusPageController));
router.post('/admin/components', statusPageController.createComponent.bind(statusPageController));
router.put('/admin/components/:componentId/status', statusPageController.updateComponentStatus.bind(statusPageController));

// Admin incident management
router.post('/admin/incidents', statusPageController.createIncident.bind(statusPageController));
router.put('/admin/incidents/:incidentId', statusPageController.updateIncident.bind(statusPageController));

// Admin maintenance management
router.post('/admin/maintenance', statusPageController.scheduleMaintenance.bind(statusPageController));
router.post('/admin/maintenance/:maintenanceId/start', statusPageController.startMaintenance.bind(statusPageController));
router.post('/admin/maintenance/:maintenanceId/complete', statusPageController.completeMaintenance.bind(statusPageController));

// Admin metrics and monitoring
router.post('/admin/metrics', statusPageController.recordMetric.bind(statusPageController));
router.get('/admin/analytics', statusPageController.getStatusAnalytics.bind(statusPageController));

export default router;