import { Request, Response } from 'express';
// AutoRecoveryService, SelfHealingService, DeploymentMonitoringService removed (WO-O4O-CODEBASE-CLEANUP-V1)
import { circuitBreakerService } from '../services/CircuitBreakerService.js';
import { gracefulDegradationService } from '../services/GracefulDegradationService.js';
import { incidentEscalationService } from '../services/IncidentEscalationService.js';

export class AutoRecoveryController {
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

  // Combined system overview
  async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const [
        circuitBreakerStatus,
        gracefulDegradationStatus,
        incidentEscalationStatus,
      ] = await Promise.all([
        circuitBreakerService.getStatus(),
        gracefulDegradationService.getStatus(),
        incidentEscalationService.getStatus(),
      ]);

      const overview = {
        timestamp: new Date().toISOString(),
        circuitBreaker: circuitBreakerStatus,
        gracefulDegradation: gracefulDegradationStatus,
        incidentEscalation: incidentEscalationStatus,
        overallHealth: this.calculateOverallHealth([
          circuitBreakerStatus.status,
          gracefulDegradationStatus.status,
          incidentEscalationStatus.status,
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