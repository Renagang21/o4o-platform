/**
 * Incident Escalation — Type Definitions
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Extracted from IncidentEscalationService.ts
 */

import type { AlertSeverity } from '../../entities/Alert.js';
import type {
  EscalationActionParameters,
  IncidentMetadata,
  CommunicationMetadata,
  EscalationContext,
} from '../../types/escalation.js';

export type { EscalationContext };

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
    timeThreshold?: number;
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
