/**
 * Incident Escalation — Execution (notifications, actions, metrics)
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Extracted from IncidentEscalationService.ts
 */

import type { Repository } from 'typeorm';
import type { Alert } from '../../entities/Alert.js';
import { SystemMetrics, MetricCategory } from '../../entities/SystemMetrics.js';
import {
  EscalationLevel,
  type IncidentEscalation,
  type EscalationStep,
  type CommunicationEntry,
  type OnCallSchedule,
} from './incident.types.js';
import type {
  CreateIncidentParameters,
  ConferenceBridgeParameters,
  StatusPageParameters,
  JiraTicketParameters
} from '../../types/escalation.js';

// ── Notification functions ──────────────────────────

export async function sendEmailNotification(
  contact: OnCallSchedule['contacts'][string],
  message: string,
  level: EscalationLevel
): Promise<void> {
  const subject = `[${level.toUpperCase()}] Incident Escalation Required`;

  // Implementation would use actual email service
}

export async function sendSMSNotification(
  contact: OnCallSchedule['contacts'][string],
  message: string,
  level: EscalationLevel
): Promise<void> {
  const smsMessage = `[${level.toUpperCase()}] ${message.substring(0, 140)}...`;

  // Implementation would use SMS service like Twilio
}

export async function sendSlackNotification(
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

export async function initiatePhoneCall(
  contact: OnCallSchedule['contacts'][string],
  message: string,
  level: EscalationLevel
): Promise<void> {
  // Implementation would use voice service like Twilio
}

export async function sendNotification(
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
        await sendEmailNotification(contact, message, level);
        break;
      case 'sms':
        await sendSMSNotification(contact, message, level);
        break;
      case 'slack':
        await sendSlackNotification(contact, message, level);
        break;
      case 'phone':
        await initiatePhoneCall(contact, message, level);
        break;
    }

    entry.status = 'delivered';

  } catch (error) {
    entry.status = 'failed';
    entry.metadata!.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return entry;
}

// ── Message building ──────────────────────────

export function buildEscalationMessage(
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

// ── Team notification ──────────────────────────

export async function notifyEscalationTeam(
  alertRepo: Repository<Alert>,
  escalation: IncidentEscalation,
  step: EscalationStep,
  onCallTeam: OnCallSchedule
): Promise<void> {
  const alert = await alertRepo.findOne({ where: { id: escalation.alertId } });
  if (!alert) return;

  const message = buildEscalationMessage(escalation, alert, step);
  const communicationEntries: CommunicationEntry[] = [];

  for (const userId of onCallTeam.schedule.primary) {
    const contact = onCallTeam.contacts[userId];
    if (contact) {
      const entry = await sendNotification(contact, message, step.level, 'primary');
      communicationEntries.push(entry);
      step.notificationsSent.push(userId);
    }
  }

  if (escalation.businessImpact.severity === 'critical') {
    for (const userId of onCallTeam.schedule.secondary) {
      const contact = onCallTeam.contacts[userId];
      if (contact) {
        const entry = await sendNotification(contact, message, step.level, 'secondary');
        communicationEntries.push(entry);
        step.notificationsSent.push(userId);
      }
    }
  }

  escalation.communicationLog.push(...communicationEntries);
}

// ── Action execution stubs ──────────────────────────

export async function createExternalIncident(escalation: IncidentEscalation, parameters: CreateIncidentParameters): Promise<void> {
  // Implementation would integrate with external incident management system
}

export async function startConferenceBridge(escalation: IncidentEscalation, parameters: ConferenceBridgeParameters): Promise<void> {
  // Implementation would start a conference call/bridge
}

export async function updateStatusPage(escalation: IncidentEscalation, parameters: StatusPageParameters): Promise<void> {
  // Implementation would update public status page
}

export async function createJiraTicket(escalation: IncidentEscalation, parameters: JiraTicketParameters): Promise<void> {
  // Implementation would create JIRA ticket
}

// ── Metrics ──────────────────────────

export async function recordEscalationEvent(
  systemMetricsRepo: Repository<SystemMetrics>,
  event: 'started' | 'resolved' | 'cancelled',
  escalation: IncidentEscalation
): Promise<void> {
  await systemMetricsRepo.save(
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

export async function updateEscalationMetrics(
  systemMetricsRepo: Repository<SystemMetrics>,
  activeEscalationCount: number
): Promise<void> {
  await systemMetricsRepo.save(
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
