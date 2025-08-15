"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentEscalationService = exports.IncidentEscalationService = exports.EscalationTrigger = exports.EscalationLevel = void 0;
const connection_1 = require("../database/connection");
const Alert_1 = require("../entities/Alert");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const webhookService_1 = require("./webhookService");
const crypto = __importStar(require("crypto"));
var EscalationLevel;
(function (EscalationLevel) {
    EscalationLevel["L1_MONITORING"] = "l1_monitoring";
    EscalationLevel["L2_SUPPORT"] = "l2_support";
    EscalationLevel["L3_ENGINEERING"] = "l3_engineering";
    EscalationLevel["L4_MANAGEMENT"] = "l4_management";
    EscalationLevel["L5_EXECUTIVE"] = "l5_executive";
})(EscalationLevel || (exports.EscalationLevel = EscalationLevel = {}));
var EscalationTrigger;
(function (EscalationTrigger) {
    EscalationTrigger["TIME_THRESHOLD"] = "time_threshold";
    EscalationTrigger["SEVERITY_INCREASE"] = "severity_increase";
    EscalationTrigger["MANUAL_REQUEST"] = "manual_request";
    EscalationTrigger["AUTO_RECOVERY_FAILURE"] = "auto_recovery_failure";
    EscalationTrigger["BUSINESS_IMPACT"] = "business_impact";
    EscalationTrigger["CUSTOMER_COMPLAINTS"] = "customer_complaints";
})(EscalationTrigger || (exports.EscalationTrigger = EscalationTrigger = {}));
class IncidentEscalationService {
    constructor() {
        this.escalationRules = new Map();
        this.activeEscalations = new Map();
        this.onCallSchedules = new Map();
        this.isEnabled = true;
        this.businessHours = { start: 9, end: 17 }; // 9 AM to 5 PM
        this.timezone = 'Asia/Seoul';
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.webhookService = new webhookService_1.WebhookService();
    }
    async initialize() {
        // console.log('📢 Initializing Incident Escalation Service...');
        await this.loadEscalationRules();
        await this.loadOnCallSchedules();
        await this.startEscalationMonitoring();
        // console.log('✅ Incident Escalation Service initialized');
    }
    async shutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        // console.log('📢 Incident Escalation Service shut down');
    }
    // Main escalation logic
    async escalateAlert(alert, context) {
        // console.log(`⬆️ Escalating alert: ${alert.title} (ID: ${alert.id})`);
        const businessImpact = await this.assessBusinessImpact(alert);
        const initialLevel = this.determineInitialEscalationLevel(alert, businessImpact);
        const escalation = {
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
    async escalateToLevel(escalation, level, trigger) {
        // console.log(`📊 Escalating to level: ${level} (Trigger: ${trigger})`);
        const onCallTeam = await this.getOnCallTeamForLevel(level);
        if (!onCallTeam) {
            console.error(`❌ No on-call team found for level: ${level}`);
            return;
        }
        const step = {
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
    async notifyEscalationTeam(escalation, step, onCallTeam) {
        const alert = await this.alertRepo.findOne({ where: { id: escalation.alertId } });
        if (!alert)
            return;
        const message = this.buildEscalationMessage(escalation, alert, step);
        const communicationEntries = [];
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
    async sendNotification(contact, message, level, role) {
        const entry = {
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
            // console.log(`📧 Notification sent to ${contact.name} via ${contact.preferredNotification}`);
        }
        catch (error) {
            entry.status = 'failed';
            entry.metadata.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to notify ${contact.name}:`, error);
        }
        return entry;
    }
    // Monitoring and automatic escalation
    async startEscalationMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.checkEscalationTimeouts();
                await this.checkUnacknowledgedAlerts();
                await this.evaluateEscalationRules();
                await this.updateEscalationMetrics();
            }
            catch (error) {
                console.error('Escalation monitoring failed:', error);
            }
        }, 60000); // Every minute
        // console.log('📊 Escalation monitoring started');
    }
    async checkEscalationTimeouts() {
        for (const escalation of this.activeEscalations.values()) {
            const currentStep = escalation.escalationPath[escalation.escalationPath.length - 1];
            if (!(currentStep === null || currentStep === void 0 ? void 0 : currentStep.acknowledged)) {
                const timeoutMinutes = this.getTimeoutForLevel(escalation.currentLevel);
                const timeSinceEscalation = Date.now() - currentStep.timestamp.getTime();
                if (timeSinceEscalation > timeoutMinutes * 60 * 1000) {
                    const nextLevel = this.getNextEscalationLevel(escalation.currentLevel);
                    if (nextLevel) {
                        // console.log(`⏰ Escalation timeout reached for ${escalation.id}, escalating to ${nextLevel}`);
                        await this.escalateToLevel(escalation, nextLevel, EscalationTrigger.TIME_THRESHOLD);
                    }
                }
            }
        }
    }
    async checkUnacknowledgedAlerts() {
        const unacknowledgedAlerts = await this.alertRepo.find({
            where: [
                {
                    status: Alert_1.AlertStatus.ACTIVE,
                    acknowledgedAt: undefined,
                    severity: Alert_1.AlertSeverity.HIGH
                },
                {
                    status: Alert_1.AlertStatus.ACTIVE,
                    acknowledgedAt: undefined,
                    severity: Alert_1.AlertSeverity.CRITICAL
                }
            ]
        });
        for (const alert of unacknowledgedAlerts) {
            if (!this.activeEscalations.has(alert.id)) {
                const timeSinceCreated = Date.now() - alert.createdAt.getTime();
                const escalationThreshold = alert.severity === Alert_1.AlertSeverity.CRITICAL ? 5 * 60 * 1000 : 15 * 60 * 1000;
                if (timeSinceCreated > escalationThreshold) {
                    await this.escalateAlert(alert, { reason: 'unacknowledged_alert' });
                }
            }
        }
    }
    async evaluateEscalationRules() {
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
    async sendEmailNotification(contact, message, level) {
        const subject = `[${level.toUpperCase()}] Incident Escalation Required`;
        // Implementation would use actual email service
        // console.log(`📧 Email sent to ${contact.email}: ${subject}`);
    }
    async sendSMSNotification(contact, message, level) {
        const smsMessage = `[${level.toUpperCase()}] ${message.substring(0, 140)}...`;
        // Implementation would use SMS service like Twilio
        // console.log(`📱 SMS sent to ${contact.phone}: ${smsMessage}`);
    }
    async sendSlackNotification(contact, message, level) {
        if (!contact.slack)
            return;
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
        // console.log(`💬 Slack message sent to ${contact.slack}`);
    }
    async initiatePhoneCall(contact, message, level) {
        // Implementation would use voice service like Twilio
        // console.log(`📞 Phone call initiated to ${contact.phone} for ${level} escalation`);
    }
    // Team notification methods
    async notifyTeam(target, parameters) {
        // console.log(`📢 Notifying team: ${target}`);
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
                    await this.sendNotification(contact, message, level, 'primary');
                    notificationCount++;
                }
                catch (error) {
                    console.error(`Failed to notify ${contact.name}:`, error);
                }
            }
        }
        return { output: `Notified ${notificationCount} team members` };
    }
    // Business impact assessment
    async assessBusinessImpact(alert) {
        const affectedServices = this.extractAffectedServices(alert);
        const customerFacing = this.isCustomerFacing(affectedServices);
        let severity = 'low';
        let estimatedRevenueLoss = 0;
        let affectedUsers = 0;
        // Assess severity based on alert properties and affected services
        if (alert.severity === Alert_1.AlertSeverity.CRITICAL) {
            severity = 'critical';
            if (customerFacing) {
                estimatedRevenueLoss = 10000; // $10k per hour estimate
                affectedUsers = 1000;
            }
        }
        else if (alert.severity === Alert_1.AlertSeverity.HIGH) {
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
    extractAffectedServices(alert) {
        var _a;
        const services = [];
        if (alert.source) {
            services.push(alert.source);
        }
        if (alert.endpoint) {
            services.push(alert.endpoint);
        }
        // Extract from metadata if available
        if (((_a = alert.metadata) === null || _a === void 0 ? void 0 : _a.affectedServices) && Array.isArray(alert.metadata.affectedServices)) {
            services.push(...alert.metadata.affectedServices);
        }
        return [...new Set(services)]; // Remove duplicates
    }
    isCustomerFacing(services) {
        const customerFacingServices = [
            'api-server',
            'main-site',
            'web-app',
            'signage-service',
            'payment-processing'
        ];
        return services.some((service) => customerFacingServices.some((cf) => service.includes(cf)));
    }
    // Escalation level management
    determineInitialEscalationLevel(alert, impact) {
        if (impact.severity === 'critical') {
            return EscalationLevel.L3_ENGINEERING;
        }
        if (impact.severity === 'high' || alert.severity === Alert_1.AlertSeverity.CRITICAL) {
            return EscalationLevel.L2_SUPPORT;
        }
        return EscalationLevel.L1_MONITORING;
    }
    getNextEscalationLevel(currentLevel) {
        const levels = Object.values(EscalationLevel);
        const currentIndex = levels.indexOf(currentLevel);
        return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
    }
    getLevelPriority(level) {
        const priorities = {
            [EscalationLevel.L1_MONITORING]: 1,
            [EscalationLevel.L2_SUPPORT]: 2,
            [EscalationLevel.L3_ENGINEERING]: 3,
            [EscalationLevel.L4_MANAGEMENT]: 4,
            [EscalationLevel.L5_EXECUTIVE]: 5
        };
        return priorities[level] || 0;
    }
    getTimeoutForLevel(level) {
        const timeouts = {
            [EscalationLevel.L1_MONITORING]: 15, // 15 minutes
            [EscalationLevel.L2_SUPPORT]: 30, // 30 minutes
            [EscalationLevel.L3_ENGINEERING]: 45, // 45 minutes
            [EscalationLevel.L4_MANAGEMENT]: 60, // 1 hour
            [EscalationLevel.L5_EXECUTIVE]: 90 // 1.5 hours
        };
        return timeouts[level] || 30;
    }
    // Helper methods
    buildEscalationMessage(escalation, alert, step) {
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
    async getOnCallTeamForLevel(level) {
        for (const schedule of this.onCallSchedules.values()) {
            if (schedule.level === level) {
                return schedule;
            }
        }
        return null;
    }
    getApplicableEscalationRules(escalation, level, trigger) {
        return Array.from(this.escalationRules.values()).filter((rule) => rule.enabled &&
            rule.fromLevel === level &&
            rule.trigger === trigger);
    }
    async shouldApplyRule(escalation, rule) {
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
    isBusinessHours() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        // Monday to Friday, business hours
        return day >= 1 && day <= 5 && hour >= this.businessHours.start && hour < this.businessHours.end;
    }
    async executeEscalationActions(escalation, actions) {
        for (const action of actions) {
            try {
                await this.executeEscalationAction(escalation, action);
            }
            catch (error) {
                console.error(`Failed to execute escalation action ${action.type}:`, error);
            }
        }
    }
    async executeEscalationAction(escalation, action) {
        switch (action.type) {
            case 'notify_team':
                await this.notifyTeam(action.target, action.parameters);
                break;
            case 'create_incident':
                await this.createExternalIncident(escalation, action.parameters);
                break;
            case 'start_conference':
                await this.startConferenceBridge(escalation, action.parameters);
                break;
            case 'update_status_page':
                await this.updateStatusPage(escalation, action.parameters);
                break;
            case 'create_jira_ticket':
                await this.createJiraTicket(escalation, action.parameters);
                break;
            default:
                console.warn(`Unknown escalation action type: ${action.type}`);
        }
    }
    async createExternalIncident(escalation, parameters) {
        // Implementation would integrate with external incident management system
        // console.log(`🎫 Creating external incident for escalation ${escalation.id}`);
    }
    async startConferenceBridge(escalation, parameters) {
        // Implementation would start a conference call/bridge
        // console.log(`📞 Starting conference bridge for escalation ${escalation.id}`);
    }
    async updateStatusPage(escalation, parameters) {
        // Implementation would update public status page
        // console.log(`📊 Updating status page for escalation ${escalation.id}`);
    }
    async createJiraTicket(escalation, parameters) {
        // Implementation would create JIRA ticket
        // console.log(`🎫 Creating JIRA ticket for escalation ${escalation.id}`);
    }
    // Data loading and management
    async loadEscalationRules() {
        const rules = [
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
                    severityLevels: [Alert_1.AlertSeverity.CRITICAL],
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
        rules.forEach((rule) => {
            this.escalationRules.set(rule.id, rule);
        });
        // console.log(`📋 Loaded ${rules.length} escalation rules`);
    }
    async loadOnCallSchedules() {
        const schedules = [
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
        schedules.forEach((schedule) => {
            this.onCallSchedules.set(schedule.teamId, schedule);
        });
        // console.log(`👥 Loaded ${schedules.length} on-call schedules`);
    }
    // Metrics and monitoring
    async recordEscalationEvent(event, escalation) {
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.ESCALATION_EVENT, `Escalation ${event}`, event === 'started' ? 1 : 0, 'event', 'incident-escalation', {
            escalationId: escalation.id,
            alertId: escalation.alertId,
            level: escalation.currentLevel,
            businessImpact: escalation.businessImpact.severity,
            timestamp: new Date().toISOString()
        }));
    }
    async updateEscalationMetrics() {
        const activeEscalationCount = this.activeEscalations.size;
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.ACTIVE_ESCALATIONS, 'Active Escalations', activeEscalationCount, 'count', 'incident-escalation', { timestamp: new Date().toISOString() }));
    }
    // Public API methods
    async getStatus() {
        const activeEscalations = this.activeEscalations.size;
        const issues = [];
        if (activeEscalations > 5) {
            issues.push(`High number of active escalations: ${activeEscalations}`);
        }
        if (this.onCallSchedules.size === 0) {
            issues.push('No on-call schedules configured');
        }
        let status = 'healthy';
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
    async getActiveEscalations() {
        return Array.from(this.activeEscalations.values());
    }
    async resolveEscalation(escalationId, resolvedBy, notes) {
        const escalation = Array.from(this.activeEscalations.values())
            .find((e) => e.id === escalationId);
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
            // console.log(`✅ Escalation resolved: ${escalationId} by ${resolvedBy}`);
            return true;
        }
        return false;
    }
    async acknowledgeEscalation(escalationId, acknowledgedBy, notes) {
        const escalation = Array.from(this.activeEscalations.values())
            .find((e) => e.id === escalationId);
        if (escalation) {
            const lastStep = escalation.escalationPath[escalation.escalationPath.length - 1];
            if (lastStep && !lastStep.acknowledged) {
                lastStep.acknowledged = true;
                lastStep.acknowledgedBy = acknowledgedBy;
                lastStep.acknowledgedAt = new Date();
                lastStep.notes = notes;
                // console.log(`✅ Escalation acknowledged: ${escalationId} by ${acknowledgedBy}`);
                return true;
            }
        }
        return false;
    }
}
exports.IncidentEscalationService = IncidentEscalationService;
exports.incidentEscalationService = new IncidentEscalationService();
//# sourceMappingURL=IncidentEscalationService.js.map