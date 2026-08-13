/**
 * AnalyticsPage — 운영 액션 분석 (KPA)
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1 · WO-O4O-AI-OPERATOR-INSIGHT-V1
 * WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1 (3계층 독립 오류)
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   Neture 와 중복이던 화면 본체를 @o4o/operator-core-ui/modules/operator-analytics 로 수렴.
 *   본 KPA 구현이 공통 본체가 되었으므로 계약·계산 로직은 그대로다.
 *
 * API: 플랫폼 레벨 `/api/v1/operator/analytics/*` (서비스 prefix 없음, serviceKey 는 쿼리)
 */

import { OperatorAnalyticsPage } from '@o4o/operator-core-ui/modules/operator-analytics';
import type { OperatorAnalyticsClient } from '@o4o/operator-core-ui/modules/operator-analytics';
import { ApiClient } from '../../api/client';

/** Platform-level API client (not scoped to /kpa) */
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';
const platformApi = new ApiClient(API_BASE);

const client: OperatorAnalyticsClient = {
  getSummary: (params) => platformApi.get('/operator/analytics/summary', params) as Promise<any>,
  getActions: (params) => platformApi.get('/operator/analytics/actions', params) as Promise<any>,
  getInsight: (params) => platformApi.get('/operator/analytics/insight', params) as Promise<any>,
};

// WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1: org_join_approve/reject 라벨 제거(dead flow).
const ACTION_LABELS: Record<string, string> = {
  'kpa.operator.product_approve': '상품 승인',
  'kpa.operator.product_reject': '상품 거부',
  'kpa.operator.pharmacy_approve': '약국 승인',
  'kpa.operator.pharmacy_reject': '약국 거부',
};

export default function AnalyticsPage() {
  return (
    <OperatorAnalyticsPage
      client={client}
      serviceKey="kpa-society"
      actionLabels={ACTION_LABELS}
      tableId="operator-analytics-actions"
      activePeriodClass="bg-blue-800 border-blue-800"
      barClass="bg-blue-500"
    />
  );
}
