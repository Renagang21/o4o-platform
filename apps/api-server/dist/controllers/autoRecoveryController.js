"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRecoveryController = exports.AutoRecoveryController = void 0;
const AutoRecoveryService_1 = require("../services/AutoRecoveryService");
const CircuitBreakerService_1 = require("../services/CircuitBreakerService");
const GracefulDegradationService_1 = require("../services/GracefulDegradationService");
const IncidentEscalationService_1 = require("../services/IncidentEscalationService");
const SelfHealingService_1 = require("../services/SelfHealingService");
const DeploymentMonitoringService_1 = require("../services/DeploymentMonitoringService");
class AutoRecoveryController {
    // Auto Recovery Service endpoints
    async getAutoRecoveryStatus(req, res) {
        try {
            const status = await AutoRecoveryService_1.autoRecoveryService.getStatus();
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getRecoveryStats(req, res) {
        try {
            const stats = await AutoRecoveryService_1.autoRecoveryService.getRecoveryStats();
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getActiveRecoveries(req, res) {
        try {
            const recoveries = await AutoRecoveryService_1.autoRecoveryService.getActiveRecoveries();
            res.json({
                success: true,
                data: recoveries
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getRecoveryHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const history = await AutoRecoveryService_1.autoRecoveryService.getRecoveryHistory(limit);
            res.json({
                success: true,
                data: history
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async enableAutoRecovery(req, res) {
        try {
            await AutoRecoveryService_1.autoRecoveryService.enableAutoRecovery();
            res.json({
                success: true,
                message: 'Auto-recovery enabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async disableAutoRecovery(req, res) {
        try {
            await AutoRecoveryService_1.autoRecoveryService.disableAutoRecovery();
            res.json({
                success: true,
                message: 'Auto-recovery disabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async testRecoveryAction(req, res) {
        try {
            const { actionId } = req.params;
            const { alertId } = req.body;
            if (!alertId) {
                res.status(400).json({
                    success: false,
                    error: 'Alert ID is required'
                });
                return;
            }
            const result = await AutoRecoveryService_1.autoRecoveryService.testRecoveryAction(actionId, alertId);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Circuit Breaker Service endpoints
    async getCircuitBreakerStatus(req, res) {
        try {
            const status = await CircuitBreakerService_1.circuitBreakerService.getStatus();
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getAllCircuits(req, res) {
        try {
            const circuits = CircuitBreakerService_1.circuitBreakerService.getAllCircuits();
            res.json({
                success: true,
                data: circuits
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getCircuitStats(req, res) {
        try {
            const { circuitId } = req.params;
            const stats = CircuitBreakerService_1.circuitBreakerService.getCircuitStats(circuitId);
            if (!stats) {
                res.status(404).json({
                    success: false,
                    error: 'Circuit not found'
                });
                return;
            }
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async resetCircuit(req, res) {
        try {
            const { circuitId } = req.params;
            const success = await CircuitBreakerService_1.circuitBreakerService.resetCircuit(circuitId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Circuit not found'
                });
                return;
            }
            res.json({
                success: true,
                message: `Circuit ${circuitId} reset successfully`
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async resetAllCircuits(req, res) {
        try {
            const count = await CircuitBreakerService_1.circuitBreakerService.resetAllCircuits();
            res.json({
                success: true,
                message: `Reset ${count} circuits successfully`
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async forceOpenCircuit(req, res) {
        try {
            const { circuitId } = req.params;
            const success = await CircuitBreakerService_1.circuitBreakerService.forceOpenCircuit(circuitId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Circuit not found'
                });
                return;
            }
            res.json({
                success: true,
                message: `Circuit ${circuitId} forced open successfully`
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Graceful Degradation Service endpoints
    async getGracefulDegradationStatus(req, res) {
        try {
            const status = await GracefulDegradationService_1.gracefulDegradationService.getStatus();
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getActiveDegradations(req, res) {
        try {
            const degradations = await GracefulDegradationService_1.gracefulDegradationService.getActiveDegradations();
            res.json({
                success: true,
                data: degradations
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getFeatureStates(req, res) {
        try {
            const features = await GracefulDegradationService_1.gracefulDegradationService.getFeatureStates();
            res.json({
                success: true,
                data: features
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async activateDegradation(req, res) {
        try {
            const { ruleId } = req.params;
            const success = await GracefulDegradationService_1.gracefulDegradationService.manualActivation(ruleId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Degradation rule not found or already active'
                });
                return;
            }
            res.json({
                success: true,
                message: `Degradation rule ${ruleId} activated successfully`
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async revertDegradation(req, res) {
        try {
            const { ruleId } = req.params;
            const success = await GracefulDegradationService_1.gracefulDegradationService.manualReversion(ruleId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Degradation rule not found or not active'
                });
                return;
            }
            res.json({
                success: true,
                message: `Degradation rule ${ruleId} reverted successfully`
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async enableGracefulDegradation(req, res) {
        try {
            await GracefulDegradationService_1.gracefulDegradationService.enable();
            res.json({
                success: true,
                message: 'Graceful degradation enabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async disableGracefulDegradation(req, res) {
        try {
            await GracefulDegradationService_1.gracefulDegradationService.disable();
            res.json({
                success: true,
                message: 'Graceful degradation disabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Incident Escalation Service endpoints
    async getIncidentEscalationStatus(req, res) {
        try {
            const status = await IncidentEscalationService_1.incidentEscalationService.getStatus();
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getActiveEscalations(req, res) {
        try {
            const escalations = await IncidentEscalationService_1.incidentEscalationService.getActiveEscalations();
            res.json({
                success: true,
                data: escalations
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async acknowledgeEscalation(req, res) {
        try {
            const { escalationId } = req.params;
            const { acknowledgedBy, notes } = req.body;
            if (!acknowledgedBy) {
                res.status(400).json({
                    success: false,
                    error: 'acknowledgedBy is required'
                });
                return;
            }
            const success = await IncidentEscalationService_1.incidentEscalationService.acknowledgeEscalation(escalationId, acknowledgedBy, notes);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Escalation not found or already acknowledged'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Escalation acknowledged successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async resolveEscalation(req, res) {
        try {
            const { escalationId } = req.params;
            const { resolvedBy, notes } = req.body;
            if (!resolvedBy) {
                res.status(400).json({
                    success: false,
                    error: 'resolvedBy is required'
                });
                return;
            }
            const success = await IncidentEscalationService_1.incidentEscalationService.resolveEscalation(escalationId, resolvedBy, notes);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Escalation not found'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Escalation resolved successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Self Healing Service endpoints
    async getSelfHealingStatus(req, res) {
        try {
            const status = await SelfHealingService_1.selfHealingService.getStatus();
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getSystemHealth(req, res) {
        try {
            const health = await SelfHealingService_1.selfHealingService.getSystemHealth();
            res.json({
                success: true,
                data: health
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getHealingHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const history = await SelfHealingService_1.selfHealingService.getHealingHistory(limit);
            res.json({
                success: true,
                data: history
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getActiveHealingAttempts(req, res) {
        try {
            const attempts = await SelfHealingService_1.selfHealingService.getActiveAttempts();
            res.json({
                success: true,
                data: attempts
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async enableSelfHealing(req, res) {
        try {
            await SelfHealingService_1.selfHealingService.enable();
            res.json({
                success: true,
                message: 'Self-healing enabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async disableSelfHealing(req, res) {
        try {
            await SelfHealingService_1.selfHealingService.disable();
            res.json({
                success: true,
                message: 'Self-healing disabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async forceHealing(req, res) {
        try {
            const { issueType, component } = req.body;
            if (!issueType || !component) {
                res.status(400).json({
                    success: false,
                    error: 'issueType and component are required'
                });
                return;
            }
            const result = await SelfHealingService_1.selfHealingService.forceHealing(issueType, component);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Deployment Monitoring Service endpoints
    async getDeploymentMonitoringStatus(req, res) {
        try {
            const status = await DeploymentMonitoringService_1.deploymentMonitoringService.getStatus();
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getActiveDeployments(req, res) {
        try {
            const deployments = await DeploymentMonitoringService_1.deploymentMonitoringService.getActiveDeployments();
            res.json({
                success: true,
                data: deployments
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getDeploymentHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const history = await DeploymentMonitoringService_1.deploymentMonitoringService.getDeploymentHistory(limit);
            res.json({
                success: true,
                data: history
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getDeployment(req, res) {
        try {
            const { deploymentId } = req.params;
            const deployment = await DeploymentMonitoringService_1.deploymentMonitoringService.getDeployment(deploymentId);
            if (!deployment) {
                res.status(404).json({
                    success: false,
                    error: 'Deployment not found'
                });
                return;
            }
            res.json({
                success: true,
                data: deployment
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async trackDeployment(req, res) {
        try {
            const deploymentInfo = req.body;
            const deployment = await DeploymentMonitoringService_1.deploymentMonitoringService.trackDeployment(deploymentInfo);
            res.json({
                success: true,
                data: deployment
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async rollbackDeployment(req, res) {
        try {
            const { target } = req.params;
            const { reason, preserveData } = req.body;
            const result = await DeploymentMonitoringService_1.deploymentMonitoringService.rollbackDeployment(target, {
                reason,
                preserveData: preserveData !== false
            });
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async enableAutoRollback(req, res) {
        try {
            await DeploymentMonitoringService_1.deploymentMonitoringService.enableAutoRollback();
            res.json({
                success: true,
                message: 'Auto-rollback enabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async disableAutoRollback(req, res) {
        try {
            await DeploymentMonitoringService_1.deploymentMonitoringService.disableAutoRollback();
            res.json({
                success: true,
                message: 'Auto-rollback disabled'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Combined system overview
    async getSystemOverview(req, res) {
        try {
            const [autoRecoveryStatus, circuitBreakerStatus, gracefulDegradationStatus, incidentEscalationStatus, selfHealingStatus, deploymentMonitoringStatus] = await Promise.all([
                AutoRecoveryService_1.autoRecoveryService.getStatus(),
                CircuitBreakerService_1.circuitBreakerService.getStatus(),
                GracefulDegradationService_1.gracefulDegradationService.getStatus(),
                IncidentEscalationService_1.incidentEscalationService.getStatus(),
                SelfHealingService_1.selfHealingService.getStatus(),
                DeploymentMonitoringService_1.deploymentMonitoringService.getStatus()
            ]);
            const overview = {
                timestamp: new Date().toISOString(),
                autoRecovery: autoRecoveryStatus,
                circuitBreaker: circuitBreakerStatus,
                gracefulDegradation: gracefulDegradationStatus,
                incidentEscalation: incidentEscalationStatus,
                selfHealing: selfHealingStatus,
                deploymentMonitoring: deploymentMonitoringStatus,
                overallHealth: this.calculateOverallHealth([
                    autoRecoveryStatus.status,
                    circuitBreakerStatus.status,
                    gracefulDegradationStatus.status,
                    incidentEscalationStatus.status,
                    selfHealingStatus.status,
                    deploymentMonitoringStatus.status
                ])
            };
            res.json({
                success: true,
                data: overview
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    calculateOverallHealth(statuses) {
        const unhealthyCount = statuses.filter((s) => s === 'unhealthy').length;
        const degradedCount = statuses.filter((s) => s === 'degraded').length;
        if (unhealthyCount > 0) {
            return {
                status: 'unhealthy',
                description: `${unhealthyCount} subsystem(s) unhealthy, ${degradedCount} degraded`
            };
        }
        else if (degradedCount > 0) {
            return {
                status: 'degraded',
                description: `${degradedCount} subsystem(s) degraded`
            };
        }
        else {
            return {
                status: 'healthy',
                description: 'All auto-recovery subsystems operational'
            };
        }
    }
}
exports.AutoRecoveryController = AutoRecoveryController;
exports.autoRecoveryController = new AutoRecoveryController();
//# sourceMappingURL=autoRecoveryController.js.map