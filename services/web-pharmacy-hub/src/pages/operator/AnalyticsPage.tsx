/**
 * AnalyticsPage — 운영 액션 분석 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/operator-core-ui/modules/operator-analytics thin wrapper.
 *   API 는 플랫폼 레벨 `/api/v1/operator/analytics/*` (서비스 prefix 없음, serviceKey 는 쿼리).
 *   action_logs 에 pharmacy-hub 실데이터가 존재한다(가입 승인·반려·법정정보 저장).
 */

import { OperatorAnalyticsPage } from '@o4o/operator-core-ui/modules/operator-analytics';
import type { OperatorAnalyticsClient } from '@o4o/operator-core-ui/modules/operator-analytics';
import { api } from '../../lib/apiClient';
import { SERVICE_KEY } from '../../config/service';

const client: OperatorAnalyticsClient = {
  getSummary: (params) => api.get('/operator/analytics/summary', { params }).then((r: { data: unknown }) => r.data),
  getActions: (params) => api.get('/operator/analytics/actions', { params }).then((r: { data: unknown }) => r.data),
  getInsight: (params) => api.get('/operator/analytics/insight', { params }).then((r: { data: unknown }) => r.data),
};

/**
 * action_logs.action_key → 한글 라벨 (pharmacy-hub 실측 키).
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
 *   저장 형식은 `{serviceKey}.operator.{action}` 인데 short key 로 등록돼 있어
 *   라벨이 한 번도 적용되지 않았다(last-segment fallback 으로 원문이 노출). full key 로 교정.
 */
const ACTION_LABELS: Record<string, string> = {
  'pharmacy-hub.operator.member_approve': '가입 승인',
  'pharmacy-hub.operator.member_reject': '가입 반려',
};

export default function AnalyticsPage() {
  return (
    <OperatorAnalyticsPage
      client={client}
      serviceKey={SERVICE_KEY}
      actionLabels={ACTION_LABELS}
      tableId="pharmacy-hub-operator-analytics-actions"
      activePeriodClass="bg-teal-700 border-teal-700"
      barClass="bg-teal-500"
    />
  );
}
