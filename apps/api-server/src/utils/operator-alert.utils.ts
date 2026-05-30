/**
 * Operator Alert Computation Helper
 *
 * WO-GLYCOPHARM-GLUCOSEVIEW-OPERATOR-ALERT-SYSTEM-V1 (origin)
 * WO-O4O-GLYCOPHARM-BACKEND-CARE-ALERT-METRICS-CLEANUP-V1 (Care 잔재 제거):
 *   IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1 옵션 A 적용.
 *   Care 메트릭 4개 + 규칙 4 블록 제거. 'care' type alert 더 이상 생성 안 함.
 *   Frontend AlertItem type union 의 'care' 멤버 는 W5d-Frontend 에서 별도 정리 예정.
 *
 * Rule-based alert generation from dashboard metrics.
 * No persistent storage — alerts are computed at request time.
 *
 * Alert types (현재 활성): network | system
 * Alert levels: info | warning | critical
 */

import type { OperatorAlertItem } from '../types/operator-dashboard.types.js';

export interface OperatorAlertMetrics {
  pendingApplications: number;
  pendingApprovals?: number;  // pharmacists (GlucoseView 잔재 — I-β 별도 트랙)
  draftProducts?: number;     // GlycoPharm
}

const THRESHOLDS = {
  PENDING_APPS_INFO: 5,
  PENDING_APPROVALS_INFO: 5,
};

export function computeOperatorAlerts(metrics: OperatorAlertMetrics): OperatorAlertItem[] {
  const alerts: OperatorAlertItem[] = [];

  // WO-O4O-GLYCOPHARM-BACKEND-CARE-ALERT-METRICS-CLEANUP-V1:
  //   Care 규칙 4 블록 (Open alerts critical/warning, Adoption rate, High risk critical/warning,
  //   Weekly activity) 제거. 'care' type alert 생성 path 0 건.

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
