import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoringController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission.middleware';

const router: Router = Router();

// All monitoring routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// System metrics
router.get('/metrics', MonitoringController.getMetrics);
router.get('/metrics/history', MonitoringController.getMetricsHistory);

// Monitoring summary
router.get('/summary', MonitoringController.getSummary);

// Backup management
router.post('/backup/trigger', MonitoringController.triggerBackup);
router.get('/backup/history', MonitoringController.getBackupHistory);

// Error alerts
router.get('/errors', MonitoringController.getErrorAlerts);

// Security audit
router.get('/security/events', MonitoringController.getSecurityEvents);
router.get('/security/rules', MonitoringController.getSecurityRules);
router.put('/security/rules/:ruleId', MonitoringController.updateSecurityRule);

export default router;