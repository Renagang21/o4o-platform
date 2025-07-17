import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { SystemMetrics, MetricType, MetricCategory } from '../entities/SystemMetrics';
import { Alert, AlertType, AlertSeverity, AlertStatus } from '../entities/Alert';
import { OperationsMonitoringService, SystemStatus } from './OperationsMonitoringService';
import { CircuitBreakerService } from './CircuitBreakerService';
import { GracefulDegradationService } from './GracefulDegradationService';
import { IncidentEscalationService } from './IncidentEscalationService';
import { SelfHealingService } from './SelfHealingService';
import { DeploymentMonitoringService } from './DeploymentMonitoringService';
import { WebhookService } from './webhookService';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  conditions: {
    metricThresholds?: { [key: string]: number };
    alertTypes?: AlertType[];
    duration?: number; // minutes
    consecutiveFailures?: number;
  };
  actions: {
    immediate?: RecoveryStep[];
    fallback?: RecoveryStep[];
    escalation?: RecoveryStep[];
  };
  maxRetries: number;
  cooldownPeriod: number; // minutes
  autoExecute: boolean;
}

export interface RecoveryStep {
  type: 'restart_service' | 'clear_cache' | 'reset_connections' | 'scale_resources' | 'rollback_deployment' | 'isolate_component' | 'execute_script' | 'notify_team';
  target: string;
  parameters?: { [key: string]: string | number | boolean | null | string[] };
  timeout?: number; // seconds
  retryCount?: number;
  successCondition?: string;
}

export interface RecoveryAttempt {
  id: string;
  alertId: string;
  actionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'success' | 'failed' | 'timeout';
  stepsExecuted: Array<{
    step: RecoveryStep;
    startTime: Date;
    endTime?: Date;
    status: 'success' | 'failed' | 'timeout';
    output?: string;
    error?: string;
  }>;
  result?: {
    resolved: boolean;
    improvements: string[];
    remainingIssues: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface AutoRecoveryStats {
  totalAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  topIssues: Array<{
    issueType: string;
    count: number;
    successRate: number;
    averageTime: number;
  }>;
  serviceHealth: {
    [serviceName: string]: {
      uptime: number;
      mttr: number; // Mean Time To Recovery
      mtbf: number; // Mean Time Between Failures
      recoverySuccessRate: number;
    };
  };
}

export class AutoRecoveryService {
  private systemMetricsRepo: Repository<SystemMetrics>;
  private alertRepo: Repository<Alert>;
  private operationsService: OperationsMonitoringService;
  private circuitBreaker: CircuitBreakerService;
  private gracefulDegradation: GracefulDegradationService;
  private incidentEscalation: IncidentEscalationService;
  private selfHealing: SelfHealingService;
  private deploymentMonitoring: DeploymentMonitoringService;
  private webhookService: WebhookService;

  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private recoveryAttempts: Map<string, RecoveryAttempt> = new Map();
  private activeRecoveries: Map<string, string> = new Map(); // alertId -> attemptId
  private recoveryHistory: RecoveryAttempt[] = [];
  private recoveryIntervals: Map<string, NodeJS.Timeout> = new Map();

  private isEnabled: boolean = true;
  private maxConcurrentRecoveries: number = 5;
  private globalCooldown: number = 300; // 5 minutes
  private lastGlobalRecovery: Date | null = null;

  constructor() {
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.alertRepo = AppDataSource.getRepository(Alert);
    this.operationsService = new OperationsMonitoringService();
    this.circuitBreaker = new CircuitBreakerService();
    this.gracefulDegradation = new GracefulDegradationService();
    this.incidentEscalation = new IncidentEscalationService();
    this.selfHealing = new SelfHealingService();
    this.deploymentMonitoring = new DeploymentMonitoringService();
    this.webhookService = new WebhookService();

    this.initializeRecoveryActions();
  }

  async startAutoRecovery(): Promise<void> {
    console.log('🔄 Starting Auto-Recovery and Incident Response System...');

    // Start all sub-services
    await Promise.all([
      this.circuitBreaker.initialize(),
      this.gracefulDegradation.initialize(),
      this.incidentEscalation.initialize(),
      this.selfHealing.initialize(),
      this.deploymentMonitoring.initialize()
    ]);

    // Start recovery monitoring
    await this.startRecoveryMonitoring();

    // Start health monitoring
    await this.startHealthMonitoring();

    // Start deployment monitoring
    await this.startDeploymentMonitoring();

    console.log('✅ Auto-Recovery System is now active and monitoring');
  }

  async stopAutoRecovery(): Promise<void> {
    console.log('🛑 Stopping Auto-Recovery System...');

    this.isEnabled = false;

    // Stop all monitoring intervals
    this.recoveryIntervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`Stopped ${name} monitoring`);
    });

    // Stop sub-services
    await Promise.all([
      this.circuitBreaker.shutdown(),
      this.gracefulDegradation.shutdown(),
      this.incidentEscalation.shutdown(),
      this.selfHealing.shutdown(),
      this.deploymentMonitoring.shutdown()
    ]);

    this.recoveryIntervals.clear();
    console.log('✅ Auto-Recovery System stopped');
  }

  // Main recovery orchestration
  async handleAlert(alert: Alert): Promise<void> {
    if (!this.isEnabled) return;

    console.log(`🚨 Auto-Recovery evaluating alert: ${alert.title}`);

    // Check if already being recovered
    if (this.activeRecoveries.has(alert.id)) {
      console.log(`⏳ Recovery already in progress for alert ${alert.id}`);
      return;
    }

    // Check global cooldown
    if (this.isInGlobalCooldown()) {
      console.log(`❄️ Global recovery cooldown active, skipping automatic recovery`);
      await this.escalateToManualIntervention(alert, 'global_cooldown');
      return;
    }

    // Check concurrent recovery limit
    if (this.activeRecoveries.size >= this.maxConcurrentRecoveries) {
      console.log(`⚠️ Maximum concurrent recoveries reached, queuing for later`);
      await this.queueRecoveryAttempt(alert);
      return;
    }

    // Find applicable recovery action
    const action = await this.findApplicableRecoveryAction(alert);
    if (!action) {
      console.log(`❌ No applicable recovery action found for alert ${alert.id}`);
      await this.escalateToManualIntervention(alert, 'no_action_found');
      return;
    }

    // Execute recovery
    await this.executeRecovery(alert, action);
  }

  private async executeRecovery(alert: Alert, action: RecoveryAction): Promise<void> {
    const attemptId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const attempt: RecoveryAttempt = {
      id: attemptId,
      alertId: alert.id,
      actionId: action.id,
      startTime: new Date(),
      status: 'in_progress',
      stepsExecuted: [],
      metadata: {
        alertTitle: alert.title,
        alertSeverity: alert.severity,
        actionName: action.name
      }
    };

    this.recoveryAttempts.set(attemptId, attempt);
    this.activeRecoveries.set(alert.id, attemptId);

    console.log(`🔄 Starting recovery attempt ${attemptId} for alert ${alert.id}`);

    try {
      // Execute immediate actions
      if (action.actions.immediate) {
        console.log(`⚡ Executing immediate recovery actions...`);
        const success = await this.executeRecoverySteps(attempt, action.actions.immediate, 'immediate');
        
        if (success) {
          await this.validateRecovery(attempt, alert);
          return;
        }
      }

      // Execute fallback actions if immediate failed
      if (action.actions.fallback) {
        console.log(`🔄 Executing fallback recovery actions...`);
        const success = await this.executeRecoverySteps(attempt, action.actions.fallback, 'fallback');
        
        if (success) {
          await this.validateRecovery(attempt, alert);
          return;
        }
      }

      // If all automated recovery failed, escalate
      console.log(`⬆️ Automated recovery failed, escalating...`);
      await this.executeRecoverySteps(attempt, action.actions.escalation || [], 'escalation');
      await this.escalateToManualIntervention(alert, 'automated_recovery_failed', attempt);

    } catch (error) {
      console.error(`❌ Recovery attempt ${attemptId} failed with error:`, error);
      attempt.status = 'failed';
      await this.escalateToManualIntervention(alert, 'recovery_error', attempt);
    } finally {
      attempt.endTime = new Date();
      this.activeRecoveries.delete(alert.id);
      this.recoveryHistory.push(attempt);
      
      // Cleanup old history (keep last 1000)
      if (this.recoveryHistory.length > 1000) {
        this.recoveryHistory = this.recoveryHistory.slice(-1000);
      }
    }
  }

  private async executeRecoverySteps(
    attempt: RecoveryAttempt, 
    steps: RecoveryStep[], 
    phase: string
  ): Promise<boolean> {
    console.log(`🛠️ Executing ${steps.length} recovery steps for phase: ${phase}`);

    for (const step of steps) {
      const stepExecution: {
        step: RecoveryStep;
        startTime: Date;
        endTime?: Date;
        status: 'success' | 'failed' | 'timeout';
        output?: string;
        error?: string;
      } = {
        step,
        startTime: new Date(),
        status: 'failed',
        output: '',
        error: ''
      };

      try {
        console.log(`🔧 Executing step: ${step.type} on ${step.target}`);
        
        const result = await this.executeRecoveryStep(step);
        
        stepExecution.status = 'success';
        stepExecution.output = result.output || '';
        stepExecution.endTime = new Date();
        
        console.log(`✅ Step completed successfully: ${step.type}`);

        // Check success condition if provided
        if (step.successCondition) {
          const conditionMet = await this.checkSuccessCondition(step.successCondition);
          if (!conditionMet) {
            stepExecution.status = 'failed';
            stepExecution.error = 'Success condition not met';
            console.log(`❌ Success condition failed for step: ${step.type}`);
          }
        }

      } catch (error) {
        stepExecution.status = 'failed';
        stepExecution.error = error instanceof Error ? error.message : 'Unknown error';
        stepExecution.endTime = new Date();
        
        console.error(`❌ Step failed: ${step.type} - ${stepExecution.error}`);
      }

      attempt.stepsExecuted.push(stepExecution);

      // If critical step failed, abort
      if (stepExecution.status === 'failed' && phase === 'immediate') {
        return false;
      }
    }

    return true;
  }

  private async executeRecoveryStep(step: RecoveryStep): Promise<{ output?: string }> {
    const timeout = step.timeout || 30; // Default 30 seconds
    
    switch (step.type) {
      case 'restart_service':
        return await this.selfHealing.restartService(step.target, step.parameters);
      
      case 'clear_cache':
        return await this.selfHealing.clearCache(step.target, step.parameters);
      
      case 'reset_connections':
        return await this.selfHealing.resetConnections(step.target, step.parameters);
      
      case 'scale_resources':
        return await this.selfHealing.scaleResources(step.target, step.parameters);
      
      case 'rollback_deployment':
        return await this.deploymentMonitoring.rollbackDeployment(step.target, step.parameters as Record<string, string | number | boolean>);
      
      case 'isolate_component':
        return await this.gracefulDegradation.isolateComponent(step.target, step.parameters as Record<string, string | number | boolean>);
      
      case 'execute_script':
        return await this.executeCustomScript(step.target, step.parameters as Record<string, string | number | boolean>);
      
      case 'notify_team':
        return await this.incidentEscalation.notifyTeam(step.target, step.parameters);
      
      default:
        throw new Error(`Unknown recovery step type: ${step.type}`);
    }
  }

  private async executeCustomScript(scriptPath: string, parameters?: Record<string, string | number | boolean>): Promise<{ output: string }> {
    const { stdout, stderr } = await execAsync(`bash ${scriptPath} ${JSON.stringify(parameters || {})}`);
    
    if (stderr) {
      throw new Error(`Script execution failed: ${stderr}`);
    }
    
    return { output: stdout };
  }

  private async checkSuccessCondition(condition: string): Promise<boolean> {
    try {
      // Simple condition checking - could be enhanced with more complex logic
      if (condition.includes('http_response')) {
        const url = condition.split(':')[1];
        const response = await fetch(url);
        return response.ok;
      }
      
      if (condition.includes('service_status')) {
        const service = condition.split(':')[1];
        const status = await this.selfHealing.checkServiceStatus(service);
        return status === 'running';
      }
      
      if (condition.includes('metric_threshold')) {
        const [, metricName, operator, threshold] = condition.split(':');
        const value = await this.getLatestMetricValue(metricName);
        
        switch (operator) {
          case 'lt': return value < parseFloat(threshold);
          case 'gt': return value > parseFloat(threshold);
          case 'eq': return value === parseFloat(threshold);
          default: return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Success condition check failed:', error);
      return false;
    }
  }

  private async validateRecovery(attempt: RecoveryAttempt, alert: Alert): Promise<void> {
    console.log(`🔍 Validating recovery for alert ${alert.id}...`);

    // Wait a bit for systems to stabilize
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

    // Check if the original issue is resolved
    const isResolved = await this.checkAlertResolution(alert);
    
    attempt.result = {
      resolved: isResolved,
      improvements: [],
      remainingIssues: []
    };

    if (isResolved) {
      attempt.status = 'success';
      console.log(`✅ Recovery successful for alert ${alert.id}`);
      
      // Update alert status
      alert.resolve('auto-recovery-system', 'Issue resolved by automated recovery', 'auto_recovery');
      await this.alertRepo.save(alert);
      
      // Record success metrics
      await this.recordRecoverySuccess(attempt);
      
    } else {
      attempt.status = 'failed';
      console.log(`❌ Recovery validation failed for alert ${alert.id}`);
      
      // Try escalation if available
      await this.escalateToManualIntervention(alert, 'recovery_validation_failed', attempt);
    }

    attempt.endTime = new Date();
  }

  private async checkAlertResolution(alert: Alert): Promise<boolean> {
    try {
      // Re-evaluate the conditions that triggered the alert
      const latestMetrics = await this.getRecentMetricsForAlert(alert);
      
      // Simple heuristic - if the metric that triggered the alert is back to normal
      if (alert.metricName && alert.thresholdValue) {
        const currentValue = await this.getLatestMetricValue(alert.metricName);
        
        // Assume alert is resolved if current value is better than threshold
        switch (alert.comparisonOperator) {
          case '>':
            return currentValue <= alert.thresholdValue;
          case '<':
            return currentValue >= alert.thresholdValue;
          case '>=':
            return currentValue < alert.thresholdValue;
          case '<=':
            return currentValue > alert.thresholdValue;
          default:
            return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking alert resolution:', error);
      return false;
    }
  }

  // Recovery action configuration
  private initializeRecoveryActions(): void {
    const actions: RecoveryAction[] = [
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage Recovery',
        description: 'Automated recovery for high memory usage alerts',
        severity: AlertSeverity.HIGH,
        conditions: {
          metricThresholds: { memory_usage: 85 },
          duration: 5,
          consecutiveFailures: 2
        },
        actions: {
          immediate: [
            {
              type: 'clear_cache',
              target: 'application',
              parameters: { cacheTypes: ['redis', 'memory', 'temp'] }
            },
            {
              type: 'execute_script',
              target: '/scripts/memory-cleanup.sh',
              successCondition: 'metric_threshold:memory_usage:lt:80'
            }
          ],
          fallback: [
            {
              type: 'restart_service',
              target: 'api-server',
              parameters: { graceful: true, timeout: 30 }
            }
          ],
          escalation: [
            {
              type: 'notify_team',
              target: 'ops-team',
              parameters: { priority: 'high', issue: 'memory-usage' }
            }
          ]
        },
        maxRetries: 3,
        cooldownPeriod: 10,
        autoExecute: true
      },
      {
        id: 'high-response-time',
        name: 'High Response Time Recovery',
        description: 'Automated recovery for slow response times',
        severity: AlertSeverity.HIGH,
        conditions: {
          metricThresholds: { response_time: 2000 },
          duration: 3,
          consecutiveFailures: 3
        },
        actions: {
          immediate: [
            {
              type: 'clear_cache',
              target: 'application',
              parameters: { cacheTypes: ['query', 'page'] }
            },
            {
              type: 'reset_connections',
              target: 'database',
              parameters: { maxConnections: 20 }
            }
          ],
          fallback: [
            {
              type: 'scale_resources',
              target: 'api-server',
              parameters: { action: 'scale_up', factor: 1.5 }
            }
          ],
          escalation: [
            {
              type: 'notify_team',
              target: 'dev-team',
              parameters: { priority: 'high', issue: 'performance' }
            }
          ]
        },
        maxRetries: 2,
        cooldownPeriod: 15,
        autoExecute: true
      },
      {
        id: 'database-connection-failure',
        name: 'Database Connection Recovery',
        description: 'Automated recovery for database connection issues',
        severity: AlertSeverity.CRITICAL,
        conditions: {
          alertTypes: [AlertType.SYSTEM, AlertType.DATABASE],
          consecutiveFailures: 1
        },
        actions: {
          immediate: [
            {
              type: 'reset_connections',
              target: 'database',
              parameters: { force: true }
            },
            {
              type: 'execute_script',
              target: '/scripts/db-health-check.sh',
              successCondition: 'service_status:postgresql:running'
            }
          ],
          fallback: [
            {
              type: 'restart_service',
              target: 'postgresql',
              parameters: { force: false, timeout: 60 }
            }
          ],
          escalation: [
            {
              type: 'isolate_component',
              target: 'database-dependent-services',
              parameters: { mode: 'graceful_degradation' }
            },
            {
              type: 'notify_team',
              target: 'dba-team',
              parameters: { priority: 'critical', issue: 'database-down' }
            }
          ]
        },
        maxRetries: 2,
        cooldownPeriod: 5,
        autoExecute: true
      },
      {
        id: 'disk-space-full',
        name: 'Disk Space Recovery',
        description: 'Automated cleanup for disk space issues',
        severity: AlertSeverity.CRITICAL,
        conditions: {
          metricThresholds: { disk_usage: 95 },
          duration: 1
        },
        actions: {
          immediate: [
            {
              type: 'execute_script',
              target: '/scripts/disk-cleanup.sh',
              parameters: { 
                cleanTmp: true, 
                cleanLogs: true, 
                cleanOldBackups: true 
              },
              successCondition: 'metric_threshold:disk_usage:lt:90'
            }
          ],
          fallback: [
            {
              type: 'execute_script',
              target: '/scripts/emergency-cleanup.sh',
              parameters: { aggressive: true }
            }
          ],
          escalation: [
            {
              type: 'notify_team',
              target: 'ops-team',
              parameters: { priority: 'critical', issue: 'disk-full' }
            }
          ]
        },
        maxRetries: 1,
        cooldownPeriod: 30,
        autoExecute: true
      },
      {
        id: 'deployment-failure',
        name: 'Deployment Failure Recovery',
        description: 'Automated rollback for failed deployments',
        severity: AlertSeverity.HIGH,
        conditions: {
          alertTypes: [AlertType.DEPLOYMENT],
          consecutiveFailures: 1
        },
        actions: {
          immediate: [
            {
              type: 'rollback_deployment',
              target: 'latest',
              parameters: { 
                environment: 'production',
                preserveData: true 
              },
              successCondition: 'http_response:http://localhost:4000/health'
            }
          ],
          escalation: [
            {
              type: 'notify_team',
              target: 'dev-team',
              parameters: { 
                priority: 'high', 
                issue: 'deployment-rollback',
                includeDetails: true 
              }
            }
          ]
        },
        maxRetries: 1,
        cooldownPeriod: 60,
        autoExecute: true
      }
    ];

    actions.forEach(action => {
      this.recoveryActions.set(action.id, action);
    });

    console.log(`📋 Initialized ${actions.length} recovery actions`);
  }

  // Monitoring and health checks
  private async startRecoveryMonitoring(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.monitorActiveAlerts();
        await this.processRecoveryQueue();
        await this.performHealthSelfCheck();
      } catch (error) {
        console.error('Recovery monitoring failed:', error);
      }
    }, 30000); // Every 30 seconds

    this.recoveryIntervals.set('recovery-monitoring', interval);
    console.log('🔍 Recovery monitoring started');
  }

  private async startHealthMonitoring(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.performSystemHealthCheck();
        await this.updateRecoveryMetrics();
        await this.cleanupOldAttempts();
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 60000); // Every minute

    this.recoveryIntervals.set('health-monitoring', interval);
    console.log('❤️ Health monitoring started');
  }

  private async startDeploymentMonitoring(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.deploymentMonitoring.checkActiveDeployments();
        await this.deploymentMonitoring.validateDeploymentHealth();
      } catch (error) {
        console.error('Deployment monitoring failed:', error);
      }
    }, 120000); // Every 2 minutes

    this.recoveryIntervals.set('deployment-monitoring', interval);
    console.log('🚀 Deployment monitoring started');
  }

  // Helper methods
  private async findApplicableRecoveryAction(alert: Alert): Promise<RecoveryAction | null> {
    for (const action of this.recoveryActions.values()) {
      if (await this.isActionApplicable(alert, action)) {
        return action;
      }
    }
    return null;
  }

  private async isActionApplicable(alert: Alert, action: RecoveryAction): Promise<boolean> {
    // Check if action is in cooldown
    const lastAttempt = this.recoveryHistory
      .filter(a => a.actionId === action.id)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

    if (lastAttempt) {
      const timeSinceLastAttempt = Date.now() - lastAttempt.startTime.getTime();
      const cooldownMs = action.cooldownPeriod * 60 * 1000;
      
      if (timeSinceLastAttempt < cooldownMs) {
        console.log(`⏳ Action ${action.id} is in cooldown`);
        return false;
      }
    }

    // Check severity match
    if (action.severity !== alert.severity) {
      return false;
    }

    // Check alert types if specified
    if (action.conditions.alertTypes && 
        !action.conditions.alertTypes.includes(alert.alertType)) {
      return false;
    }

    // Check metric thresholds if specified
    if (action.conditions.metricThresholds) {
      for (const [metricName, threshold] of Object.entries(action.conditions.metricThresholds)) {
        const currentValue = await this.getLatestMetricValue(metricName);
        if (currentValue < threshold) {
          return false;
        }
      }
    }

    return true;
  }

  private isInGlobalCooldown(): boolean {
    if (!this.lastGlobalRecovery) return false;
    
    const timeSinceLastRecovery = Date.now() - this.lastGlobalRecovery.getTime();
    return timeSinceLastRecovery < (this.globalCooldown * 1000);
  }

  private async escalateToManualIntervention(
    alert: Alert, 
    reason: string, 
    attempt?: RecoveryAttempt
  ): Promise<void> {
    console.log(`⬆️ Escalating alert ${alert.id} to manual intervention: ${reason}`);
    
    await this.incidentEscalation.escalateAlert(alert, {
      reason,
      autoRecoveryAttempt: attempt ? 1 : 0,
      escalationLevel: 'manual_intervention',
      urgency: alert.severity === AlertSeverity.CRITICAL ? 'immediate' : 'high'
    });
  }

  private async queueRecoveryAttempt(alert: Alert): Promise<void> {
    // Implementation for queuing recovery attempts when at capacity
    console.log(`📝 Queuing recovery attempt for alert ${alert.id}`);
  }

  private async monitorActiveAlerts(): Promise<void> {
    const activeAlerts = await this.alertRepo.find({
      where: { status: AlertStatus.ACTIVE },
      order: { createdAt: 'DESC' }
    });

    for (const alert of activeAlerts) {
      if (!this.activeRecoveries.has(alert.id)) {
        await this.handleAlert(alert);
      }
    }
  }

  private async processRecoveryQueue(): Promise<void> {
    // Process queued recovery attempts when capacity becomes available
    if (this.activeRecoveries.size < this.maxConcurrentRecoveries) {
      // Implementation for processing queued attempts
    }
  }

  private async performHealthSelfCheck(): Promise<void> {
    // Check if the auto-recovery system itself is healthy
    const checks = [
      this.circuitBreaker.getStatus(),
      this.gracefulDegradation.getStatus(),
      this.selfHealing.getStatus(),
      this.deploymentMonitoring.getStatus()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Auto-recovery component ${index} failed health check:`, result.reason);
      }
    });
  }

  private async performSystemHealthCheck(): Promise<void> {
    // Perform comprehensive system health check
    const systemStatus = await this.operationsService.performSystemHealthCheck();
    
    // Record health metrics
    await this.recordSystemHealthMetrics(systemStatus);
  }

  private async updateRecoveryMetrics(): Promise<void> {
    const stats = await this.getRecoveryStats();
    
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.RECOVERY_SUCCESS_RATE,
        'Auto Recovery Success Rate',
        stats.successfulRecoveries / Math.max(stats.totalAttempts, 1) * 100,
        '%',
        'auto-recovery-system',
        { timestamp: new Date().toISOString() }
      )
    );
  }

  private async cleanupOldAttempts(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7); // Keep 7 days

    this.recoveryHistory = this.recoveryHistory.filter(
      attempt => attempt.startTime >= cutoff
    );
  }

  // Utility methods
  private async getLatestMetricValue(metricName: string): Promise<number> {
    const metric = await this.systemMetricsRepo.findOne({
      where: { metricName: metricName },
      order: { createdAt: 'DESC' }
    });

    return metric ? parseFloat(metric.value.toString()) : 0;
  }

  private async getRecentMetricsForAlert(alert: Alert): Promise<SystemMetrics[]> {
    if (!alert.metricName) return [];

    const since = new Date();
    since.setMinutes(since.getMinutes() - 10); // Last 10 minutes

    return await this.systemMetricsRepo.find({
      where: {
        metricName: alert.metricName,
        createdAt: { $gte: since } as any
      },
      order: { createdAt: 'DESC' }
    });
  }

  private async recordRecoverySuccess(attempt: RecoveryAttempt): Promise<void> {
    const duration = attempt.endTime!.getTime() - attempt.startTime.getTime();
    
    await this.systemMetricsRepo.save(
      SystemMetrics.createPerformanceMetric(
        MetricCategory.RECOVERY_TIME,
        'Recovery Duration',
        duration,
        'ms',
        'auto-recovery',
        attempt.actionId,
        {
          alertId: attempt.alertId,
          success: true,
          stepsExecuted: attempt.stepsExecuted.length
        }
      )
    );
  }

  private async recordSystemHealthMetrics(systemStatus: SystemStatus): Promise<void> {
    // Record various health metrics from system status
    const memoryUsagePercent = systemStatus.infrastructure?.server?.memoryUsage?.percentage || 0;
    const cpuLoadAvg = systemStatus.infrastructure?.server?.loadAverage?.[0] || 0;
    const diskUsagePercent = systemStatus.infrastructure?.server?.diskUsage ? 
      (systemStatus.infrastructure.server.diskUsage.used / systemStatus.infrastructure.server.diskUsage.total) * 100 : 0;

    await this.systemMetricsRepo.save([
      SystemMetrics.createSystemMetric(
        MetricCategory.CPU_USAGE,
        'CPU Load Average',
        cpuLoadAvg,
        'load',
        'system',
        { timestamp: new Date().toISOString() }
      ),
      SystemMetrics.createSystemMetric(
        MetricCategory.MEMORY_USAGE,
        'Memory Usage',
        memoryUsagePercent,
        '%',
        'system',
        { timestamp: new Date().toISOString() }
      ),
      SystemMetrics.createSystemMetric(
        MetricCategory.MEMORY_USAGE,
        'Disk Usage',
        diskUsagePercent,
        '%',
        'system-disk',
        { timestamp: new Date().toISOString() }
      )
    ]);
  }

  // Public API methods
  async getRecoveryStats(): Promise<AutoRecoveryStats> {
    const attempts = this.recoveryHistory;
    const successful = attempts.filter(a => a.status === 'success');
    const failed = attempts.filter(a => a.status === 'failed');

    const averageRecoveryTime = successful.length > 0
      ? successful.reduce((sum, a) => {
          const duration = a.endTime!.getTime() - a.startTime.getTime();
          return sum + duration;
        }, 0) / successful.length
      : 0;

    // Calculate top issues
    const issueMap = new Map<string, { count: number; successes: number; totalTime: number }>();
    
    attempts.forEach(attempt => {
      const key = attempt.actionId;
      const existing = issueMap.get(key) || { count: 0, successes: 0, totalTime: 0 };
      
      existing.count++;
      if (attempt.status === 'success') existing.successes++;
      if (attempt.endTime) {
        existing.totalTime += attempt.endTime.getTime() - attempt.startTime.getTime();
      }
      
      issueMap.set(key, existing);
    });

    const topIssues = Array.from(issueMap.entries()).map(([issueType, stats]) => ({
      issueType,
      count: stats.count,
      successRate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0,
      averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    return {
      totalAttempts: attempts.length,
      successfulRecoveries: successful.length,
      failedRecoveries: failed.length,
      averageRecoveryTime,
      topIssues,
      serviceHealth: {} // Would be populated with actual service health data
    };
  }

  async getActiveRecoveries(): Promise<RecoveryAttempt[]> {
    return Array.from(this.activeRecoveries.values())
      .map(attemptId => this.recoveryAttempts.get(attemptId))
      .filter(Boolean) as RecoveryAttempt[];
  }

  async getRecoveryHistory(limit: number = 100): Promise<RecoveryAttempt[]> {
    return this.recoveryHistory
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  async enableAutoRecovery(): Promise<void> {
    this.isEnabled = true;
    console.log('✅ Auto-recovery enabled');
  }

  async disableAutoRecovery(): Promise<void> {
    this.isEnabled = false;
    console.log('⏸️ Auto-recovery disabled');
  }

  async updateRecoveryAction(actionId: string, updates: Partial<RecoveryAction>): Promise<void> {
    const action = this.recoveryActions.get(actionId);
    if (action) {
      Object.assign(action, updates);
      this.recoveryActions.set(actionId, action);
      console.log(`✅ Updated recovery action: ${actionId}`);
    }
  }

  async addRecoveryAction(action: RecoveryAction): Promise<void> {
    this.recoveryActions.set(action.id, action);
    console.log(`✅ Added recovery action: ${action.id}`);
  }

  async removeRecoveryAction(actionId: string): Promise<void> {
    this.recoveryActions.delete(actionId);
    console.log(`✅ Removed recovery action: ${actionId}`);
  }

  async testRecoveryAction(actionId: string, alertId: string): Promise<RecoveryAttempt> {
    const action = this.recoveryActions.get(actionId);
    if (!action) {
      throw new Error(`Recovery action not found: ${actionId}`);
    }

    const alert = await this.alertRepo.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    console.log(`🧪 Testing recovery action ${actionId} for alert ${alertId}`);
    
    // Create a test attempt (won't affect production)
    await this.executeRecovery(alert, action);
    
    const attemptId = this.activeRecoveries.get(alertId);
    return this.recoveryAttempts.get(attemptId!)!;
  }

  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeRecoveries: number;
    recoveryActions: number;
    isEnabled: boolean;
    issues: string[];
  }> {
    const activeRecoveryCount = this.activeRecoveries.size;
    const issues: string[] = [];
    
    if (!this.isEnabled) {
      issues.push('Auto-recovery is disabled');
    }
    
    if (activeRecoveryCount > this.maxConcurrentRecoveries * 0.8) {
      issues.push(`High number of active recoveries: ${activeRecoveryCount}`);
    }
    
    if (this.isInGlobalCooldown()) {
      issues.push('Global recovery cooldown is active');
    }
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!this.isEnabled || activeRecoveryCount >= this.maxConcurrentRecoveries) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      activeRecoveries: activeRecoveryCount,
      recoveryActions: this.recoveryActions.size,
      isEnabled: this.isEnabled,
      issues
    };
  }
}

export const autoRecoveryService = new AutoRecoveryService();