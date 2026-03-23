/**
 * Incident Escalation — Policy & Assessment (pure functions + config data)
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Extracted from IncidentEscalationService.ts
 */

import type { Alert } from '../../entities/Alert.js';
import { AlertSeverity } from '../../entities/Alert.js';
import {
  EscalationLevel,
  EscalationTrigger,
  type EscalationRule,
  type IncidentEscalation,
  type BusinessImpact,
  type OnCallSchedule,
} from './incident.types.js';

// ── Business impact assessment ──────────────────────────

export function assessBusinessImpact(alert: Alert): BusinessImpact {
  const affectedServices = extractAffectedServices(alert);
  const customerFacing = isCustomerFacing(affectedServices);

  let severity: BusinessImpact['severity'] = 'low';
  let estimatedRevenueLoss = 0;
  let affectedUsers = 0;

  if (alert.severity === AlertSeverity.CRITICAL) {
    severity = 'critical';
    if (customerFacing) {
      estimatedRevenueLoss = 10000;
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

export function extractAffectedServices(alert: Alert): string[] {
  const services = [];

  if (alert.source) {
    services.push(alert.source);
  }

  if (alert.endpoint) {
    services.push(alert.endpoint);
  }

  if (alert.metadata?.affectedServices && Array.isArray(alert.metadata.affectedServices)) {
    services.push(...alert.metadata.affectedServices);
  }

  return [...new Set(services)];
}

export function isCustomerFacing(services: string[]): boolean {
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

// ── Escalation level management ──────────────────────────

export function determineInitialEscalationLevel(alert: Alert, impact: BusinessImpact): EscalationLevel {
  if (impact.severity === 'critical') {
    return EscalationLevel.L3_ENGINEERING;
  }

  if (impact.severity === 'high' || alert.severity === AlertSeverity.CRITICAL) {
    return EscalationLevel.L2_SUPPORT;
  }

  return EscalationLevel.L1_MONITORING;
}

export function getNextEscalationLevel(currentLevel: EscalationLevel): EscalationLevel | null {
  const levels = Object.values(EscalationLevel);
  const currentIndex = levels.indexOf(currentLevel);

  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

export function getLevelPriority(level: EscalationLevel): number {
  const priorities = {
    [EscalationLevel.L1_MONITORING]: 1,
    [EscalationLevel.L2_SUPPORT]: 2,
    [EscalationLevel.L3_ENGINEERING]: 3,
    [EscalationLevel.L4_MANAGEMENT]: 4,
    [EscalationLevel.L5_EXECUTIVE]: 5
  };

  return priorities[level] || 0;
}

export function getTimeoutForLevel(level: EscalationLevel): number {
  const timeouts = {
    [EscalationLevel.L1_MONITORING]: 15,
    [EscalationLevel.L2_SUPPORT]: 30,
    [EscalationLevel.L3_ENGINEERING]: 45,
    [EscalationLevel.L4_MANAGEMENT]: 60,
    [EscalationLevel.L5_EXECUTIVE]: 90
  };

  return timeouts[level] || 30;
}

// ── Rule evaluation ──────────────────────────

export function getApplicableEscalationRules(
  escalationRules: Map<string, EscalationRule>,
  escalation: IncidentEscalation,
  level: EscalationLevel,
  trigger: EscalationTrigger
): EscalationRule[] {
  return Array.from(escalationRules.values()).filter((rule: any) =>
    rule.enabled &&
    rule.fromLevel === level &&
    rule.trigger === trigger
  );
}

export async function shouldApplyRule(
  escalation: IncidentEscalation,
  rule: EscalationRule,
  businessHours: { start: number; end: number }
): Promise<boolean> {
  const conditions = rule.conditions;

  if (conditions.timeThreshold) {
    const currentStep = escalation.escalationPath[escalation.escalationPath.length - 1];
    const timeSinceStep = Date.now() - currentStep.timestamp.getTime();
    if (timeSinceStep < conditions.timeThreshold * 60 * 1000) {
      return false;
    }
  }

  if (conditions.businessHours !== undefined) {
    const isBH = isBusinessHours(businessHours);
    if (conditions.businessHours !== isBH) {
      return false;
    }
  }

  return true;
}

export function isBusinessHours(businessHours: { start: number; end: number }): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  return day >= 1 && day <= 5 && hour >= businessHours.start && hour < businessHours.end;
}

export function getOnCallTeamForLevel(
  onCallSchedules: Map<string, OnCallSchedule>,
  level: EscalationLevel
): OnCallSchedule | null {
  for (const schedule of onCallSchedules.values()) {
    if (schedule.level === level) {
      return schedule;
    }
  }
  return null;
}

// ── Default config data ──────────────────────────

export function getDefaultEscalationRules(): EscalationRule[] {
  return [
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
}

export function getDefaultOnCallSchedules(): OnCallSchedule[] {
  return [
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
}
