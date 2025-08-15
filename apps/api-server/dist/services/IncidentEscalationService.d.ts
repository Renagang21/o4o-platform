import { Alert, AlertSeverity } from '../entities/Alert';
import { EscalationActionParameters, IncidentMetadata, CommunicationMetadata, EscalationContext, NotifyTeamParameters } from '../types/escalation';
export declare enum EscalationLevel {
    L1_MONITORING = "l1_monitoring",
    L2_SUPPORT = "l2_support",
    L3_ENGINEERING = "l3_engineering",
    L4_MANAGEMENT = "l4_management",
    L5_EXECUTIVE = "l5_executive"
}
export declare enum EscalationTrigger {
    TIME_THRESHOLD = "time_threshold",
    SEVERITY_INCREASE = "severity_increase",
    MANUAL_REQUEST = "manual_request",
    AUTO_RECOVERY_FAILURE = "auto_recovery_failure",
    BUSINESS_IMPACT = "business_impact",
    CUSTOMER_COMPLAINTS = "customer_complaints"
}
export interface EscalationRule {
    id: string;
    name: string;
    description: string;
    trigger: EscalationTrigger;
    fromLevel: EscalationLevel;
    toLevel: EscalationLevel;
    conditions: {
        timeThreshold?: number;
        severityLevels?: AlertSeverity[];
        businessHours?: boolean;
        alertTypes?: string[];
        metricThresholds?: {
            [key: string]: number;
        };
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
export declare class IncidentEscalationService {
    private alertRepo;
    private systemMetricsRepo;
    private webhookService;
    private escalationRules;
    private activeEscalations;
    private onCallSchedules;
    private monitoringInterval?;
    private isEnabled;
    private businessHours;
    private timezone;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    escalateAlert(alert: Alert, context?: EscalationContext): Promise<IncidentEscalation>;
    private escalateToLevel;
    private notifyEscalationTeam;
    private sendNotification;
    private startEscalationMonitoring;
    private checkEscalationTimeouts;
    private checkUnacknowledgedAlerts;
    private evaluateEscalationRules;
    private sendEmailNotification;
    private sendSMSNotification;
    private sendSlackNotification;
    private initiatePhoneCall;
    notifyTeam(target: string, parameters: NotifyTeamParameters): Promise<{
        output: string;
    }>;
    private assessBusinessImpact;
    private extractAffectedServices;
    private isCustomerFacing;
    private determineInitialEscalationLevel;
    private getNextEscalationLevel;
    private getLevelPriority;
    private getTimeoutForLevel;
    private buildEscalationMessage;
    private getOnCallTeamForLevel;
    private getApplicableEscalationRules;
    private shouldApplyRule;
    private isBusinessHours;
    private executeEscalationActions;
    private executeEscalationAction;
    private createExternalIncident;
    private startConferenceBridge;
    private updateStatusPage;
    private createJiraTicket;
    private loadEscalationRules;
    private loadOnCallSchedules;
    private recordEscalationEvent;
    private updateEscalationMetrics;
    getStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        activeEscalations: number;
        onCallTeams: number;
        escalationRules: number;
        issues: string[];
    }>;
    getActiveEscalations(): Promise<IncidentEscalation[]>;
    resolveEscalation(escalationId: string, resolvedBy: string, notes?: string): Promise<boolean>;
    acknowledgeEscalation(escalationId: string, acknowledgedBy: string, notes?: string): Promise<boolean>;
}
export declare const incidentEscalationService: IncidentEscalationService;
//# sourceMappingURL=IncidentEscalationService.d.ts.map