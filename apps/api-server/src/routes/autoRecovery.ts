import { Router } from 'express';
import { autoRecoveryController } from '../controllers/autoRecoveryController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAnyRole } from '../middleware/permission.middleware.js';
import { UserRole } from '../types/auth.js';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// System Overview - accessible to all authenticated users
router.get('/overview', autoRecoveryController.getSystemOverview.bind(autoRecoveryController));

// Auto Recovery Service routes - admin only
router.get('/status', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getAutoRecoveryStatus.bind(autoRecoveryController));
router.get('/stats', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getRecoveryStats.bind(autoRecoveryController));
router.get('/active', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getActiveRecoveries.bind(autoRecoveryController));
router.get('/history', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getRecoveryHistory.bind(autoRecoveryController));
router.post('/enable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.enableAutoRecovery.bind(autoRecoveryController));
router.post('/disable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.disableAutoRecovery.bind(autoRecoveryController));
router.post('/test/:actionId', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.testRecoveryAction.bind(autoRecoveryController));

// Circuit Breaker routes - admin and manager access
router.get('/circuit-breaker/status', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getCircuitBreakerStatus.bind(autoRecoveryController));
router.get('/circuit-breaker/circuits', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getAllCircuits.bind(autoRecoveryController));
router.get('/circuit-breaker/circuits/:circuitId', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getCircuitStats.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/reset', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.resetCircuit.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/reset-all', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.resetAllCircuits.bind(autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/force-open', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.forceOpenCircuit.bind(autoRecoveryController));

// Graceful Degradation routes - admin only
router.get('/degradation/status', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getGracefulDegradationStatus.bind(autoRecoveryController));
router.get('/degradation/active', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getActiveDegradations.bind(autoRecoveryController));
router.get('/degradation/features', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getFeatureStates.bind(autoRecoveryController));
router.post('/degradation/rules/:ruleId/activate', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.activateDegradation.bind(autoRecoveryController));
router.post('/degradation/rules/:ruleId/revert', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.revertDegradation.bind(autoRecoveryController));
router.post('/degradation/enable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.enableGracefulDegradation.bind(autoRecoveryController));
router.post('/degradation/disable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.disableGracefulDegradation.bind(autoRecoveryController));

// Incident Escalation routes - admin and manager access
router.get('/escalation/status', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getIncidentEscalationStatus.bind(autoRecoveryController));
router.get('/escalation/active', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getActiveEscalations.bind(autoRecoveryController));
router.post('/escalation/:escalationId/acknowledge', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.acknowledgeEscalation.bind(autoRecoveryController));
router.post('/escalation/:escalationId/resolve', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.resolveEscalation.bind(autoRecoveryController));

// Self Healing routes - admin only
router.get('/self-healing/status', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getSelfHealingStatus.bind(autoRecoveryController));
router.get('/self-healing/health', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getSystemHealth.bind(autoRecoveryController));
router.get('/self-healing/history', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getHealingHistory.bind(autoRecoveryController));
router.get('/self-healing/active', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.getActiveHealingAttempts.bind(autoRecoveryController));
router.post('/self-healing/enable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.enableSelfHealing.bind(autoRecoveryController));
router.post('/self-healing/disable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.disableSelfHealing.bind(autoRecoveryController));
router.post('/self-healing/force', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.forceHealing.bind(autoRecoveryController));

// Deployment Monitoring routes - admin and manager access
router.get('/deployment/status', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getDeploymentMonitoringStatus.bind(autoRecoveryController));
router.get('/deployment/active', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getActiveDeployments.bind(autoRecoveryController));
router.get('/deployment/history', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getDeploymentHistory.bind(autoRecoveryController));
router.get('/deployment/:deploymentId', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]), autoRecoveryController.getDeployment.bind(autoRecoveryController));
router.post('/deployment/track', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.trackDeployment.bind(autoRecoveryController));
router.post('/deployment/:target/rollback', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.rollbackDeployment.bind(autoRecoveryController));
router.post('/deployment/auto-rollback/enable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.enableAutoRollback.bind(autoRecoveryController));
router.post('/deployment/auto-rollback/disable', requireAnyRole([UserRole.ADMIN]), autoRecoveryController.disableAutoRollback.bind(autoRecoveryController));

export default router;