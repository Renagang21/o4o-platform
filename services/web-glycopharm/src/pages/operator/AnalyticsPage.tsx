/**
 * AnalyticsPage — 운영 액션 분석 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1 (원본 로컬 구현 — 제한적 제공 안내 포함)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   KPA(공통 본체) · Neture · PharmacyHub 가 이미 쓰던
 *   @o4o/operator-core-ui/modules/operator-analytics 로 수렴.
 *   GlycoPharm 고유의 "분석 기능 준비 중" 안내는 공통 모듈의 notice 슬롯으로 보존한다.
 *
 * API 변경 없음: 플랫폼 레벨 `/api/v1/operator/analytics/*` (serviceKey 는 쿼리)
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

const ACTION_LABELS: Record<string, string> = {
  'glycopharm.operator.store_approve': '매장 승인',
  'glycopharm.operator.store_reject': '매장 거부',
  'glycopharm.operator.request_approve': '요청 승인',
  'glycopharm.operator.request_reject': '요청 거부',
};

/** 기존 로컬 화면의 안내 배너 — 문구·색을 그대로 보존한다. */
const NOTICE = (
  <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-[13px] text-amber-800">
    <span className="text-base leading-none">⚠️</span>
    <div>
      <div className="font-semibold">분석 기능 준비 중</div>
      <div className="mt-1 text-amber-700">
        현재는 기본 액션 이력만 표시되며, 세그먼트·예측·심층 분석은 후속 단계에서 제공됩니다.
      </div>
    </div>
  </div>
);

export default function AnalyticsPage() {
  return (
    <OperatorAnalyticsPage
      client={client}
      serviceKey="glycopharm"
      actionLabels={ACTION_LABELS}
      tableId="glycopharm-operator-analytics-actions"
      activePeriodClass="bg-green-700 border-green-700"
      barClass="bg-green-500"
      notice={NOTICE}
    />
  );
}
