import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { analyticsMiddleware } from '../middleware/analyticsMiddleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply analytics tracking middleware
router.use(analyticsMiddleware.initializeTracking());
router.use(analyticsMiddleware.trackPerformance());
router.use(analyticsMiddleware.manageSession());

// Overview and Dashboard Routes
router.get('/overview', analyticsController.getOverview.bind(analyticsController));
router.get('/real-time', analyticsController.getRealTimeMetrics.bind(analyticsController));

// User Analytics Routes
router.get('/users', analyticsController.getUserAnalytics.bind(analyticsController));
router.get('/users/actions', analyticsController.getUserActions.bind(analyticsController));

// System Performance Analytics Routes
router.get('/system', analyticsController.getSystemAnalytics.bind(analyticsController));

// Content Usage Analytics Routes
router.get('/content', analyticsController.getContentAnalytics.bind(analyticsController));

// Reports Management Routes
router.get('/reports', analyticsController.getReports.bind(analyticsController));
router.post('/reports', analyticsController.generateReport.bind(analyticsController));
router.get('/reports/:id', analyticsController.getReport.bind(analyticsController));

// Alerts Management Routes
router.get('/alerts', analyticsController.getAlerts.bind(analyticsController));
router.post('/alerts/:id/acknowledge', analyticsController.acknowledgeAlert.bind(analyticsController));
router.post('/alerts/:id/resolve', analyticsController.resolveAlert.bind(analyticsController));

// Export router
export default router;