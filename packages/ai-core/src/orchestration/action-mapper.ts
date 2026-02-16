/**
 * Action Mapper
 *
 * Maps AI-recommended actions to Operator Engine triggers.
 * AI는 실행하지 않는다 — 이 모듈은 "추천"을 "실행 가능 항목"으로 변환할 뿐,
 * 실제 실행은 Operator Engine이 담당한다.
 */

import type { AIInsight, ActionMapping, AIServiceId } from './types.js';

/**
 * Known trigger mappings per service.
 * These map common recommendation patterns to Operator Engine trigger IDs.
 */
const TRIGGER_CATALOG: Record<AIServiceId, Record<string, { triggerId: string; requiresApproval: boolean }>> = {
  glycopharm: {
    '고위험 환자 알림': { triggerId: 'glycopharm.alert.high_risk_patient', requiresApproval: false },
    '코칭 세션 권장': { triggerId: 'glycopharm.suggest.coaching_session', requiresApproval: true },
    '재고 확인': { triggerId: 'glycopharm.check.inventory', requiresApproval: false },
    'KPI 리포트 생성': { triggerId: 'glycopharm.report.kpi', requiresApproval: false },
  },
  neture: {
    '캠페인 제안': { triggerId: 'neture.suggest.campaign', requiresApproval: true },
    '상품 재고 알림': { triggerId: 'neture.alert.low_stock', requiresApproval: false },
    '셀러 성과 리포트': { triggerId: 'neture.report.seller_performance', requiresApproval: false },
    '가격 조정 검토': { triggerId: 'neture.review.pricing', requiresApproval: true },
  },
  kpa: {
    '공지 등록 권장': { triggerId: 'kpa.suggest.notice', requiresApproval: true },
    '미승인 신청 처리': { triggerId: 'kpa.alert.pending_approvals', requiresApproval: false },
    '운영 리포트 생성': { triggerId: 'kpa.report.operations', requiresApproval: false },
    '포럼 활동 알림': { triggerId: 'kpa.alert.forum_activity', requiresApproval: false },
  },
  glucoseview: {
    '환자 모니터링 알림': { triggerId: 'glucoseview.alert.monitoring', requiresApproval: false },
    '데이터 리포트 생성': { triggerId: 'glucoseview.report.data', requiresApproval: false },
  },
  cosmetics: {
    '성분 분석 리포트': { triggerId: 'cosmetics.report.ingredients', requiresApproval: false },
    '트렌드 알림': { triggerId: 'cosmetics.alert.trend', requiresApproval: false },
  },
};

/**
 * Map AI insight recommendations to actionable trigger mappings.
 */
export function mapActions(service: AIServiceId, insight: AIInsight): ActionMapping[] {
  const catalog = TRIGGER_CATALOG[service] || {};
  const mappings: ActionMapping[] = [];

  for (let i = 0; i < insight.recommendedActions.length; i++) {
    const recommendation = insight.recommendedActions[i];
    const match = findBestMatch(recommendation, catalog);

    mappings.push({
      recommendation,
      triggerId: match?.triggerId,
      requiresApproval: match?.requiresApproval ?? true,
      priority: determinePriority(i, insight.riskLevel),
    });
  }

  return mappings;
}

/**
 * Find the best matching trigger for a recommendation string.
 * Uses simple keyword matching — can be upgraded to semantic matching later.
 */
function findBestMatch(
  recommendation: string,
  catalog: Record<string, { triggerId: string; requiresApproval: boolean }>,
): { triggerId: string; requiresApproval: boolean } | null {
  for (const [pattern, trigger] of Object.entries(catalog)) {
    if (recommendation.includes(pattern)) {
      return trigger;
    }
  }
  return null;
}

/**
 * Determine action priority based on position and risk level.
 */
function determinePriority(index: number, riskLevel?: string): 1 | 2 | 3 {
  if (riskLevel === 'high' && index === 0) return 1;
  if (riskLevel === 'high' || index === 0) return 2;
  return 3;
}
