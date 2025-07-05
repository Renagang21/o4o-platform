import { Router } from 'express';
import { operationsController } from '../controllers/operationsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { analyticsMiddleware } from '../middleware/analyticsMiddleware';

const router = Router();

// Public health check endpoint (no auth required)
router.get('/health', operationsController.getSystemHealth.bind(operationsController));
router.get('/status', operationsController.getStatusPageData.bind(operationsController));

// Apply authentication middleware to protected routes
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireRole(['admin', 'operator']));

// Apply analytics tracking
router.use(analyticsMiddleware.trackPerformance());

// System Status and Health Monitoring
router.get('/system/status', operationsController.getSystemStatus.bind(operationsController));
router.get('/system/health/:serviceName', operationsController.getServiceHealth.bind(operationsController));

// Infrastructure Monitoring
router.get('/infrastructure/metrics', operationsController.getInfrastructureMetrics.bind(operationsController));
router.get('/performance/metrics', operationsController.getPerformanceMetrics.bind(operationsController));

// Alert Management
router.get('/alerts', operationsController.getAlerts.bind(operationsController));
router.post('/alerts/:alertId/acknowledge', operationsController.acknowledgeAlert.bind(operationsController));
router.post('/alerts/:alertId/resolve', operationsController.resolveAlert.bind(operationsController));

// Alert Rules Management
router.get('/alert-rules', operationsController.getAlertRules.bind(operationsController));
router.post('/alert-rules', operationsController.createAlertRule.bind(operationsController));
router.put('/alert-rules/:ruleId', operationsController.updateAlertRule.bind(operationsController));
router.delete('/alert-rules/:ruleId', operationsController.deleteAlertRule.bind(operationsController));

// Monitoring Configuration
router.get('/config', operationsController.getMonitoringConfig.bind(operationsController));
router.put('/config', operationsController.updateMonitoringConfig.bind(operationsController));

// Operations Dashboard
router.get('/dashboard', operationsController.getDashboardData.bind(operationsController));

export default router;