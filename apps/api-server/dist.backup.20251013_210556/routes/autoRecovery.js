"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const autoRecoveryController_1 = require("../controllers/autoRecoveryController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const auth_1 = require("../types/auth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_middleware_1.authenticate);
// System Overview - accessible to all authenticated users
router.get('/overview', autoRecoveryController_1.autoRecoveryController.getSystemOverview.bind(autoRecoveryController_1.autoRecoveryController));
// Auto Recovery Service routes - admin only
router.get('/status', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getAutoRecoveryStatus.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/stats', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getRecoveryStats.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/active', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getActiveRecoveries.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/history', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getRecoveryHistory.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/enable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.enableAutoRecovery.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/disable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.disableAutoRecovery.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/test/:actionId', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.testRecoveryAction.bind(autoRecoveryController_1.autoRecoveryController));
// Circuit Breaker routes - admin and manager access
router.get('/circuit-breaker/status', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getCircuitBreakerStatus.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/circuit-breaker/circuits', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getAllCircuits.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/circuit-breaker/circuits/:circuitId', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getCircuitStats.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/reset', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.resetCircuit.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/circuit-breaker/circuits/reset-all', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.resetAllCircuits.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/circuit-breaker/circuits/:circuitId/force-open', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.forceOpenCircuit.bind(autoRecoveryController_1.autoRecoveryController));
// Graceful Degradation routes - admin only
router.get('/degradation/status', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getGracefulDegradationStatus.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/degradation/active', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getActiveDegradations.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/degradation/features', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getFeatureStates.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/degradation/rules/:ruleId/activate', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.activateDegradation.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/degradation/rules/:ruleId/revert', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.revertDegradation.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/degradation/enable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.enableGracefulDegradation.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/degradation/disable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.disableGracefulDegradation.bind(autoRecoveryController_1.autoRecoveryController));
// Incident Escalation routes - admin and manager access
router.get('/escalation/status', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getIncidentEscalationStatus.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/escalation/active', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getActiveEscalations.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/escalation/:escalationId/acknowledge', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.acknowledgeEscalation.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/escalation/:escalationId/resolve', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.resolveEscalation.bind(autoRecoveryController_1.autoRecoveryController));
// Self Healing routes - admin only
router.get('/self-healing/status', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getSelfHealingStatus.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/self-healing/health', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getSystemHealth.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/self-healing/history', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getHealingHistory.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/self-healing/active', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.getActiveHealingAttempts.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/self-healing/enable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.enableSelfHealing.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/self-healing/disable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.disableSelfHealing.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/self-healing/force', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.forceHealing.bind(autoRecoveryController_1.autoRecoveryController));
// Deployment Monitoring routes - admin and manager access
router.get('/deployment/status', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getDeploymentMonitoringStatus.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/deployment/active', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getActiveDeployments.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/deployment/history', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getDeploymentHistory.bind(autoRecoveryController_1.autoRecoveryController));
router.get('/deployment/:deploymentId', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN, auth_1.UserRole.MANAGER]), autoRecoveryController_1.autoRecoveryController.getDeployment.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/deployment/track', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.trackDeployment.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/deployment/:target/rollback', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.rollbackDeployment.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/deployment/auto-rollback/enable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.enableAutoRollback.bind(autoRecoveryController_1.autoRecoveryController));
router.post('/deployment/auto-rollback/disable', (0, permission_middleware_1.requireAnyRole)([auth_1.UserRole.ADMIN]), autoRecoveryController_1.autoRecoveryController.disableAutoRollback.bind(autoRecoveryController_1.autoRecoveryController));
exports.default = router;
//# sourceMappingURL=autoRecovery.js.map