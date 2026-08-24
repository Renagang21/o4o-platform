/**
 * AnalyticsPage — 운영 액션 분석 (K-Cosmetics)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
 *   KPA / GlycoPharm / Neture / PharmacyHub 4 서비스가 이미 소비 중인 공통
 *   @o4o/operator-core-ui/modules/operator-analytics 를 K-Cosmetics 에도 채택한다.
 *   (K-Cosmetics 만 route·page·menu 가 모두 부재한 REQUIRED_BUT_MISSING 이었다.)
 *
 * API 신설 없음: 플랫폼 레벨 `/api/v1/operator/analytics/*` 를 그대로 소비하며
 * serviceKey 는 쿼리로만 전달한다. 데이터 격리는 injectServiceScope 가 담당한다.
 */

import { OperatorAnalyticsPage } from '@o4o/operator-core-ui/modules/operator-analytics';
import type { OperatorAnalyticsClient } from '@o4o/operator-core-ui/modules/operator-analytics';
import { api } from '@/lib/apiClient';

/** api base 가 이미 `/api/v1` 를 포함하므로 경로에 prefix 를 붙이지 않는다. */
async function getJson(path: string, params: Record<string, unknown>): Promise<any> {
  const res = await api.get(path, { params });
  return res.data;
}

const client: OperatorAnalyticsClient = {
  getSummary: (params) => getJson('/operator/analytics/summary', params),
  getActions: (params) => getJson('/operator/analytics/actions', params),
  getInsight: (params) => getJson('/operator/analytics/insight', params),
};

/**
 * action_logs.action_key → 한글 라벨.
 * 저장 형식은 `{serviceKey}.operator.{action}` 이므로 full key 로 매핑한다
 * (last-segment fallback 에 의존하면 라벨이 적용되지 않는다).
 */
const ACTION_LABELS: Record<string, string> = {
  'k-cosmetics.operator.member_approve': '가입 승인',
  'k-cosmetics.operator.member_reject': '가입 반려',
};

export default function AnalyticsPage() {
  return (
    <OperatorAnalyticsPage
      client={client}
      serviceKey="k-cosmetics"
      actionLabels={ACTION_LABELS}
      tableId="k-cosmetics-operator-analytics-actions"
      activePeriodClass="bg-pink-700 border-pink-700"
      barClass="bg-pink-500"
    />
  );
}
