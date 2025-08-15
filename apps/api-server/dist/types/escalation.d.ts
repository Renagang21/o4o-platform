/**
 * Incident escalation type definitions
 */
export interface NotifyTeamParameters {
    message?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    level?: string;
    [key: string]: unknown;
}
export interface CreateIncidentParameters {
    title: string;
    description: string;
    severity: string;
    assignee?: string;
    [key: string]: unknown;
}
export interface ConferenceBridgeParameters {
    bridgeName?: string;
    autoJoin?: boolean;
    participants?: string[];
    [key: string]: unknown;
}
export interface StatusPageParameters {
    status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
    message: string;
    affectedComponents?: string[];
    [key: string]: unknown;
}
export interface JiraTicketParameters {
    project: string;
    issueType: string;
    summary: string;
    description: string;
    priority?: string;
    labels?: string[];
    [key: string]: unknown;
}
export type EscalationActionParameters = NotifyTeamParameters | CreateIncidentParameters | ConferenceBridgeParameters | StatusPageParameters | JiraTicketParameters;
export interface IncidentMetadata {
    reason?: string;
    source?: string;
    triggeredBy?: string;
    additionalInfo?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface CommunicationMetadata {
    level?: string;
    role?: string;
    contactName?: string;
    error?: string;
    deliveryDetails?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface EscalationContext {
    reason?: string;
    triggeredBy?: string;
    manualNotes?: string;
    relatedIncidents?: string[];
    additionalData?: Record<string, unknown>;
    autoRecoveryAttempt?: number;
    escalationLevel?: string;
    urgency?: string;
}
//# sourceMappingURL=escalation.d.ts.map