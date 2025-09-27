import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Alert, AlertSeverity, AlertStatus } from '../entities/Alert';
import { SystemMetrics, MetricCategory } from '../entities/SystemMetrics';
// import { WebhookService } from './webhookService';
import * as crypto from 'crypto';
import { 
  EscalationActionParameters, 
  IncidentMetadata, 
  CommunicationMetadata, 
  EscalationContext,
  NotifyTeamParameters,
  CreateIncidentParameters,
  ConferenceBridgeParameters,
  StatusPageParameters,
  JiraTicketParameters
} from '../types/escalation';

export enum EscalationLevel {
  L1_MONITORING = 'l1_monitoring',
  L2_SUPPORT = 'l2_support',
  L3_ENGINEERING = 'l3_engineering',
  L4_MANAGEMENT = 'l4_management',
  L5_EXECUTIVE = 'l5_executive'
}

export enum EscalationTrigger {
  TIME_THRESHOLD = 'time_threshold',
  SEVERITY_INCREASE = 'severity_increase',
  MANUAL_REQUEST = 'manual_request',
  AUTO_RECOVERY_FAILURE = 'auto_recovery_failure',
  BUSINESS_IMPACT = 'business_impact',
  CUSTOMER_COMPLAINTS = 'customer_complaints'
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  trigger: EscalationTrigger;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  conditions: {
    timeThreshold?: number; // minutes
    severityLevels?: AlertSeverity[];
    businessHours?: boolean;
    alertTypes?: string[];
    metricThresholds?: { [key: string]: number };
  };
  actions: EscalationAction[];
  enabled: boolean;
}

export interface EscalationAction {
  type: 'notify_team' | 'create_incident' | 'start_conference' | 'send_sms' | 'page_oncall' | 'update_status_page' | 'create_jira_ticket';
  target: string;
  parameters: EscalationActionParameters;
  retryCount?: number;
  timeout?: number;
}

export interface IncidentEscalation {
  id: string;
  alertId: string;
  incidentId?: string;
  currentLevel: EscalationLevel;
  escalationPath: EscalationStep[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'resolved' | 'cancelled';
  assignedTo?: string;
  businessImpact: BusinessImpact;
  communicationLog: CommunicationEntry[];
  metadata?: IncidentMetadata | EscalationContext;
}

export interface EscalationStep {
  level: EscalationLevel;
  timestamp: Date;
  triggeredBy: EscalationTrigger;
  assignedTo: string[];
  notificationsSent: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  notes?: string;
}

export interface BusinessImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers?: number;
  estimatedRevenueLoss?: number;
  affectedServices: string[];
  customerFacing: boolean;
  description: string;
}

export interface CommunicationEntry {
  timestamp: Date;
  type: 'notification' | 'update' | 'escalation' | 'resolution';
  channel: string;
  recipients: string[];
  message: string;
  status: 'sent' | 'failed' | 'delivered' | 'acknowledged';
  metadata?: CommunicationMetadata;
}

export interface OnCallSchedule {
  teamId: string;
  teamName: string;
  level: EscalationLevel;
  schedule: {
    primary: string[];
    secondary: string[];
    escalation: string[];
  };
  contacts: {
    [userId: string]: {
      name: string;
      email: string;
      phone: string;
      slack?: string;
      preferredNotification: 'email' | 'sms' | 'slack' | 'phone';
    };
  };
}

export class IncidentEscalationService {
  private alertRepo: Repository<Alert>;
  private systemMetricsRepo: Repository<SystemMetrics>;
  // private webhookService: WebhookService;

  private escalationRules: Map<string, EscalationRule> = new Map();
  private activeEscalations: Map<string, IncidentEscalation> = new Map();
  private onCallSchedules: Map<string, OnCallSchedule> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  private isEnabled: boolean = true;
  private businessHours = { start: 9, end: 17 }; // 9 AM to 5 PM
  private timezone = 'Asia/Seoul';

  constructor() {
    this.alertRepo = AppDataSource.getRepository(Alert);
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    // this.webhookService = new WebhookService();
  }

  async initialize(): Promise<void> {

    await this.loadEscalationRules();
    await this.loadOnCallSchedules();
    await this.startEscalationMonitoring();

  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

  }

  // Main escalation logic
  async escalateAlert(alert: Alert, context?: EscalationContext): Promise<IncidentEscalation> {

    const businessImpact = await this.assessBusinessImpact(alert);
    const initialLevel = this.determineInitialEscalationLevel(alert, businessImpact);

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

    // Start escalation at the determined level
    await this.escalateToLevel(escalation, initialLevel, EscalationTrigger.AUTO_RECOVERY_FAILURE);

    this.activeEscalations.set(alert.id, escalation);

    // Record escalation event
    await this.recordEscalationEvent('started', escalation);

    return escalation;
  }

  private async escalateToLevel(
    escalation: IncidentEscalation,
    level: EscalationLevel,
    trigger: EscalationTrigger
  ): Promise<void> {

    const onCallTeam = await this.getOnCallTeamForLevel(level);
    if (!onCallTeam) {
      // Error log removed
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

    // Send notifications to the assigned team
    await this.notifyEscalationTeam(escalation, step, onCallTeam);

    // Execute escalation actions
    const applicableRules = this.getApplicableEscalationRules(escalation, level, trigger);
    for (const rule of applicableRules) {
      await this.executeEscalationActions(escalation, rule.actions);
    }

    escalation.escalationPath.push(step);
    escalation.currentLevel = level;

    // Update alert with escalation info
    const alert = await this.alertRepo.findOne({ where: { id: escalation.alertId } });
    if (alert) {
      alert.escalationLevel = level;
      alert.assignedTo = step.assignedTo.join(',');
      await this.alertRepo.save(alert);
    }
  }

  private async notifyEscalationTeam(
    escalation: IncidentEscalation,
    step: EscalationStep,
    onCallTeam: OnCallSchedule
  ): Promise<void> {
    const alert = await this.alertRepo.findOne({ where: { id: escalation.alertId } });
    if (!alert) return;

    const message = this.buildEscalationMessage(escalation, alert, step);
    const communicationEntries: CommunicationEntry[] = [];

    // Notify primary on-call
    for (const userId of onCallTeam.schedule.primary) {
      const contact = onCallTeam.contacts[userId];
      if (contact) {
        const entry = await this.sendNotification(contact, message, step.level, 'primary');
        communicationEntries.push(entry);
        step.notificationsSent.push(userId);
      }
    }

    // If critical, also notify secondary immediately
    if (escalation.businessImpact.severity === 'critical') {
      for (const userId of onCallTeam.schedule.secondary) {
        const contact = onCallTeam.contacts[userId];
        if (contact) {
          const entry = await this.sendNotification(contact, message, step.level, 'secondary');
          communicationEntries.push(entry);
          step.notificationsSent.push(userId);
        }
      }
    }

    escalation.communicationLog.push(...communicationEntries);
  }

  private async sendNotification(
    contact: OnCallSchedule['contacts'][string],
    message: string,
    level: EscalationLevel,
    role: 'primary' | 'secondary' | 'escalation'
  ): Promise<CommunicationEntry> {
    const entry: CommunicationEntry = {
      timestamp: new Date(),
      type: 'notification',
      channel: contact.preferredNotification,
      recipients: [contact.email],
      message,
      status: 'sent',
      metadata: { level, role, contactName: contact.name }
    };

    try {
      switch (contact.preferredNotification) {
        case 'email':
          await this.sendEmailNotification(contact, message, level);
          break;
        case 'sms':
          await this.sendSMSNotification(contact, message, level);
          break;
        case 'slack':
          await this.sendSlackNotification(contact, message, level);
          break;
        case 'phone':
          await this.initiatePhoneCall(contact, message, level);
          break;
      }
      
      entry.status = 'delivered';
      
    } catch (error) {
      entry.status = 'failed';
      entry.metadata!.error = error instanceof Error ? error.message : 'Unknown error';
      // Error log removed
    }

    return entry;
  }

  // Monitoring and automatic escalation
  private async startEscalationMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkEscalationTimeouts();
        await this.checkUnacknowledgedAlerts();
        await this.evaluateEscalationRules();
        await this.updateEscalationMetrics();
      } catch (error) {
        // Error log removed
      }
    }, 60000); // Every minute

  }

  private async checkEscalationTimeouts(): Promise<void> {
    for (const escalation of this.activeEscalations.values()) {
      const currentStep = escalation.escalationPath[escalation.escalationPath.length - 1];
      
      if (!currentStep?.acknowledged) {
        const timeoutMinutes = this.getTimeoutForLevel(escalation.currentLevel);
        const timeSinceEscalation = Date.now() - currentStep.timestamp.getTime();
        
        if (timeSinceEscalation > timeoutMinutes * 60 * 1000) {
          const nextLevel = this.getNextEscalationLevel(escalation.currentLevel);
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
        if (rule.enabled && await this.shouldApplyRule(escalation, rule)) {
          const nextLevel = rule.toLevel;
          if (this.getLevelPriority(nextLevel) > this.getLevelPriority(escalation.currentLevel)) {
            await this.escalateToLevel(escalation, nextLevel, rule.trigger);
          }
        }
      }
    }
  }

  // Communication methods
  private async sendEmailNotification(
    contact: OnCallSchedule['contacts'][string],
    message: string,
    level: EscalationLevel
  ): Promise<void> {
    const subject = `[${level.toUpperCase()}] Incident Escalation Required`;
    
    // Implementation would use actual email service
  }

  private async sendSMSNotification(
    contact: OnCallSchedule['contacts'][string],
    message: string,
    level: EscalationLevel
  ): Promise<void> {
    const smsMessage = `[${level.toUpperCase()}] ${message.substring(0, 140)}...`;
    
    // Implementation would use SMS service like Twilio
  }

  private async sendSlackNotification(
    contact: OnCallSchedule['contacts'][string],
    message: string,
    level: EscalationLevel
  ): Promise<void> {
    if (!contact.slack) return;

    const slackMessage = {
      channel: contact.slack,
      text: `🚨 *Incident Escalation - ${level.toUpperCase()}*`,
      attachments: [{
        color: level === EscalationLevel.L5_EXECUTIVE ? 'danger' : 'warning',
        text: message,
        footer: 'O4O Platform Incident Management',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    // Implementation would use Slack API
  }

  private async initiatePhoneCall(
    contact: OnCallSchedule['contacts'][string],
    message: string,
    level: EscalationLevel
  ): Promise<void> {
    // Implementation would use voice service like Twilio
  }

  // Team notification methods
  async notifyTeam(target: string, parameters: NotifyTeamParameters): Promise<{ output: string }> {

    const team = this.onCallSchedules.get(target);
    if (!team) {
      throw new Error(`Team not found: ${target}`);
    }

    const message = parameters.message || 'Manual incident notification';
    const priority = parameters.priority || 'medium';
    const level = parameters.level || EscalationLevel.L2_SUPPORT;

    let notificationCount = 0;

    // Notify team members based on priority
    const recipients = priority === 'critical' 
      ? [...team.schedule.primary, ...team.schedule.secondary]
      : team.schedule.primary;

    for (const userId of recipients) {
      const contact = team.contacts[userId];
      if (contact) {
        try {
          await this.sendNotification(contact, message, level as EscalationLevel, 'primary');
          notificationCount++;
        } catch (error) {
          // Error log removed
        }
      }
    }

    return { output: `Notified ${notificationCount} team members` };
  }

  // Business impact assessment
  private async assessBusinessImpact(alert: Alert): Promise<BusinessImpact> {
    const affectedServices = this.extractAffectedServices(alert);
    const customerFacing = this.isCustomerFacing(affectedServices);
    
    let severity: BusinessImpact['severity'] = 'low';
    let estimatedRevenueLoss = 0;
    let affectedUsers = 0;

    // Assess severity based on alert properties and affected services
    if (alert.severity === AlertSeverity.CRITICAL) {
      severity = 'critical';
      if (customerFacing) {
        estimatedRevenueLoss = 10000; // $10k per hour estimate
        affectedUsers = 1000;
      }
    } else if (alert.severity === AlertSeverity.HIGH) {
      severity = customerFacing ? 'high' : 'medium';
      if (customerFacing) {
        estimatedRevenueLoss = 2000;
        affectedUsers = 200;
      }
    }

    return {
      severity,
      affectedUsers,
      estimatedRevenueLoss,
      affectedServices,
      customerFacing,
      description: `Impact assessment for ${alert.title}: ${severity} severity affecting ${affectedServices.join(', ')}`
    };
  }

  private extractAffectedServices(alert: Alert): string[] {
    const services = [];
    
    if (alert.source) {
      services.push(alert.source);
    }
    
    if (alert.endpoint) {
      services.push(alert.endpoint);
    }
    
    // Extract from metadata if available
    if (alert.metadata?.affectedServices && Array.isArray(alert.metadata.affectedServices)) {
      services.push(...alert.metadata.affectedServices);
    }
    
    return [...new Set(services)]; // Remove duplicates
  }

  private isCustomerFacing(services: string[]): boolean {
    const customerFacingServices = [
      'api-server',
      'main-site',
      'web-app',
      'signage-service',
      'payment-processing'
    ];
    
    return services.some((service: any) => 
      customerFacingServices.some((cf: any) => service.includes(cf))
    );
  }

  // Escalation level management
  private determineInitialEscalationLevel(alert: Alert, impact: BusinessImpact): EscalationLevel {
    if (impact.severity === 'critical') {
      return EscalationLevel.L3_ENGINEERING;
    }
    
    if (impact.severity === 'high' || alert.severity === AlertSeverity.CRITICAL) {
      return EscalationLevel.L2_SUPPORT;
    }
    
    return EscalationLevel.L1_MONITORING;
  }

  private getNextEscalationLevel(currentLevel: EscalationLevel): EscalationLevel | null {
    const levels = Object.values(EscalationLevel);
    const currentIndex = levels.indexOf(currentLevel);
    
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }

  private getLevelPriority(level: EscalationLevel): number {
    const priorities = {
      [EscalationLevel.L1_MONITORING]: 1,
      [EscalationLevel.L2_SUPPORT]: 2,
      [EscalationLevel.L3_ENGINEERING]: 3,
      [EscalationLevel.L4_MANAGEMENT]: 4,
      [EscalationLevel.L5_EXECUTIVE]: 5
    };
    
    return priorities[level] || 0;
  }

  private getTimeoutForLevel(level: EscalationLevel): number {
    const timeouts = {
      [EscalationLevel.L1_MONITORING]: 15, // 15 minutes
      [EscalationLevel.L2_SUPPORT]: 30,    // 30 minutes
      [EscalationLevel.L3_ENGINEERING]: 45, // 45 minutes
      [EscalationLevel.L4_MANAGEMENT]: 60,  // 1 hour
      [EscalationLevel.L5_EXECUTIVE]: 90    // 1.5 hours
    };
    
    return timeouts[level] || 30;
  }

  // Helper methods
  private buildEscalationMessage(
    escalation: IncidentEscalation,
    alert: Alert,
    step: EscalationStep
  ): string {
    return `
🚨 INCIDENT ESCALATION - ${step.level.toUpperCase()}

Alert: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Status: ${alert.status}

Business Impact:
- Severity: ${escalation.businessImpact.severity.toUpperCase()}
- Affected Services: ${escalation.businessImpact.affectedServices.join(', ')}
- Customer Facing: ${escalation.businessImpact.customerFacing ? 'Yes' : 'No'}
${escalation.businessImpact.affectedUsers ? `- Affected Users: ${escalation.businessImpact.affectedUsers}` : ''}

Description: ${alert.message}

Escalation ID: ${escalation.id}
Escalated At: ${step.timestamp.toISOString()}
Triggered By: ${step.triggeredBy}

Please acknowledge and take appropriate action immediately.
    `.trim();
  }

  private async getOnCallTeamForLevel(level: EscalationLevel): Promise<OnCallSchedule | null> {
    for (const schedule of this.onCallSchedules.values()) {
      if (schedule.level === level) {
        return schedule;
      }
    }
    return null;
  }

  private getApplicableEscalationRules(
    escalation: IncidentEscalation,
    level: EscalationLevel,
    trigger: EscalationTrigger
  ): EscalationRule[] {
    return Array.from(this.escalationRules.values()).filter((rule: any) =>
      rule.enabled &&
      rule.fromLevel === level &&
      rule.trigger === trigger
    );
  }

  private async shouldApplyRule(escalation: IncidentEscalation, rule: EscalationRule): Promise<boolean> {
    const conditions = rule.conditions;
    
    // Check time threshold
    if (conditions.timeThreshold) {
      const currentStep = escalation.escalationPath[escalation.escalationPath.length - 1];
      const timeSinceStep = Date.now() - currentStep.timestamp.getTime();
      if (timeSinceStep < conditions.timeThreshold * 60 * 1000) {
        return false;
      }
    }
    
    // Check business hours
    if (conditions.businessHours !== undefined) {
      const isBusinessHours = this.isBusinessHours();
      if (conditions.businessHours !== isBusinessHours) {
        return false;
      }
    }
    
    // Additional condition checks can be added here
    
    return true;
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Monday to Friday, business hours
    return day >= 1 && day <= 5 && hour >= this.businessHours.start && hour < this.businessHours.end;
  }

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
        await this.createExternalIncident(escalation, action.parameters as CreateIncidentParameters);
        break;
      
      case 'start_conference':
        await this.startConferenceBridge(escalation, action.parameters);
        break;
      
      case 'update_status_page':
        await this.updateStatusPage(escalation, action.parameters as StatusPageParameters);
        break;
      
      case 'create_jira_ticket':
        await this.createJiraTicket(escalation, action.parameters as JiraTicketParameters);
        break;
      
      default:
        // Warning log removed
    }
  }

  private async createExternalIncident(escalation: IncidentEscalation, parameters: CreateIncidentParameters): Promise<void> {
    // Implementation would integrate with external incident management system
  }

  private async startConferenceBridge(escalation: IncidentEscalation, parameters: ConferenceBridgeParameters): Promise<void> {
    // Implementation would start a conference call/bridge
  }

  private async updateStatusPage(escalation: IncidentEscalation, parameters: StatusPageParameters): Promise<void> {
    // Implementation would update public status page
  }

  private async createJiraTicket(escalation: IncidentEscalation, parameters: JiraTicketParameters): Promise<void> {
    // Implementation would create JIRA ticket
  }

  // Data loading and management
  private async loadEscalationRules(): Promise<void> {
    const rules: EscalationRule[] = [
      {
        id: 'time-based-l1-to-l2',
        name: 'L1 to L2 Time Escalation',
        description: 'Escalate to L2 if L1 does not acknowledge within 15 minutes',
        trigger: EscalationTrigger.TIME_THRESHOLD,
        fromLevel: EscalationLevel.L1_MONITORING,
        toLevel: EscalationLevel.L2_SUPPORT,
        conditions: {
          timeThreshold: 15,
          businessHours: false
        },
        actions: [
          {
            type: 'notify_team',
            target: 'l2-support',
            parameters: { priority: 'high' }
          }
        ],
        enabled: true
      },
      {
        id: 'critical-direct-l3',
        name: 'Critical Alert Direct L3',
        description: 'Critical alerts go directly to L3 engineering',
        trigger: EscalationTrigger.SEVERITY_INCREASE,
        fromLevel: EscalationLevel.L2_SUPPORT,
        toLevel: EscalationLevel.L3_ENGINEERING,
        conditions: {
          severityLevels: [AlertSeverity.CRITICAL],
          timeThreshold: 5
        },
        actions: [
          {
            type: 'notify_team',
            target: 'engineering',
            parameters: { priority: 'critical' }
          },
          {
            type: 'start_conference',
            target: 'war-room',
            parameters: { autoJoin: true }
          }
        ],
        enabled: true
      }
    ];

    rules.forEach((rule: any) => {
      this.escalationRules.set(rule.id, rule);
    });

  }

  private async loadOnCallSchedules(): Promise<void> {
    const schedules: OnCallSchedule[] = [
      {
        teamId: 'l1-monitoring',
        teamName: 'L1 Monitoring Team',
        level: EscalationLevel.L1_MONITORING,
        schedule: {
          primary: ['monitor1', 'monitor2'],
          secondary: ['monitor3'],
          escalation: ['monitor-lead']
        },
        contacts: {
          monitor1: {
            name: 'Monitor User 1',
            email: 'monitor1@o4o.com',
            phone: '+82-10-1234-5678',
            preferredNotification: 'slack'
          },
          monitor2: {
            name: 'Monitor User 2',
            email: 'monitor2@o4o.com',
            phone: '+82-10-1234-5679',
            preferredNotification: 'email'
          }
        }
      },
      {
        teamId: 'l2-support',
        teamName: 'L2 Support Team',
        level: EscalationLevel.L2_SUPPORT,
        schedule: {
          primary: ['support1', 'support2'],
          secondary: ['support3', 'support4'],
          escalation: ['support-lead']
        },
        contacts: {
          support1: {
            name: 'Support Engineer 1',
            email: 'support1@o4o.com',
            phone: '+82-10-2234-5678',
            preferredNotification: 'sms'
          },
          support2: {
            name: 'Support Engineer 2',
            email: 'support2@o4o.com',
            phone: '+82-10-2234-5679',
            preferredNotification: 'phone'
          }
        }
      },
      {
        teamId: 'engineering',
        teamName: 'Engineering Team',
        level: EscalationLevel.L3_ENGINEERING,
        schedule: {
          primary: ['dev1', 'dev2'],
          secondary: ['dev3', 'devops1'],
          escalation: ['engineering-lead']
        },
        contacts: {
          dev1: {
            name: 'Senior Developer 1',
            email: 'dev1@o4o.com',
            phone: '+82-10-3234-5678',
            slack: '@dev1',
            preferredNotification: 'slack'
          },
          dev2: {
            name: 'Senior Developer 2',
            email: 'dev2@o4o.com',
            phone: '+82-10-3234-5679',
            preferredNotification: 'email'
          }
        }
      }
    ];

    schedules.forEach((schedule: any) => {
      this.onCallSchedules.set(schedule.teamId, schedule);
    });

  }

  // Metrics and monitoring
  private async recordEscalationEvent(event: 'started' | 'resolved' | 'cancelled', escalation: IncidentEscalation): Promise<void> {
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.ESCALATION_EVENT,
        `Escalation ${event}`,
        event === 'started' ? 1 : 0,
        'event',
        'incident-escalation',
        {
          escalationId: escalation.id,
          alertId: escalation.alertId,
          level: escalation.currentLevel,
          businessImpact: escalation.businessImpact.severity,
          timestamp: new Date().toISOString()
        }
      )
    );
  }

  private async updateEscalationMetrics(): Promise<void> {
    const activeEscalationCount = this.activeEscalations.size;
    
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.ACTIVE_ESCALATIONS,
        'Active Escalations',
        activeEscalationCount,
        'count',
        'incident-escalation',
        { timestamp: new Date().toISOString() }
      )
    );
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
      
      // Update the last step
      const lastStep = escalation.escalationPath[escalation.escalationPath.length - 1];
      if (lastStep) {
        lastStep.acknowledged = true;
        lastStep.acknowledgedBy = resolvedBy;
        lastStep.acknowledgedAt = new Date();
        lastStep.notes = notes;
      }
      
      this.activeEscalations.delete(escalation.alertId);
      await this.recordEscalationEvent('resolved', escalation);
      
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