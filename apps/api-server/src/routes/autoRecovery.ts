import { Router } from 'express';
import { autoRecoveryController } from '../controllers/autoRecoveryController';
import { authMiddleware, roleGuard } from '../middleware/authMiddleware';
import { UserRole } from '../types/auth';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);

// System Overview - accessible to all authenticated users
router.get('/overview', autoRecoveryController.getSystemOverview.bind(autoRecoveryController));

// Auto Recovery Service routes - admin only
router.get('/status', roleGuard([UserRole.ADMIN]), autoRecoveryController.getAutoRecoveryStatus.bind(autoRecoveryController));
router.get('/stats', roleGuard([UserRole.ADMIN]), autoRecoveryController.getRecoveryStats.bind(autoRecoveryController));
router.get('/active', roleGuard([UserRole.ADMIN]), autoRecoveryController.getActiveRecoveries.bind(autoRecoveryController));
router.get('/history', roleGuard([UserRole.ADMIN]), autoRecoveryController.getRecoveryHistory.bind(autoRecoveryController));
router.post('/enable', roleGuard([UserRole.ADMIN]), autoRecoveryController.enableAutoRecovery.bind(autoRecoveryController));
router.post('/disable', roleGuard([UserRole.ADMIN]), autoRecoveryController.disableAutoRecovery.bind(autoRecoveryController));
router.post('/test/:actionId', roleGuard([UserRole.ADMIN]), autoRecoveryController.testRecoveryAction.bind(autoRecoveryController));

// Circuit Breaker routes - admin and manager access
router.get('/circuit-breaker/status', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getCircuitBreakerStatus.bind(autoRecoveryController));
router.get('/circuit-breaker/circuits', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getAllCircuits.bind(autoRecoveryController));
router.get('/circuit-breaker/circuits/:circuitId', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getCircuitStats.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/reset', roleGuard([UserRole.ADMIN]), autoRecoveryController.resetCircuit.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/reset-all', roleGuard([UserRole.ADMIN]), autoRecoveryController.resetAllCircuits.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/force-open', roleGuard([UserRole.ADMIN]), autoRecoveryController.forceOpenCircuit.bind(autoRecoveryController));

// Graceful Degradation routes - admin only
router.get('/degradation/status', roleGuard([UserRole.ADMIN]), autoRecoveryController.getGracefulDegradationStatus.bind(autoRecoveryController));
router.get('/degradation/active', roleGuard([UserRole.ADMIN]), autoRecoveryController.getActiveDegradations.bind(autoRecoveryController));
router.get('/degradation/features', roleGuard([UserRole.ADMIN]), autoRecoveryController.getFeatureStates.bind(autoRecoveryController));
router.post('/degradation/rules/:ruleId/activate', roleGuard([UserRole.ADMIN]), autoRecoveryController.activateDegradation.bind(autoRecoveryController));
router.post('/degradation/rules/:ruleId/revert', roleGuard([UserRole.ADMIN]), autoRecoveryController.revertDegradation.bind(autoRecoveryController));
router.post('/degradation/enable', roleGuard([UserRole.ADMIN]), autoRecoveryController.enableGracefulDegradation.bind(autoRecoveryController));
router.post('/degradation/disable', roleGuard([UserRole.ADMIN]), autoRecoveryController.disableGracefulDegradation.bind(autoRecoveryController));

// Incident Escalation routes - admin and manager access
router.get('/escalation/status', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getIncidentEscalationStatus.bind(autoRecoveryController));
router.get('/escalation/active', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getActiveEscalations.bind(autoRecoveryController));
router.post('/escalation/:escalationId/acknowledge', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.acknowledgeEscalation.bind(autoRecoveryController));
router.post('/escalation/:escalationId/resolve', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.resolveEscalation.bind(autoRecoveryController));

// Self Healing routes - admin only
router.get('/self-healing/status', roleGuard([UserRole.ADMIN]), autoRecoveryController.getSelfHealingStatus.bind(autoRecoveryController));
router.get('/self-healing/health', roleGuard([UserRole.ADMIN]), autoRecoveryController.getSystemHealth.bind(autoRecoveryController));
router.get('/self-healing/history', roleGuard([UserRole.ADMIN]), autoRecoveryController.getHealingHistory.bind(autoRecoveryController));
router.get('/self-healing/active', roleGuard([UserRole.ADMIN]), autoRecoveryController.getActiveHealingAttempts.bind(autoRecoveryController));
router.post('/self-healing/enable', roleGuard([UserRole.ADMIN]), autoRecoveryController.enableSelfHealing.bind(autoRecoveryController));
router.post('/self-healing/disable', roleGuard([UserRole.ADMIN]), autoRecoveryController.disableSelfHealing.bind(autoRecoveryController));
router.post('/self-healing/force', roleGuard([UserRole.ADMIN]), autoRecoveryController.forceHealing.bind(autoRecoveryController));

// Deployment Monitoring routes - admin and manager access
router.get('/deployment/status', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getDeploymentMonitoringStatus.bind(autoRecoveryController));
router.get('/deployment/active', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getActiveDeployments.bind(autoRecoveryController));
router.get('/deployment/history', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getDeploymentHistory.bind(autoRecoveryController));
router.get('/deployment/:deploymentId', roleGuard([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getDeployment.bind(autoRecoveryController));
router.post('/deployment/track', roleGuard([UserRole.ADMIN]), autoRecoveryController.trackDeployment.bind(autoRecoveryController));
router.post('/deployment/:target/rollback', roleGuard([UserRole.ADMIN]), autoRecoveryController.rollbackDeployment.bind(autoRecoveryController));
router.post('/deployment/auto-rollback/enable', roleGuard([UserRole.ADMIN]), autoRecoveryController.enableAutoRollback.bind(autoRecoveryController));
router.post('/deployment/auto-rollback/disable', roleGuard([UserRole.ADMIN]), autoRecoveryController.disableAutoRollback.bind(autoRecoveryController));

export default router;