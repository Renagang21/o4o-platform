/**
 * AnalyticsPage — 운영 액션 분석 (Neture)
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1: action_logs 기반 운영자 액션 통계 및 이력 조회
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA 와 중복이던 화면 본체를 @o4o/operator-core-ui/modules/operator-analytics 로 수렴.
 *   endpoint(`/operator/analytics/{summary,actions,insight}`) · payload 불변.
 *   수렴으로 획득: DataTable 표준 · 3계층 독립 오류/재시도 · AI 인사이트 섹션
 *   (기존에는 액션 이력 조회 실패를 silent 로 삼켰다 — 이제 오류 + 재시도로 표면화).
 */

import { OperatorAnalyticsPage } from '@o4o/operator-core-ui/modules/operator-analytics';
import type { OperatorAnalyticsClient } from '@o4o/operator-core-ui/modules/operator-analytics';
import { api } from '../../lib/apiClient';

const client: OperatorAnalyticsClient = {
  getSummary: async (params) => (await api.get('/operator/analytics/summary', { params })).data,
  getActions: async (params) => (await api.get('/operator/analytics/actions', { params })).data,
  getInsight: async (params) => (await api.get('/operator/analytics/insight', { params })).data,
};

const ACTION_LABELS: Record<string, string> = {
  'neture.operator.registration_approve': '가입 승인',
  'neture.operator.registration_reject': '가입 거부',
  'neture.admin.supplier_approve': '공급자 승인',
  'neture.admin.supplier_reject': '공급자 거부',
  'neture.admin.supplier_deactivate': '공급자 비활성화',
  'neture.admin.product_approve': '상품 승인',
  'neture.admin.product_reject': '상품 거절',
  'neture.admin.bulk_approve': '일괄 승인',
  'neture.admin.service_approval_approve': '서비스 승인',
  'neture.admin.service_approval_reject': '서비스 거절',
  'neture.admin.service_approval_revoke': '서비스 취소',
};

export default function AnalyticsPage() {
  return (
    <OperatorAnalyticsPage
      client={client}
      serviceKey="neture"
      actionLabels={ACTION_LABELS}
      tableId="neture-operator-analytics-actions"
      activePeriodClass="bg-primary-700 border-primary-700"
      barClass="bg-primary-500"
    />
  );
}
