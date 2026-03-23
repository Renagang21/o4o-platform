/**
 * Incident Escalation — Facade (orchestration + state management)
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Preserves original IncidentEscalationService public API.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { Alert, AlertSeverity, AlertStatus } from '../../entities/Alert.js';
import { SystemMetrics } from '../../entities/SystemMetrics.js';
import * as crypto from 'crypto';
import type { NotifyTeamParameters } from '../../types/escalation.js';
import {
  EscalationLevel,
  EscalationTrigger,
  type EscalationRule,
  type EscalationAction,
  type IncidentEscalation,
  type EscalationStep,
  type OnCallSchedule,
  type EscalationContext,
} from './incident.types.js';
import {
  assessBusinessImpact,
  determineInitialEscalationLevel,
  getNextEscalationLevel,
  getLevelPriority,
  getTimeoutForLevel,
  getOnCallTeamForLevel,
  getApplicableEscalationRules,
  shouldApplyRule,
  getDefaultEscalationRules,
  getDefaultOnCallSchedules,
} from './incident-policy.js';
import {
  notifyEscalationTeam,
  sendNotification,
  recordEscalationEvent,
  updateEscalationMetrics,
  createExternalIncident,
  startConferenceBridge,
  updateStatusPage,
  createJiraTicket,
} from './incident-execution.js';
import type {
  CreateIncidentParameters,
  ConferenceBridgeParameters,
  StatusPageParameters,
  JiraTicketParameters
} from '../../types/escalation.js';

export class IncidentEscalationService {
  private alertRepo: Repository<Alert>;
  private systemMetricsRepo: Repository<SystemMetrics>;

  private escalationRules: Map<string, EscalationRule> = new Map();
  private activeEscalations: Map<string, IncidentEscalation> = new Map();
  private onCallSchedules: Map<string, OnCallSchedule> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  private isEnabled: boolean = true;
  private businessHours = { start: 9, end: 17 };
  private timezone = 'Asia/Seoul';

  constructor() {
    this.alertRepo = AppDataSource.getRepository(Alert);
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
  }

  async initialize(): Promise<void> {
    const rules = getDefaultEscalationRules();
    rules.forEach((rule: any) => this.escalationRules.set(rule.id, rule));

    const schedules = getDefaultOnCallSchedules();
    schedules.forEach((schedule: any) => this.onCallSchedules.set(schedule.teamId, schedule));

    await this.startEscalationMonitoring();
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  // Main escalation logic
  async escalateAlert(alert: Alert, context?: EscalationContext): Promise<IncidentEscalation> {
    const businessImpact = assessBusinessImpact(alert);
    const initialLevel = determineInitialEscalationLevel(alert, businessImpact);

    const escalation: IncidentEscalation = {
      id: `escalation_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      alertId: alert.id,
      currentLevel: initialLevel,
      escalationPath: [],
      startTime: new Date(),
      status: 'active',
      businessImpact,
      communicationLog: [],
      metadata: context
    };

    await this.escalateToLevel(escalation, initialLevel, EscalationTrigger.AUTO_RECOVERY_FAILURE);
    this.activeEscalations.set(alert.id, escalation);
    await recordEscalationEvent(this.systemMetricsRepo, 'started', escalation);

    return escalation;
  }

  private async escalateToLevel(
    escalation: IncidentEscalation,
    level: EscalationLevel,
    trigger: EscalationTrigger
  ): Promise<void> {
    const onCallTeam = getOnCallTeamForLevel(this.onCallSchedules, level);
    if (!onCallTeam) {
      return;
    }

    const step: EscalationStep = {
      level,
      timestamp: new Date(),
      triggeredBy: trigger,
      assignedTo: [...onCallTeam.schedule.primary, ...onCallTeam.schedule.secondary],
      notificationsSent: [],
      acknowledged: false
    };

    await notifyEscalationTeam(this.alertRepo, escalation, step, onCallTeam);

    const applicableRules = getApplicableEscalationRules(this.escalationRules, escalation, level, trigger);
    for (const rule of applicableRules) {
      await this.executeEscalationActions(escalation, rule.actions);
    }

    escalation.escalationPath.push(step);
    escalation.currentLevel = level;

    const alert = await this.alertRepo.findOne({ where: { id: escalation.alertId } });
    if (alert) {
      alert.escalationLevel = level;
      alert.assignedTo = step.assignedTo.join(',');
      await this.alertRepo.save(alert);
    }
  }

  // Monitoring and automatic escalation
  private async startEscalationMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkEscalationTimeouts();
        await this.checkUnacknowledgedAlerts();
        await this.evaluateEscalationRules();
        await updateEscalationMetrics(this.systemMetricsRepo, this.activeEscalations.size);
      } catch (error) {
        // Error log removed
      }
    }, 60000);
  }

  private async checkEscalationTimeouts(): Promise<void> {
    for (const escalation of this.activeEscalations.values()) {
      const currentStep = escalation.escalationPath[escalation.escalationPath.length - 1];

      if (!currentStep?.acknowledged) {
        const timeoutMinutes = getTimeoutForLevel(escalation.currentLevel);
        const timeSinceEscalation = Date.now() - currentStep.timestamp.getTime();

        if (timeSinceEscalation > timeoutMinutes * 60 * 1000) {
          const nextLevel = getNextEscalationLevel(escalation.currentLevel);
          if (nextLevel) {
            await this.escalateToLevel(escalation, nextLevel, EscalationTrigger.TIME_THRESHOLD);
          }
        }
      }
    }
  }

  private async checkUnacknowledgedAlerts(): Promise<void> {
    const unacknowledgedAlerts = await this.alertRepo.find({
      where: [
        {
          status: AlertStatus.ACTIVE,
          acknowledgedAt: undefined,
          severity: AlertSeverity.HIGH
        },
        {
          status: AlertStatus.ACTIVE,
          acknowledgedAt: undefined,
          severity: AlertSeverity.CRITICAL
        }
      ]
    });

    for (const alert of unacknowledgedAlerts) {
      if (!this.activeEscalations.has(alert.id)) {
        const timeSinceCreated = Date.now() - alert.createdAt.getTime();
        const escalationThreshold = alert.severity === AlertSeverity.CRITICAL ? 5 * 60 * 1000 : 15 * 60 * 1000;

        if (timeSinceCreated > escalationThreshold) {
          await this.escalateAlert(alert, { reason: 'unacknowledged_alert' });
        }
      }
    }
  }

  private async evaluateEscalationRules(): Promise<void> {
    for (const escalation of this.activeEscalations.values()) {
      for (const rule of this.escalationRules.values()) {
        if (rule.enabled && await shouldApplyRule(escalation, rule, this.businessHours)) {
          const nextLevel = rule.toLevel;
          if (getLevelPriority(nextLevel) > getLevelPriority(escalation.currentLevel)) {
            await this.escalateToLevel(escalation, nextLevel, rule.trigger);
          }
        }
      }
    }
  }

  // Team notification
  async notifyTeam(target: string, parameters: NotifyTeamParameters): Promise<{ output: string }> {
    const team = this.onCallSchedules.get(target);
    if (!team) {
      throw new Error(`Team not found: ${target}`);
    }

    const message = parameters.message || 'Manual incident notification';
    const priority = parameters.priority || 'medium';
    const level = parameters.level || EscalationLevel.L2_SUPPORT;

    let notificationCount = 0;

    const recipients = priority === 'critical'
      ? [...team.schedule.primary, ...team.schedule.secondary]
      : team.schedule.primary;

    for (const userId of recipients) {
      const contact = team.contacts[userId];
      if (contact) {
        try {
          await sendNotification(contact, message, level as EscalationLevel, 'primary');
          notificationCount++;
        } catch (error) {
          // Error log removed
        }
      }
    }

    return { output: `Notified ${notificationCount} team members` };
  }

  // Action execution
  private async executeEscalationActions(escalation: IncidentEscalation, actions: EscalationAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeEscalationAction(escalation, action);
      } catch (error) {
        // Error log removed
      }
    }
  }

  private async executeEscalationAction(escalation: IncidentEscalation, action: EscalationAction): Promise<void> {
    switch (action.type) {
      case 'notify_team':
        await this.notifyTeam(action.target, action.parameters as NotifyTeamParameters);
        break;

      case 'create_incident':
        await createExternalIncident(escalation, action.parameters as CreateIncidentParameters);
        break;

      case 'start_conference':
        await startConferenceBridge(escalation, action.parameters as ConferenceBridgeParameters);
        break;

      case 'update_status_page':
        await updateStatusPage(escalation, action.parameters as StatusPageParameters);
        break;

      case 'create_jira_ticket':
        await createJiraTicket(escalation, action.parameters as JiraTicketParameters);
        break;

      default:
        // Warning log removed
    }
  }

  // Public API methods
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeEscalations: number;
    onCallTeams: number;
    escalationRules: number;
    issues: string[];
  }> {
    const activeEscalations = this.activeEscalations.size;
    const issues: string[] = [];

    if (activeEscalations > 5) {
      issues.push(`High number of active escalations: ${activeEscalations}`);
    }

    if (this.onCallSchedules.size === 0) {
      issues.push('No on-call schedules configured');
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (issues.length > 0) {
      status = activeEscalations > 10 ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      activeEscalations,
      onCallTeams: this.onCallSchedules.size,
      escalationRules: this.escalationRules.size,
      issues
    };
  }

  async getActiveEscalations(): Promise<IncidentEscalation[]> {
    return Array.from(this.activeEscalations.values());
  }

  async resolveEscalation(escalationId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    const escalation = Array.from(this.activeEscalations.values())
      .find((e: any) => e.id === escalationId);

    if (escalation) {
      escalation.status = 'resolved';
      escalation.endTime = new Date();

      const lastStep = escalation.escalationPath[escalation.escalationPath.length - 1];
      if (lastStep) {
        lastStep.acknowledged = true;
        lastStep.acknowledgedBy = resolvedBy;
        lastStep.acknowledgedAt = new Date();
        lastStep.notes = notes;
      }

      this.activeEscalations.delete(escalation.alertId);
      await recordEscalationEvent(this.systemMetricsRepo, 'resolved', escalation);

      return true;
    }

    return false;
  }

  async acknowledgeEscalation(escalationId: string, acknowledgedBy: string, notes?: string): Promise<boolean> {
    const escalation = Array.from(this.activeEscalations.values())
      .find((e: any) => e.id === escalationId);

    if (escalation) {
      const lastStep = escalation.escalationPath[escalation.escalationPath.length - 1];
      if (lastStep && !lastStep.acknowledged) {
        lastStep.acknowledged = true;
        lastStep.acknowledgedBy = acknowledgedBy;
        lastStep.acknowledgedAt = new Date();
        lastStep.notes = notes;

        return true;
      }
    }

    return false;
  }
}

export const incidentEscalationService = new IncidentEscalationService();
