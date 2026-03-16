/**
 * Operator Alert Computation Helper
 *
 * WO-GLYCOPHARM-GLUCOSEVIEW-OPERATOR-ALERT-SYSTEM-V1
 *
 * Rule-based alert generation from dashboard metrics.
 * No persistent storage — alerts are computed at request time.
 *
 * Alert types: network | commerce | care | system
 * Alert levels: info | warning | critical
 */

import type { OperatorAlertItem } from '../types/operator-dashboard.types.js';

export interface OperatorAlertMetrics {
  openCareAlerts: number;
  careAdoptionRate: number;
  highRiskPatients: number;
  weeklyCareActivity: number;
  pendingApplications: number;
  pendingApprovals?: number;  // pharmacists (GlucoseView)
  draftProducts?: number;     // GlycoPharm
}

const THRESHOLDS = {
  CARE_ALERTS_WARNING: 10,
  CARE_ALERTS_CRITICAL: 30,
  CARE_ADOPTION_LOW: 20,
  HIGH_RISK_WARNING: 5,
  HIGH_RISK_CRITICAL: 15,
  WEEKLY_CARE_INACTIVE: 0,
  PENDING_APPS_INFO: 5,
  PENDING_APPROVALS_INFO: 5,
};

export function computeOperatorAlerts(metrics: OperatorAlertMetrics): OperatorAlertItem[] {
  const alerts: OperatorAlertItem[] = [];

  // Care: Open alerts
  if (metrics.openCareAlerts >= THRESHOLDS.CARE_ALERTS_CRITICAL) {
    alerts.push({
      id: 'care-alerts-critical',
      type: 'care',
      level: 'critical',
      title: '케어 알림 급증',
      message: `미처리 케어 알림이 ${metrics.openCareAlerts}건입니다. 즉시 확인이 필요합니다.`,
    });
  } else if (metrics.openCareAlerts >= THRESHOLDS.CARE_ALERTS_WARNING) {
    alerts.push({
      id: 'care-alerts-warning',
      type: 'care',
      level: 'warning',
      title: '케어 알림 증가',
      message: `미처리 케어 알림이 ${metrics.openCareAlerts}건입니다.`,
    });
  }

  // Care: Adoption rate
  if (metrics.careAdoptionRate > 0 && metrics.careAdoptionRate < THRESHOLDS.CARE_ADOPTION_LOW) {
    alerts.push({
      id: 'care-adoption-low',
      type: 'care',
      level: 'warning',
      title: 'Care 도입률 저조',
      message: `Care 도입률이 ${metrics.careAdoptionRate}%입니다. 약국 온보딩을 검토하세요.`,
    });
  }

  // Care: High risk patients
  if (metrics.highRiskPatients >= THRESHOLDS.HIGH_RISK_CRITICAL) {
    alerts.push({
      id: 'high-risk-critical',
      type: 'care',
      level: 'critical',
      title: '고위험 환자 급증',
      message: `고위험 환자가 ${metrics.highRiskPatients}명입니다. 케어 현황을 확인하세요.`,
    });
  } else if (metrics.highRiskPatients >= THRESHOLDS.HIGH_RISK_WARNING) {
    alerts.push({
      id: 'high-risk-warning',
      type: 'care',
      level: 'warning',
      title: '고위험 환자 주의',
      message: `고위험 환자가 ${metrics.highRiskPatients}명입니다.`,
    });
  }

  // Care: Weekly activity
  if (metrics.weeklyCareActivity === THRESHOLDS.WEEKLY_CARE_INACTIVE) {
    alerts.push({
      id: 'care-activity-inactive',
      type: 'care',
      level: 'warning',
      title: '주간 Care 활동 없음',
      message: '최근 7일간 Care 코칭 활동이 없습니다.',
    });
  }

  // Network: Pending applications
  if (metrics.pendingApplications >= THRESHOLDS.PENDING_APPS_INFO) {
    alerts.push({
      id: 'pending-apps-info',
      type: 'network',
      level: 'info',
      title: '입점 신청 대기 증가',
      message: `입점 신청 ${metrics.pendingApplications}건이 대기 중입니다.`,
    });
  }

  // Network: Pending pharmacist approvals (GlucoseView)
  if (metrics.pendingApprovals != null && metrics.pendingApprovals >= THRESHOLDS.PENDING_APPROVALS_INFO) {
    alerts.push({
      id: 'pending-approvals-info',
      type: 'network',
      level: 'info',
      title: '약사 승인 대기 증가',
      message: `약사 승인 ${metrics.pendingApprovals}건이 대기 중입니다.`,
    });
  }

  // Sort: critical → warning → info
  const levelOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return alerts;
}
