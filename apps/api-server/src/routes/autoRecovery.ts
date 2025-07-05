import { Router } from 'express';
import { autoRecoveryController } from '../controllers/autoRecoveryController';
import { authMiddleware, roleGuard } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// System Overview - accessible to all authenticated users
router.get('/overview', autoRecoveryController.getSystemOverview.bind(autoRecoveryController));

// Auto Recovery Service routes - admin only
router.get('/status', roleGuard(['admin']), autoRecoveryController.getAutoRecoveryStatus.bind(autoRecoveryController));
router.get('/stats', roleGuard(['admin']), autoRecoveryController.getRecoveryStats.bind(autoRecoveryController));
router.get('/active', roleGuard(['admin']), autoRecoveryController.getActiveRecoveries.bind(autoRecoveryController));
router.get('/history', roleGuard(['admin']), autoRecoveryController.getRecoveryHistory.bind(autoRecoveryController));
router.post('/enable', roleGuard(['admin']), autoRecoveryController.enableAutoRecovery.bind(autoRecoveryController));
router.post('/disable', roleGuard(['admin']), autoRecoveryController.disableAutoRecovery.bind(autoRecoveryController));
router.post('/test/:actionId', roleGuard(['admin']), autoRecoveryController.testRecoveryAction.bind(autoRecoveryController));

// Circuit Breaker routes - admin and manager access
router.get('/circuit-breaker/status', roleGuard(['admin', 'manager']), autoRecoveryController.getCircuitBreakerStatus.bind(autoRecoveryController));
router.get('/circuit-breaker/circuits', roleGuard(['admin', 'manager']), autoRecoveryController.getAllCircuits.bind(autoRecoveryController));
router.get('/circuit-breaker/circuits/:circuitId', roleGuard(['admin', 'manager']), autoRecoveryController.getCircuitStats.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/reset', roleGuard(['admin']), autoRecoveryController.resetCircuit.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/reset-all', roleGuard(['admin']), autoRecoveryController.resetAllCircuits.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/force-open', roleGuard(['admin']), autoRecoveryController.forceOpenCircuit.bind(autoRecoveryController));

// Graceful Degradation routes - admin only
router.get('/degradation/status', roleGuard(['admin']), autoRecoveryController.getGracefulDegradationStatus.bind(autoRecoveryController));
router.get('/degradation/active', roleGuard(['admin']), autoRecoveryController.getActiveDegradations.bind(autoRecoveryController));
router.get('/degradation/features', roleGuard(['admin']), autoRecoveryController.getFeatureStates.bind(autoRecoveryController));
router.post('/degradation/rules/:ruleId/activate', roleGuard(['admin']), autoRecoveryController.activateDegradation.bind(autoRecoveryController));
router.post('/degradation/rules/:ruleId/revert', roleGuard(['admin']), autoRecoveryController.revertDegradation.bind(autoRecoveryController));
router.post('/degradation/enable', roleGuard(['admin']), autoRecoveryController.enableGracefulDegradation.bind(autoRecoveryController));
router.post('/degradation/disable', roleGuard(['admin']), autoRecoveryController.disableGracefulDegradation.bind(autoRecoveryController));

// Incident Escalation routes - admin and manager access
router.get('/escalation/status', roleGuard(['admin', 'manager']), autoRecoveryController.getIncidentEscalationStatus.bind(autoRecoveryController));
router.get('/escalation/active', roleGuard(['admin', 'manager']), autoRecoveryController.getActiveEscalations.bind(autoRecoveryController));
router.post('/escalation/:escalationId/acknowledge', roleGuard(['admin', 'manager']), autoRecoveryController.acknowledgeEscalation.bind(autoRecoveryController));
router.post('/escalation/:escalationId/resolve', roleGuard(['admin', 'manager']), autoRecoveryController.resolveEscalation.bind(autoRecoveryController));

// Self Healing routes - admin only
router.get('/self-healing/status', roleGuard(['admin']), autoRecoveryController.getSelfHealingStatus.bind(autoRecoveryController));
router.get('/self-healing/health', roleGuard(['admin']), autoRecoveryController.getSystemHealth.bind(autoRecoveryController));
router.get('/self-healing/history', roleGuard(['admin']), autoRecoveryController.getHealingHistory.bind(autoRecoveryController));
router.get('/self-healing/active', roleGuard(['admin']), autoRecoveryController.getActiveHealingAttempts.bind(autoRecoveryController));
router.post('/self-healing/enable', roleGuard(['admin']), autoRecoveryController.enableSelfHealing.bind(autoRecoveryController));
router.post('/self-healing/disable', roleGuard(['admin']), autoRecoveryController.disableSelfHealing.bind(autoRecoveryController));
router.post('/self-healing/force', roleGuard(['admin']), autoRecoveryController.forceHealing.bind(autoRecoveryController));

// Deployment Monitoring routes - admin and manager access
router.get('/deployment/status', roleGuard(['admin', 'manager']), autoRecoveryController.getDeploymentMonitoringStatus.bind(autoRecoveryController));
router.get('/deployment/active', roleGuard(['admin', 'manager']), autoRecoveryController.getActiveDeployments.bind(autoRecoveryController));
router.get('/deployment/history', roleGuard(['admin', 'manager']), autoRecoveryController.getDeploymentHistory.bind(autoRecoveryController));
router.get('/deployment/:deploymentId', roleGuard(['admin', 'manager']), autoRecoveryController.getDeployment.bind(autoRecoveryController));
router.post('/deployment/track', roleGuard(['admin']), autoRecoveryController.trackDeployment.bind(autoRecoveryController));
router.post('/deployment/:target/rollback', roleGuard(['admin']), autoRecoveryController.rollbackDeployment.bind(autoRecoveryController));
router.post('/deployment/auto-rollback/enable', roleGuard(['admin']), autoRecoveryController.enableAutoRollback.bind(autoRecoveryController));
router.post('/deployment/auto-rollback/disable', roleGuard(['admin']), autoRecoveryController.disableAutoRollback.bind(autoRecoveryController));

export default router;