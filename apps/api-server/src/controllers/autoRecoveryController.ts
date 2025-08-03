import { Request, Response } from 'express';
import { autoRecoveryService } from '../services/AutoRecoveryService';
import { circuitBreakerService } from '../services/CircuitBreakerService';
import { gracefulDegradationService } from '../services/GracefulDegradationService';
import { incidentEscalationService } from '../services/IncidentEscalationService';
import { selfHealingService } from '../services/SelfHealingService';
import { deploymentMonitoringService } from '../services/DeploymentMonitoringService';

export class AutoRecoveryController {
  // Auto Recovery Service endpoints
  async getAutoRecoveryStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await autoRecoveryService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRecoveryStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await autoRecoveryService.getRecoveryStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getActiveRecoveries(req: Request, res: Response): Promise<void> {
    try {
      const recoveries = await autoRecoveryService.getActiveRecoveries();
      res.json({
        success: true,
        data: recoveries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRecoveryHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = await autoRecoveryService.getRecoveryHistory(limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async enableAutoRecovery(req: Request, res: Response): Promise<void> {
    try {
      await autoRecoveryService.enableAutoRecovery();
      res.json({
        success: true,
        message: 'Auto-recovery enabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async disableAutoRecovery(req: Request, res: Response): Promise<void> {
    try {
      await autoRecoveryService.disableAutoRecovery();
      res.json({
        success: true,
        message: 'Auto-recovery disabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testRecoveryAction(req: Request, res: Response): Promise<void> {
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

      const result = await autoRecoveryService.testRecoveryAction(actionId, alertId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Circuit Breaker Service endpoints
  async getCircuitBreakerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await circuitBreakerService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAllCircuits(req: Request, res: Response): Promise<void> {
    try {
      const circuits = circuitBreakerService.getAllCircuits();
      res.json({
        success: true,
        data: circuits
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCircuitStats(req: Request, res: Response): Promise<void> {
    try {
      const { circuitId } = req.params;
      const stats = circuitBreakerService.getCircuitStats(circuitId);
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resetCircuit(req: Request, res: Response): Promise<void> {
    try {
      const { circuitId } = req.params;
      const success = await circuitBreakerService.resetCircuit(circuitId);
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resetAllCircuits(req: Request, res: Response): Promise<void> {
    try {
      const count = await circuitBreakerService.resetAllCircuits();
      res.json({
        success: true,
        message: `Reset ${count} circuits successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async forceOpenCircuit(req: Request, res: Response): Promise<void> {
    try {
      const { circuitId } = req.params;
      const success = await circuitBreakerService.forceOpenCircuit(circuitId);
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Graceful Degradation Service endpoints
  async getGracefulDegradationStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await gracefulDegradationService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getActiveDegradations(req: Request, res: Response): Promise<void> {
    try {
      const degradations = await gracefulDegradationService.getActiveDegradations();
      res.json({
        success: true,
        data: degradations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getFeatureStates(req: Request, res: Response): Promise<void> {
    try {
      const features = await gracefulDegradationService.getFeatureStates();
      res.json({
        success: true,
        data: features
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async activateDegradation(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const success = await gracefulDegradationService.manualActivation(ruleId);
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async revertDegradation(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const success = await gracefulDegradationService.manualReversion(ruleId);
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async enableGracefulDegradation(req: Request, res: Response): Promise<void> {
    try {
      await gracefulDegradationService.enable();
      res.json({
        success: true,
        message: 'Graceful degradation enabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async disableGracefulDegradation(req: Request, res: Response): Promise<void> {
    try {
      await gracefulDegradationService.disable();
      res.json({
        success: true,
        message: 'Graceful degradation disabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Incident Escalation Service endpoints
  async getIncidentEscalationStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await incidentEscalationService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getActiveEscalations(req: Request, res: Response): Promise<void> {
    try {
      const escalations = await incidentEscalationService.getActiveEscalations();
      res.json({
        success: true,
        data: escalations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async acknowledgeEscalation(req: Request, res: Response): Promise<void> {
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

      const success = await incidentEscalationService.acknowledgeEscalation(
        escalationId, 
        acknowledgedBy, 
        notes
      );
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resolveEscalation(req: Request, res: Response): Promise<void> {
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

      const success = await incidentEscalationService.resolveEscalation(
        escalationId, 
        resolvedBy, 
        notes
      );
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Self Healing Service endpoints
  async getSelfHealingStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await selfHealingService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await selfHealingService.getSystemHealth();
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getHealingHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await selfHealingService.getHealingHistory(limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getActiveHealingAttempts(req: Request, res: Response): Promise<void> {
    try {
      const attempts = await selfHealingService.getActiveAttempts();
      res.json({
        success: true,
        data: attempts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async enableSelfHealing(req: Request, res: Response): Promise<void> {
    try {
      await selfHealingService.enable();
      res.json({
        success: true,
        message: 'Self-healing enabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async disableSelfHealing(req: Request, res: Response): Promise<void> {
    try {
      await selfHealingService.disable();
      res.json({
        success: true,
        message: 'Self-healing disabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async forceHealing(req: Request, res: Response): Promise<void> {
    try {
      const { issueType, component } = req.body;

      if (!issueType || !component) {
        res.status(400).json({
          success: false,
          error: 'issueType and component are required'
        });
        return;
      }

      const result = await selfHealingService.forceHealing(issueType, component);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Deployment Monitoring Service endpoints
  async getDeploymentMonitoringStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await deploymentMonitoringService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getActiveDeployments(req: Request, res: Response): Promise<void> {
    try {
      const deployments = await deploymentMonitoringService.getActiveDeployments();
      res.json({
        success: true,
        data: deployments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDeploymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await deploymentMonitoringService.getDeploymentHistory(limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDeployment(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId } = req.params;
      const deployment = await deploymentMonitoringService.getDeployment(deploymentId);
      
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async trackDeployment(req: Request, res: Response): Promise<void> {
    try {
      const deploymentInfo = req.body;
      const deployment = await deploymentMonitoringService.trackDeployment(deploymentInfo);
      res.json({
        success: true,
        data: deployment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async rollbackDeployment(req: Request, res: Response): Promise<void> {
    try {
      const { target } = req.params;
      const { reason, preserveData } = req.body;
      
      const result = await deploymentMonitoringService.rollbackDeployment(target, {
        reason,
        preserveData: preserveData !== false
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async enableAutoRollback(req: Request, res: Response): Promise<void> {
    try {
      await deploymentMonitoringService.enableAutoRollback();
      res.json({
        success: true,
        message: 'Auto-rollback enabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async disableAutoRollback(req: Request, res: Response): Promise<void> {
    try {
      await deploymentMonitoringService.disableAutoRollback();
      res.json({
        success: true,
        message: 'Auto-rollback disabled'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Combined system overview
  async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const [
        autoRecoveryStatus,
        circuitBreakerStatus,
        gracefulDegradationStatus,
        incidentEscalationStatus,
        selfHealingStatus,
        deploymentMonitoringStatus
      ] = await Promise.all([
        autoRecoveryService.getStatus(),
        circuitBreakerService.getStatus(),
        gracefulDegradationService.getStatus(),
        incidentEscalationService.getStatus(),
        selfHealingService.getStatus(),
        deploymentMonitoringService.getStatus()
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private calculateOverallHealth(statuses: string[]): { status: string; description: string } {
    const unhealthyCount = statuses.filter((s: any) => s === 'unhealthy').length;
    const degradedCount = statuses.filter((s: any) => s === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return {
        status: 'unhealthy',
        description: `${unhealthyCount} subsystem(s) unhealthy, ${degradedCount} degraded`
      };
    } else if (degradedCount > 0) {
      return {
        status: 'degraded',
        description: `${degradedCount} subsystem(s) degraded`
      };
    } else {
      return {
        status: 'healthy',
        description: 'All auto-recovery subsystems operational'
      };
    }
  }
}

export const autoRecoveryController = new AutoRecoveryController();