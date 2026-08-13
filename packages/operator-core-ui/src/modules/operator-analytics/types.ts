/**
 * Operator Analytics Module — Types
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1 (원본 업무)
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1
 *
 * KPA(383) / Neture(322) 가 같은 `action_logs` 기반 운영 분석 화면을 각각 구현하고 있었다.
 * endpoint 3종(`/operator/analytics/{summary,actions,insight}`)이 완전히 동일하며
 * serviceKey 는 쿼리 파라미터다. 실차이는 HTTP client · serviceKey · 액션 라벨 사전뿐이다.
 */

export interface AnalyticsActionSummary {
  action_key: string;
  status: string;
  count: number;
}

export interface AnalyticsDailyCount {
  date: string;
  count: number;
}

export interface AnalyticsActionLog {
  id: string;
  service_key: string;
  user_id: string;
  action_key: string;
  status: string;
  meta: Record<string, any> | null;
  created_at: string;
}

export interface AnalyticsInsight {
  summary: string;
  warnings: string[];
  recommendations: string[];
  metrics: { approvalRate: number; rejectionRate: number; totalActions: number; avgDaily: number };
}

/**
 * 서비스별 HTTP adapter.
 * 두 서비스 모두 **플랫폼 레벨**(`/api/v1`, 서비스 prefix 없음) endpoint 를 호출하며
 * serviceKey 는 쿼리로 넘긴다 — 그 호출 방식만 서비스가 소유한다.
 */
export interface OperatorAnalyticsClient {
  getSummary(params: { serviceKey: string; days: number }): Promise<any>;
  getActions(params: { serviceKey: string; page: number; limit: number }): Promise<any>;
  getInsight(params: { serviceKey: string; days: number }): Promise<any>;
}

export interface OperatorAnalyticsPageProps {
  client: OperatorAnalyticsClient;
  serviceKey: string;
  /** action_key → 표시 라벨. 서비스별 업무 어휘이므로 주입한다. */
  actionLabels: Record<string, string>;
  /** DataTable 컬럼 설정 저장 키 (기본 'operator-analytics-actions') */
  tableId?: string;
  /** 선택된 기간 버튼 배경 (예: 'bg-blue-800 border-blue-800') */
  activePeriodClass: string;
  /** 일별 추이 막대 색 (예: 'bg-blue-500') */
  barClass: string;
}
